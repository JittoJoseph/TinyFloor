import { HttpError, json, readJson } from "./http";
import { readClaims } from "./google";
import type { Router } from "./router";
import { requireAccount } from "./session";
import { requireOffice } from "./access";

/**
 * Someone's Google Calendar, read-only. Connected from Settings or the
 * Calendar page with Google's popup code flow, as signing in is (google.ts),
 * asking for the calendar as well; we keep the refresh token, encrypted, and
 * trade it for an access token when it's needed. Their own page reads their
 * week (titles and links are theirs alone), works out whether they're in a
 * meeting now and tells the room. Their office sees when they're busy today
 * (the team's day): busy, out of office or focusing, and an event's title
 * only if they show titles and it isn't private.
 */

export const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

/**
 * Calendar connects through its own OAuth client, in a Google Cloud project of
 * its own (TinyFloor Calendar), never sign-in's: a sensitive scope on sign-in's
 * consent screen makes Google show sign-in itself as unverified (docs/product.md).
 */
function calendarClient(env: Env): { id: string; secret: string } | null {
  return env.GOOGLE_CALENDAR_CLIENT_ID && env.GOOGLE_CALENDAR_CLIENT_SECRET ? { id: env.GOOGLE_CALENDAR_CLIENT_ID, secret: env.GOOGLE_CALENDAR_CLIENT_SECRET } : null;
}
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
/** The most of your own calendar a page can ask for at once: the week ahead, and the day you're in, wherever you are. */
const LONGEST_WINDOW_MS = 8 * 24 * 60 * 60 * 1000;
/** The team's calendars: a week at a time, as the Calendar page shows them. */
const TEAM_WINDOW_MS = 8 * 24 * 60 * 60 * 1000;
/** How long a teammate's busy times are kept before Google is asked again, and how many calendars one office's day reads. */
const BUSY_FRESH_MS = 5 * 60_000;
const TEAM_MOST = 60;
/** An access token is used until a minute before Google says it runs out. */
const EARLY_MS = 60_000;

export interface CalendarEvent {
  id: string;
  title: string;
  start: number;
  end: number;
  allDay: boolean;
  /** It holds their time (not marked free in Google). */
  busy: boolean;
  /** Marked private in Google: never shown to anyone else, titles on or not. */
  private: boolean;
  /** Where it happens online: a Meet, Zoom or Teams link, or one of ours. */
  link: string | null;
  /** A meeting or appointment, time marked out of office, or focus time (Google's own kinds). */
  kind: EventKind;
  /** The event in Google Calendar itself. */
  url: string | null;
}

export type EventKind = "event" | "out" | "focus";

/** When someone is busy, as their office sees it. */
export interface BusyBlock {
  start: number;
  end: number;
  kind: EventKind;
  /** Only where they show titles and the event isn't private. */
  title?: string;
  /** A call somewhere else online (Meet, Zoom). */
  call?: boolean;
}

interface LinkRow {
  email: string | null;
  refresh_token: string;
  access_token: string | null;
  access_until: number | null;
  show_titles: number;
}

export function calendarRoutes(router: Router): void {
  router
    // Whether it's connected, and the events in the window the page asks for (its own today).
    .add("GET", "/v1/me/calendar", async ({ request, env, ctx }) => {
      const user = await requireAccount(env, request, ctx);
      const link = await linkOf(env, user.id);
      if (!link) return json({ calendar: null });
      const url = new URL(request.url);
      const from = Number(url.searchParams.get("from"));
      const to = Number(url.searchParams.get("to"));
      if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from || to - from > LONGEST_WINDOW_MS) {
        throw new HttpError(400, "bad_window", "Ask for a week at most");
      }
      const token = await accessToken(env, user.id, link);
      // Access taken back at Google (or the account deleted there): it's disconnected here too.
      if (!token) return json({ calendar: null, lost: true });
      const events = await eventsBetween(token, from, to);
      return json({ calendar: { email: link.email, showTitles: link.show_titles === 1, events } });
    })

    // The team's calendars: when each of the office's people with a calendar connected is busy, out or focusing, over a week.
    .add("GET", "/v1/offices/:id/calendars", async ({ request, env, ctx, params }) => {
      const user = await requireAccount(env, request, ctx);
      const office = await requireOffice(env, params.id, user.id);
      const url = new URL(request.url);
      const from = Number(url.searchParams.get("from"));
      const to = Number(url.searchParams.get("to"));
      if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from || to - from > TEAM_WINDOW_MS) {
        throw new HttpError(400, "bad_window", "Ask for a week at most");
      }
      const { results } = await env.DB.prepare(
        `SELECT l.user_id, l.email, l.refresh_token, l.access_token, l.access_until, l.show_titles, u.time_zone,
                b.from_ms, b.to_ms, b.blocks, b.fetched_at
         FROM memberships m JOIN calendar_links l ON l.user_id = m.user_id JOIN users u ON u.id = m.user_id
         LEFT JOIN calendar_busy b ON b.user_id = m.user_id
         WHERE m.office_id = ? LIMIT ?`,
      )
        .bind(office.id, TEAM_MOST)
        .all<TeamRow>();
      const now = Date.now();
      const people: Array<{ id: string; timeZone: string | null; blocks: BusyBlock[] }> = [];
      // A few at a time: Google answers each in a moment, and a big office shouldn't hold one request for long.
      for (let i = 0; i < results.length; i += 6) {
        const batch = await Promise.all(
          results.slice(i, i + 6).map(async (row) => {
            const kept = row.blocks !== null && (row.fetched_at ?? 0) > now - BUSY_FRESH_MS && (row.from_ms ?? Infinity) <= from && (row.to_ms ?? 0) >= to;
            const blocks = kept ? (JSON.parse(row.blocks!) as BusyBlock[]) : await busyOf(env, row.user_id, row, now).catch(() => null);
            return blocks && { id: row.user_id, timeZone: row.time_zone, blocks: blocks.filter((block) => block.end > from && block.start < to) };
          }),
        );
        for (const one of batch) if (one) people.push(one);
      }
      return json({ people });
    })

    .add("POST", "/v1/me/calendar", async ({ request, env, ctx }) => {
      const user = await requireAccount(env, request, ctx);
      const client = calendarClient(env);
      if (!client) throw new HttpError(503, "google_unavailable", "Google Calendar isn't set up here");
      const { code } = await readJson(request);
      if (typeof code !== "string" || !code) throw new HttpError(400, "code_required", "Try connecting your calendar again");

      const response = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: client.id,
          client_secret: client.secret,
          redirect_uri: "postmessage",
          grant_type: "authorization_code",
        }),
      });
      const tokens = (await response.json().catch(() => null)) as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        scope?: string;
        id_token?: string;
      } | null;
      if (!response.ok || !tokens?.access_token) throw new HttpError(401, "google_failed", "Google didn't connect your calendar. Try again");
      // Google lets people untick the calendar on its consent screen.
      if (!tokens.scope?.split(" ").includes(CALENDAR_SCOPE)) {
        await revoke(tokens.access_token);
        throw new HttpError(403, "calendar_not_allowed", "Allow TinyFloor to see your calendar's events to connect it");
      }
      // Google gives lasting access only the first time it's agreed to; taking this back makes it ask again next time.
      if (!tokens.refresh_token) {
        await revoke(tokens.access_token);
        throw new HttpError(409, "calendar_again", "Connect your calendar once more to finish");
      }
      const claims = tokens.id_token ? readClaims(tokens.id_token) : {};
      const email = typeof claims.email === "string" ? claims.email.toLowerCase() : null;
      const now = Date.now();
      const key = await keyOf(env);
      await env.DB.prepare(
        `INSERT INTO calendar_links (user_id, email, refresh_token, access_token, access_until, show_titles, created_at)
         VALUES (?, ?, ?, ?, ?, 0, ?)
         ON CONFLICT (user_id) DO UPDATE SET email = excluded.email, refresh_token = excluded.refresh_token,
           access_token = excluded.access_token, access_until = excluded.access_until`,
      )
        .bind(user.id, email, await seal(key, tokens.refresh_token), await seal(key, tokens.access_token), now + (tokens.expires_in ?? 0) * 1000 - EARLY_MS, now)
        .run();
      const link = await linkOf(env, user.id);
      return json({ calendar: { email, showTitles: link?.show_titles === 1 } }, { status: 201 });
    })

    .add("PATCH", "/v1/me/calendar", async ({ request, env, ctx }) => {
      const user = await requireAccount(env, request, ctx);
      const { showTitles } = await readJson(request);
      if (typeof showTitles !== "boolean") throw new HttpError(400, "bad_request", "Say whether to show titles");
      const done = await env.DB.prepare("UPDATE calendar_links SET show_titles = ? WHERE user_id = ?").bind(showTitles ? 1 : 0, user.id).run();
      if (!done.meta.changes) throw new HttpError(404, "no_calendar", "Connect your calendar first");
      // What the office sees changes with it: read again next time.
      await env.DB.prepare("DELETE FROM calendar_busy WHERE user_id = ?").bind(user.id).run();
      return json({ ok: true });
    })

    // Disconnected: forgotten here, and the access taken back at Google.
    .add("DELETE", "/v1/me/calendar", async ({ request, env, ctx }) => {
      const user = await requireAccount(env, request, ctx);
      const link = await linkOf(env, user.id);
      if (link) {
        const refresh = await open(await keyOf(env), link.refresh_token);
        if (refresh) ctx.waitUntil(revoke(refresh));
        await env.DB.batch([
          env.DB.prepare("DELETE FROM calendar_links WHERE user_id = ?").bind(user.id),
          env.DB.prepare("DELETE FROM calendar_busy WHERE user_id = ?").bind(user.id),
        ]);
      }
      return json({ ok: true });
    });
}

function linkOf(env: Env, userId: string): Promise<LinkRow | null> {
  return env.DB.prepare("SELECT email, refresh_token, access_token, access_until, show_titles FROM calendar_links WHERE user_id = ?")
    .bind(userId)
    .first<LinkRow>();
}

type TeamRow = LinkRow & {
  user_id: string;
  time_zone: string | null;
  from_ms: number | null;
  to_ms: number | null;
  blocks: string | null;
  fetched_at: number | null;
};

/**
 * Someone's busy times, read from Google for this week and the weeks either
 * side (any week the Calendar page shows, from anywhere in the world), kept a
 * few minutes for whoever asks next. Null once their calendar is gone.
 */
async function busyOf(env: Env, userId: string, link: LinkRow, now: number): Promise<BusyBlock[] | null> {
  const token = await accessToken(env, userId, link);
  if (!token) return null;
  const [from, to] = [now - 9 * 24 * 60 * 60 * 1000, now + 15 * 24 * 60 * 60 * 1000];
  const blocks = toBusy(await eventsBetween(token, from, to), link.show_titles === 1);
  await env.DB.prepare(
    `INSERT INTO calendar_busy (user_id, from_ms, to_ms, blocks, fetched_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (user_id) DO UPDATE SET from_ms = excluded.from_ms, to_ms = excluded.to_ms, blocks = excluded.blocks, fetched_at = excluded.fetched_at`,
  )
    .bind(userId, from, to, JSON.stringify(blocks), now)
    .run();
  return blocks;
}

/**
 * Events as their office sees them: what holds their time (not marked free;
 * all-day only when they're out), with a title only where they show titles
 * and the event isn't private.
 */
export function toBusy(events: CalendarEvent[], showTitles: boolean): BusyBlock[] {
  return events
    .filter((event) => event.busy && (!event.allDay || event.kind === "out"))
    .map((event) => ({
      start: event.start,
      end: event.end,
      kind: event.kind,
      ...(showTitles && !event.private && event.title ? { title: event.title.slice(0, 80) } : {}),
      ...(event.link && !OUR_MEETING.test(event.link) ? { call: true } : {}),
    }));
}

/** A link to one of our own offices' Meetings pages, which Add to Google Calendar puts in an event: not a call elsewhere. */
const OUR_MEETING = /\/office\/[^/]+\/meetings/;

/** An access token for their calendar: the one kept while it lasts, or a new one for the refresh token. Null once Google won't give one. */
async function accessToken(env: Env, userId: string, link: LinkRow): Promise<string | null> {
  const key = await keyOf(env);
  if (link.access_token && (link.access_until ?? 0) > Date.now()) {
    const kept = await open(key, link.access_token);
    if (kept) return kept;
  }
  const refresh = await open(key, link.refresh_token);
  const client = calendarClient(env);
  const response = refresh && client
    ? await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ refresh_token: refresh, client_id: client.id, client_secret: client.secret, grant_type: "refresh_token" }),
      })
    : null;
  const tokens = (await response?.json().catch(() => null)) as { access_token?: string; expires_in?: number; error?: string } | null;
  if (!response?.ok || !tokens?.access_token) {
    // Taken back (invalid_grant), given to another client (unauthorized_client: connected before calendar had a client of its own),
    // or a key we can't open: the link is gone, and connecting again makes a new one. Anything else (Google down) is tried again next time.
    if (!refresh || tokens?.error === "invalid_grant" || tokens?.error === "unauthorized_client") {
      await env.DB.prepare("DELETE FROM calendar_links WHERE user_id = ?").bind(userId).run();
      return null;
    }
    throw new HttpError(502, "google_unreachable", "Google Calendar didn't answer. Try again in a moment");
  }
  await env.DB.prepare("UPDATE calendar_links SET access_token = ?, access_until = ? WHERE user_id = ?")
    .bind(await seal(key, tokens.access_token), Date.now() + (tokens.expires_in ?? 0) * 1000 - EARLY_MS, userId)
    .run();
  return tokens.access_token;
}

type GoogleEvent = {
  id?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  transparency?: string;
  visibility?: string;
  eventType?: string;
  status?: string;
  hangoutLink?: string;
  htmlLink?: string;
  location?: string;
  conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> };
  attendees?: Array<{ self?: boolean; responseStatus?: string }>;
};

/** Their primary calendar's events in a window, one each (repeats as they fall), leaving out what they declined and where they work from. */
async function eventsBetween(token: string, from: number, to: number): Promise<CalendarEvent[]> {
  const query = new URLSearchParams({
    timeMin: new Date(from).toISOString(),
    timeMax: new Date(to).toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
    fields: "items(id,summary,start,end,transparency,visibility,eventType,status,hangoutLink,htmlLink,location,conferenceData/entryPoints,attendees(self,responseStatus))",
  });
  const response = await fetch(`${EVENTS_URL}?${query}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new HttpError(502, "google_unreachable", "Google Calendar didn't answer. Try again in a moment");
  const { items = [] } = ((await response.json().catch(() => null)) ?? {}) as { items?: GoogleEvent[] };
  return items.flatMap((event): CalendarEvent[] => {
    if (event.status === "cancelled" || event.eventType === "workingLocation") return [];
    if (event.attendees?.some((one) => one.self && one.responseStatus === "declined")) return [];
    const allDay = !event.start?.dateTime;
    const start = Date.parse(event.start?.dateTime ?? event.start?.date ?? "");
    const end = Date.parse(event.end?.dateTime ?? event.end?.date ?? "");
    if (!event.id || !Number.isFinite(start) || !Number.isFinite(end)) return [];
    return [
      {
        id: event.id,
        title: (event.summary ?? "").trim().slice(0, 200),
        start,
        end,
        allDay,
        busy: event.transparency !== "transparent",
        private: event.visibility === "private" || event.visibility === "confidential",
        link: onlineLink(event),
        kind: event.eventType === "outOfOffice" ? "out" : event.eventType === "focusTime" ? "focus" : "event",
        url: event.htmlLink?.startsWith("https://www.google.com/calendar/") ? event.htmlLink : null,
      },
    ];
  });
}

/** Where an event happens online: Google Meet's own link, the call it carries, or a web address in its location. */
function onlineLink(event: GoogleEvent): string | null {
  const video = event.conferenceData?.entryPoints?.find((one) => one.entryPointType === "video")?.uri;
  const found = event.hangoutLink ?? video ?? event.location?.match(/https:\/\/[^\s<>"]+/)?.[0] ?? null;
  return found && /^https:\/\//.test(found) ? found.slice(0, 500) : null;
}

/** Takes access back at Google; it not answering is no reason to keep a link here. */
async function revoke(token: string): Promise<void> {
  await fetch(REVOKE_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token }) }).catch(() => undefined);
}

// ---------- keeping tokens ----------

/**
 * The key tokens are sealed with, from the ticket secret (no new secret to
 * set): a leaked database holds nothing usable. Changing the ticket secret
 * makes every link need connecting again, which is how it should fail.
 */
async function keyOf(env: Env): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.TICKET_SECRET), "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new TextEncoder().encode("tinyfloor-calendar"), info: new TextEncoder().encode("calendar tokens") },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function seal(key: CryptoKey, text: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(text)));
  return `${toBase64(iv)}.${toBase64(sealed)}`;
}

async function open(key: CryptoKey, sealed: string): Promise<string | null> {
  const [iv, data] = sealed.split(".");
  if (!iv || !data) return null;
  try {
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(iv) }, key, fromBase64(data)));
  } catch {
    return null;
  }
}

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
