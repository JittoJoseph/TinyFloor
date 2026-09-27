import { requireOffice } from "./access";
import { seal, unseal } from "./crypto";
import { identityOf } from "./google";
import { HttpError, json, readJson } from "./http";
import type { Router } from "./router";
import { requireAccount } from "./session";

/**
 * Meetings happen in Google Meet (docs/10-calls-and-meetings.md). An admin lets
 * us make Meet rooms as them, once, through the same Google popup as signing
 * in but asking only for Meet; we keep the refresh token, sealed. With it we
 * make the office's room and read who is in it, so the Meetings view can show
 * that without anyone opening Meet. Joining is just the link: members need no
 * permission of their own.
 *
 * The scope, meetings.space.created, reaches only spaces this app created, so
 * the grant can't read anyone's other meetings. What we keep and why is in the
 * privacy policy's "Google user data" section; keep the two in step.
 */

export const MEET_SCOPE = "https://www.googleapis.com/auth/meetings.space.created";
const MEET = "https://meet.googleapis.com/v2";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
/** Who is in a room, read from Google at most this often per office (per Cloudflare location). */
const LIVE_SECONDS = 15;
/** An access token is used while it has at least this long left. */
const TOKEN_MARGIN_MS = 60_000;

interface GrantRow {
  google_sub: string;
  google_email: string;
  refresh_token: string;
  access_token: string | null;
  access_expires_at: number | null;
}

interface RoomRow {
  space_name: string;
  meeting_uri: string;
  created_by: string | null;
  creator_name: string | null;
  /** Whether whoever made the room is still a member of the office. */
  creator_here: number;
  created_at: number;
}

export interface LivePerson {
  name: string;
  kind: "signed_in" | "guest" | "phone";
  since: string;
}

/**
 * Who is in the room, or why we can't say: the admin who made it has left the
 * office (or their account is gone), they took back their Google permission,
 * or Google didn't answer.
 */
export type Live =
  | { status: "live"; active: boolean; people: LivePerson[] }
  | { status: "creator_gone" | "creator_permission" | "unavailable" };

/** Why the person has to go through Google's popup (again) before this works. */
const needPermission = () =>
  new HttpError(409, "meet_permission_needed", "Allow TinyFloor to make Google Meet rooms for you, then try again");

export function meetRoutes(router: Router): void {
  // Whether the signed-in person has let us make Meet rooms, and as which Google account.
  router.add("GET", "/v1/me/google/meet", async ({ request, env, ctx }) => {
    const user = await requireAccount(env, request, ctx);
    return json({ google: await grantStatus(env, user.id) });
  });

  // The code from Google's popup, asked for the Meet scope: trade it and keep the grant.
  router.add("POST", "/v1/me/google/meet", async ({ request, env, ctx }) => {
    const user = await requireAccount(env, request, ctx);
    const key = tokenKey(env);
    const body = await readJson(request);
    if (typeof body.code !== "string" || !body.code || body.code.length > 2048) {
      throw new HttpError(400, "code_required", "Try allowing Google Meet again");
    }

    const tokens = await tokenRequest(env, { code: body.code, redirect_uri: "postmessage", grant_type: "authorization_code" });
    if (!tokens.id_token || !tokens.access_token) throw googleFailed();
    const google = identityOf(env, tokens.id_token);

    // Google's consent screen lets people untick a permission and still agree.
    if (!scopes(tokens.scope).includes(MEET_SCOPE)) {
      throw new HttpError(403, "meet_not_granted", "Tick the Google Meet box on Google's screen so TinyFloor can make meeting rooms");
    }

    const existing = await env.DB.prepare("SELECT google_sub, refresh_token FROM google_grants WHERE user_id = ?")
      .bind(user.id)
      .first<{ google_sub: string; refresh_token: string }>();
    // Google hands out a refresh token only the first time someone agrees. If we
    // don't have one, dropping their grant at Google makes the next popup ask afresh.
    const refresh =
      tokens.refresh_token ?? (existing && existing.google_sub === google.sub ? await open(existing.refresh_token, key) : null);
    if (!refresh) {
      await revoke(tokens.access_token);
      throw new HttpError(409, "meet_permission_reset", "Google needs you to agree once more. Allow Google Meet again");
    }
    // A different Google account replaces the old grant: let Google know we no longer hold it.
    if (existing && existing.google_sub !== google.sub) {
      ctx.waitUntil(unseal(existing.refresh_token, key).then(revoke).catch(() => {}));
    }

    const now = Date.now();
    await env.DB.prepare(
      `INSERT INTO google_grants (user_id, google_sub, google_email, scope, refresh_token, access_token, access_expires_at, granted_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
       ON CONFLICT (user_id) DO UPDATE SET
         google_sub = ?2, google_email = ?3, scope = ?4, refresh_token = ?5, access_token = ?6, access_expires_at = ?7, granted_at = ?8`,
    )
      .bind(
        user.id,
        google.sub,
        google.email,
        tokens.scope ?? MEET_SCOPE,
        await seal(refresh, key),
        await seal(tokens.access_token, key),
        now + (tokens.expires_in ?? 3600) * 1000,
        now,
      )
      .run();
    return json({ google: { granted: true, email: google.email } });
  });

  // Taking the permission back: here, and at Google, so it disappears from their Google account too.
  router.add("DELETE", "/v1/me/google/meet", async ({ request, env, ctx }) => {
    const user = await requireAccount(env, request, ctx);
    const grant = await readGrant(env, user.id);
    if (grant) {
      await env.DB.prepare("DELETE FROM google_grants WHERE user_id = ?").bind(user.id).run();
      if (env.GOOGLE_TOKEN_KEY) ctx.waitUntil(unseal(grant.refresh_token, env.GOOGLE_TOKEN_KEY).then(revoke).catch(() => {}));
      ctx.waitUntil(forgetLiveFor(env, user.id));
    }
    return json({ google: { granted: false, email: null } });
  });

  // The office's meeting room, who is in it, and the caller's own permission.
  router.add("GET", "/v1/offices/:id/meeting", async ({ request, env, ctx, params }) => {
    const user = await requireAccount(env, request, ctx);
    await requireOffice(env, params.id, user.id);
    const room = await readRoom(env, params.id);
    const live = room ? await livePeople(env, ctx, params.id, room) : null;
    return json({ room: room && roomJson(room), live, google: await grantStatus(env, user.id) });
  });

  // An admin makes the office's room in Google Meet, as themselves. With
  // `replace`, a new room takes the place of the one there is.
  router.add("POST", "/v1/offices/:id/meeting", async ({ request, env, ctx, params }) => {
    const user = await requireAccount(env, request, ctx);
    await requireOffice(env, params.id, user.id, ["admin"]);
    const body = await readJson(request);
    const existing = await readRoom(env, params.id);
    if (existing && body.replace !== true) return json({ room: roomJson(existing) });

    const token = await accessToken(env, user.id);
    const space = await createSpace(env, user.id, token);
    const now = Date.now();
    await env.DB.prepare(
      existing
        ? `INSERT INTO meeting_rooms (office_id, provider, space_name, meeting_uri, created_by, created_at)
           VALUES (?1, 'google_meet', ?2, ?3, ?4, ?5)
           ON CONFLICT (office_id) DO UPDATE SET space_name = ?2, meeting_uri = ?3, created_by = ?4, created_at = ?5`
        : // Two admins pressing at once: the first room made is the office's.
          `INSERT INTO meeting_rooms (office_id, provider, space_name, meeting_uri, created_by, created_at)
           VALUES (?1, 'google_meet', ?2, ?3, ?4, ?5) ON CONFLICT (office_id) DO NOTHING`,
    )
      .bind(params.id, space.name, space.meetingUri, user.id, now)
      .run();
    ctx.waitUntil(forgetLive(params.id));
    console.log(JSON.stringify({ event: "meeting_room_created", office: params.id, replaced: Boolean(existing) }));
    const room = await readRoom(env, params.id);
    return json({ room: room && roomJson(room) }, { status: 201 });
  });

  // An admin lets the room go. The Meet link itself keeps working for anyone who has it.
  router.add("DELETE", "/v1/offices/:id/meeting", async ({ request, env, ctx, params }) => {
    const user = await requireAccount(env, request, ctx);
    await requireOffice(env, params.id, user.id, ["admin"]);
    await env.DB.prepare("DELETE FROM meeting_rooms WHERE office_id = ?").bind(params.id).run();
    ctx.waitUntil(forgetLive(params.id));
    return json({ ok: true });
  });
}

function tokenKey(env: Env): string {
  if (!env.GOOGLE_TOKEN_KEY || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new HttpError(503, "meet_unavailable", "Google Meet isn't set up here");
  }
  return env.GOOGLE_TOKEN_KEY;
}

const googleFailed = () => new HttpError(502, "google_failed", "Google didn't go through. Try again");
const googleBusy = () => new HttpError(503, "google_busy", "Google Meet is busy. Try again in a minute");

const scopes = (scope: string | undefined) => (scope ?? "").split(" ").filter(Boolean);

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
  error?: string;
}

async function tokenRequest(env: Env, params: Record<string, string>): Promise<TokenResponse> {
  let response: Response;
  try {
    response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, ...params }),
    });
  } catch {
    throw googleBusy();
  }
  const tokens = ((await response.json().catch(() => null)) ?? {}) as TokenResponse;
  if (response.ok) return tokens;
  // A refresh token that no longer works: they took the permission back in their Google account.
  if (tokens.error === "invalid_grant" && params.grant_type === "refresh_token") throw needPermission();
  if (response.status >= 500 || response.status === 429) throw googleBusy();
  console.log(JSON.stringify({ event: "google_token_failed", status: response.status, error: tokens.error ?? null, grant: params.grant_type }));
  throw googleFailed();
}

async function revoke(token: string): Promise<void> {
  await fetch(REVOKE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
  }).catch(() => {});
}

async function readGrant(env: Env, userId: string): Promise<GrantRow | null> {
  return env.DB.prepare(
    "SELECT google_sub, google_email, refresh_token, access_token, access_expires_at FROM google_grants WHERE user_id = ?",
  )
    .bind(userId)
    .first<GrantRow>();
}

async function grantStatus(env: Env, userId: string): Promise<{ granted: boolean; email: string | null }> {
  const grant = await env.DB.prepare("SELECT google_email FROM google_grants WHERE user_id = ?")
    .bind(userId)
    .first<{ google_email: string }>();
  return { granted: Boolean(grant), email: grant?.google_email ?? null };
}

/**
 * A working access token for this person's grant: the one we have if it has a
 * minute left, or a new one from their refresh token. If Google says the grant
 * is gone, so is ours, and they're asked again.
 */
async function accessToken(env: Env, userId: string): Promise<string> {
  const key = tokenKey(env);
  const grant = await readGrant(env, userId);
  if (!grant) throw needPermission();
  if (grant.access_token && (grant.access_expires_at ?? 0) > Date.now() + TOKEN_MARGIN_MS) {
    const access = await open(grant.access_token, key);
    if (access) return access;
  }
  const refresh = await open(grant.refresh_token, key);
  if (!refresh) {
    // Sealed under a key we no longer have: nothing to do but ask again.
    await dropGrant(env, userId);
    throw needPermission();
  }

  let fresh: TokenResponse;
  try {
    fresh = await tokenRequest(env, { grant_type: "refresh_token", refresh_token: refresh });
  } catch (error) {
    if (error instanceof HttpError && error.code === "meet_permission_needed") await dropGrant(env, userId);
    throw error;
  }
  if (!fresh.access_token) throw googleFailed();
  await env.DB.prepare("UPDATE google_grants SET access_token = ?, access_expires_at = ? WHERE user_id = ?")
    .bind(await seal(fresh.access_token, key), Date.now() + (fresh.expires_in ?? 3600) * 1000, userId)
    .run();
  return fresh.access_token;
}

/** A sealed token, or null if it can't be opened (GOOGLE_TOKEN_KEY was changed since it was sealed). */
async function open(sealed: string, key: string): Promise<string | null> {
  try {
    return await unseal(sealed, key);
  } catch {
    console.log(JSON.stringify({ event: "google_token_unreadable" }));
    return null;
  }
}

async function dropGrant(env: Env, userId: string): Promise<void> {
  await env.DB.prepare("DELETE FROM google_grants WHERE user_id = ?").bind(userId).run();
}

type MeetError = { error?: { status?: string; message?: string } };

async function meet<T>(token: string, path: string, init: RequestInit = {}): Promise<{ status: number; body: T & MeetError }> {
  let response: Response;
  try {
    response = await fetch(`${MEET}/${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
  } catch {
    return { status: 503, body: {} as T & MeetError };
  }
  return { status: response.status, body: ((await response.json().catch(() => ({}))) ?? {}) as T & MeetError };
}

/**
 * A new Meet space that anyone with the link walks straight into. Access types
 * other than the default are a Workspace setting; a personal account may refuse
 * OPEN, and then gets Google's default, where the organiser admits people.
 */
async function createSpace(env: Env, userId: string, token: string): Promise<{ name: string; meetingUri: string }> {
  type Space = { name?: string; meetingUri?: string };
  let result = await meet<Space>(token, "spaces", { method: "POST", body: JSON.stringify({ config: { accessType: "OPEN" } }) });
  if (result.status === 400) result = await meet<Space>(token, "spaces", { method: "POST", body: "{}" });

  if (result.status === 401 || result.status === 403) {
    // The Meet permission was taken away, or never really given.
    await dropGrant(env, userId);
    throw needPermission();
  }
  if (result.status === 429 || result.status >= 500) throw googleBusy();
  if (result.status >= 300 || !result.body.name || !result.body.meetingUri) {
    console.log(JSON.stringify({ event: "meet_create_failed", status: result.status, error: result.body.error ?? null }));
    throw new HttpError(502, "meet_failed", "Google Meet didn't make the room. Try again");
  }
  return { name: result.body.name, meetingUri: result.body.meetingUri };
}

/** The cached answer to "who is in this office's room", shared by the isolates in one Cloudflare location. */
const liveKey = (officeId: string) => new Request(`https://meet-live.tinyfloor.internal/${encodeURIComponent(officeId)}`);

async function forgetLive(officeId: string): Promise<void> {
  await caches.default.delete(liveKey(officeId)).catch(() => false);
}

/** Someone's grant changed: every room they made needs asking again. */
async function forgetLiveFor(env: Env, userId: string): Promise<void> {
  const { results } = await env.DB.prepare("SELECT office_id FROM meeting_rooms WHERE created_by = ?").bind(userId).all<{ office_id: string }>();
  await Promise.all(results.map((row) => forgetLive(row.office_id)));
}

/**
 * Who is in the room right now, read with the grant of the admin who made it,
 * and only while they are still in the office: someone who left must not have
 * their Google account used on its behalf. Cached briefly, since every
 * member's Meetings view asks.
 */
async function livePeople(env: Env, ctx: ExecutionContext, officeId: string, room: RoomRow): Promise<Live> {
  const cached = await caches.default.match(liveKey(officeId)).catch(() => undefined);
  if (cached) return cached.json<Live>();

  let live: Live;
  if (!room.created_by || !room.creator_here) live = { status: "creator_gone" };
  else {
    try {
      live = await readLive(await accessToken(env, room.created_by), room.space_name);
    } catch (error) {
      live = { status: error instanceof HttpError && error.code === "meet_permission_needed" ? "creator_permission" : "unavailable" };
      if (live.status === "unavailable") {
        console.log(JSON.stringify({ event: "meet_live_failed", office: officeId, error: error instanceof Error ? error.message : String(error) }));
      }
    }
  }
  const response = Response.json(live, { headers: { "Cache-Control": `max-age=${LIVE_SECONDS}` } });
  ctx.waitUntil(caches.default.put(liveKey(officeId), response).catch(() => {}));
  return live;
}

async function readLive(token: string, spaceName: string): Promise<Live> {
  type Records = { conferenceRecords?: Array<{ name: string }> };
  const records = await meet<Records>(
    token,
    `conferenceRecords?${new URLSearchParams({ filter: `space.name = "${spaceName}" AND end_time IS NULL` })}`,
  );
  if (records.status === 401 || records.status === 403) throw needPermission();
  if (records.status !== 200) return { status: "unavailable" };
  const conference = records.body.conferenceRecords?.[0];
  if (!conference) return { status: "live", active: false, people: [] };

  type Participant = {
    earliestStartTime?: string;
    signedinUser?: { displayName?: string };
    anonymousUser?: { displayName?: string };
    phoneUser?: { displayName?: string };
  };
  const found = await meet<{ participants?: Participant[] }>(
    token,
    `${conference.name}/participants?${new URLSearchParams({ filter: "latest_end_time IS NULL", pageSize: "100" })}`,
  );
  if (found.status !== 200) return { status: "unavailable" };
  const people = (found.body.participants ?? []).map(
    (one): LivePerson => ({
      name: ((one.signedinUser ?? one.anonymousUser ?? one.phoneUser)?.displayName ?? "").slice(0, 80),
      kind: one.signedinUser ? "signed_in" : one.anonymousUser ? "guest" : "phone",
      since: one.earliestStartTime ?? "",
    }),
  );
  return { status: "live", active: true, people };
}

async function readRoom(env: Env, officeId: string): Promise<RoomRow | null> {
  return env.DB.prepare(
    `SELECT r.space_name, r.meeting_uri, r.created_by, u.display_name AS creator_name, r.created_at,
            EXISTS (SELECT 1 FROM memberships m WHERE m.office_id = r.office_id AND m.user_id = r.created_by) AS creator_here
     FROM meeting_rooms r LEFT JOIN users u ON u.id = r.created_by WHERE r.office_id = ?`,
  )
    .bind(officeId)
    .first<RoomRow>();
}

function roomJson(room: RoomRow) {
  return {
    provider: "google_meet" as const,
    uri: room.meeting_uri,
    createdBy: room.created_by ? { id: room.created_by, displayName: room.creator_name ?? "", here: room.creator_here === 1 } : null,
    createdAt: room.created_at,
  };
}
