import { cleanDisplayName, cleanNote, DEFAULT_CHARACTER, isCharacter, liveNote, liveShare, type PresentPerson } from "../../shared-protocol/src";
import { realtime } from "./access";
import { HttpError, json, readJson } from "./http";
import { limitAuth } from "./limits";
import type { Router } from "./router";
import { createGuest, currentUser, endSession, renewSession, requireAccount, requireUser, type User } from "./session";
import { shareFrom } from "./spotify";
import { verifyTurnstile } from "./turnstile";
import { lobbyTicket } from "./floor";

export function authRoutes(router: Router): void {
  router
    // Asked on every page of the app, so an account's session is renewed here while it's used (renewSession).
    .add("GET", "/v1/session", async ({ request, env, ctx }) => {
      const user = await currentUser(env, request, ctx);
      const cookie = user && (await renewSession(env, request, ctx, user));
      return json({ user: user && publicUser(user) }, cookie ? { headers: { "Set-Cookie": cookie } } : undefined);
    })

    .add("POST", "/v1/auth/guest", async ({ request, env }) => {
      await limitAuth(env, request);
      const body = await readJson(request);
      const name = cleanDisplayName(body.name);
      if (!name) throw new HttpError(400, "name_required", "Pick a name");
      const character = isCharacter(body.character) ? body.character : DEFAULT_CHARACTER;
      await verifyTurnstile(env, request, body.turnstileToken);

      const { user, cookie } = await createGuest(env, request, name, character);
      // A guest is made at the demo office's door, on the way onto its floor: the ticket
      // for it comes with them, rather than being asked for once they're made.
      return json({ user: publicUser(user), lobby: await lobbyTicket(env, user) }, { status: 201, headers: { "Set-Cookie": cookie } });
    })

    .add("POST", "/v1/auth/logout", async ({ request, env }) => {
      const cookie = await endSession(env, request);
      return json({ ok: true }, { headers: { "Set-Cookie": cookie } });
    })

    .add("GET", "/v1/me", async ({ request, env, ctx }) => {
      const user = await requireUser(env, request, ctx);
      const { results } = await env.DB.prepare(
        `SELECT o.id, o.name, o.plan, o.seats, m.role,
                CASE WHEN o.trial_ends_at > ? THEN o.trial_ends_at END AS trialEndsAt,
                (SELECT COUNT(*) FROM memberships WHERE office_id = o.id) AS members
         FROM memberships m JOIN offices o ON o.id = m.office_id
         WHERE m.user_id = ? ORDER BY m.joined_at`,
      )
        .bind(Date.now(), user.id)
        .all<{ id: string; name: string; plan: string; seats: number; role: string; members: number; trialEndsAt: number | null }>();
      if (!results.length) return json({ user: publicUser(user), offices: [] });

      // Each office's team for the dashboard, oldest member first, and who is on each floor now.
      const [team, inNow] = await Promise.all([
        env.DB.prepare(
          `SELECT m.office_id, u.id, u.display_name, m.role FROM memberships m JOIN users u ON u.id = m.user_id
           WHERE m.office_id IN (SELECT office_id FROM memberships WHERE user_id = ?)
           ORDER BY m.joined_at`,
        )
          .bind(user.id)
          .all<{ office_id: string; id: string; display_name: string; role: string }>(),
        realtime(env)
          .officePresence(results.map((office) => office.id))
          .catch(() => ({}) as Record<string, PresentPerson[]>),
      ]);
      const byOffice = new Map<string, { id: string; displayName: string; role: string }[]>();
      for (const row of team.results) {
        const list = byOffice.get(row.office_id) ?? [];
        list.push({ id: row.id, displayName: row.display_name, role: row.role });
        byOffice.set(row.office_id, list);
      }
      return json({
        user: publicUser(user),
        offices: results.map((office) => ({
          ...office,
          team: byOffice.get(office.id) ?? [],
          here: inNow[office.id]?.length ?? 0,
          inNow: inNow[office.id] ?? [],
        })),
      });
    })

    .add("PATCH", "/v1/me", async ({ request, env, ctx }) => {
      const user = await requireUser(env, request, ctx);
      const body = await readJson(request);
      const displayName = body.displayName === undefined ? user.displayName : cleanDisplayName(body.displayName);
      if (!displayName) throw new HttpError(400, "name_required", "Pick a name", "displayName");
      if (body.character !== undefined && !isCharacter(body.character)) {
        throw new HttpError(400, "bad_character", "Pick one of the characters", "character");
      }
      const character = (body.character as string | undefined) ?? user.character;
      // A link is for accounts; a guest's profile lasts a week.
      const link = body.link === undefined || user.isGuest ? (user.link ?? null) : cleanLink(body.link);
      // Said at their first door: who they are, and who they walk in as.
      const introduced = user.introduced || body.introduced === true;
      // A zone they pick stays; null goes back to following their browser, whose
      // zone (detectedZone) is kept only while it does.
      const timeZoneAuto = body.timeZone === undefined ? user.timeZoneAuto !== false : body.timeZone === null;
      const picked = timeZoneAuto ? undefined : body.timeZone === undefined ? user.timeZone : cleanZone(body.timeZone, "timeZone");
      const detected = body.detectedZone === undefined ? undefined : cleanZone(body.detectedZone, "detectedZone");
      const timeZone = picked ?? (timeZoneAuto ? (detected ?? user.timeZone ?? null) : null);

      await env.DB.prepare(
        `UPDATE users SET display_name = ?, character = ?, link = ?, time_zone = ?, time_zone_auto = ?,
                introduced_at = CASE WHEN ? THEN COALESCE(introduced_at, ?) ELSE introduced_at END WHERE id = ?`,
      )
        .bind(displayName, character, link, timeZone, timeZoneAuto ? 1 : 0, introduced ? 1 : 0, Date.now(), user.id)
        .run();
      return json({ user: publicUser({ ...user, displayName, character, link, introduced, timeZone, timeZoneAuto }) });
    })

    // Your status note, kept with the account so People shows it while you're away.
    // The floor hears about it from your own socket; this keeps it. Null clears it.
    .add("PUT", "/v1/me/status", async ({ request, env, ctx }) => {
      const user = await requireAccount(env, request, ctx);
      const note = cleanNote((await readJson(request)).status);
      await env.DB.prepare("UPDATE users SET status_icon = ?, status_text = ?, status_until = ? WHERE id = ?")
        .bind(note?.icon ?? null, note?.text || null, note?.until ?? null, user.id)
        .run();
      return json({ status: note });
    })

    // Someone's profile, for whoever they share a floor or a chat with: their name, their link, their zone,
    // and what they're listening to on Spotify while they share it.
    .add("GET", "/v1/people/:id", async ({ request, env, ctx, params }) => {
      await requireUser(env, request, ctx);
      const person = await env.DB.prepare(
        `SELECT id, display_name, link, is_guest, time_zone, spotify_url, spotify_kind, spotify_title, spotify_image, spotify_subtitle, spotify_until
           FROM users WHERE id = ?`,
      )
        .bind(params.id)
        .first<{
          id: string;
          display_name: string;
          link: string | null;
          is_guest: number;
          time_zone: string | null;
          spotify_url: string | null;
          spotify_kind: string | null;
          spotify_title: string | null;
          spotify_image: string | null;
          spotify_subtitle: string | null;
          spotify_until: number | null;
        }>();
      if (!person) throw new HttpError(404, "not_found", "No such person");
      return json(
        {
          person: {
            id: person.id,
            displayName: person.display_name,
            link: person.is_guest ? null : person.link,
            guest: person.is_guest === 1,
            timeZone: person.time_zone,
            spotify: person.is_guest ? null : liveShare(shareFrom(person)),
          },
        },
        // The app keeps a profile a minute itself (app-frontend's lib/people.ts) and forgets yours when you
        // change it; a browser cache on top would hold a share for a minute more after it changed.
        { headers: { "Cache-Control": "private, no-store" } },
      );
    });
}

export function cleanEmail(value: unknown): string {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!email) throw new HttpError(400, "email_required", "Enter your email", "email");
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, "bad_email", "That email doesn't look right", "email");
  }
  return email;
}

/** A profile link: a web address, http or https, or nothing. */
function cleanLink(value: unknown): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new HttpError(400, "bad_link", "That doesn't look like a web address", "link");
  }
  if ((url.protocol !== "https:" && url.protocol !== "http:") || !url.hostname.includes(".") || candidate.length > 200) {
    throw new HttpError(400, "bad_link", "That doesn't look like a web address", "link");
  }
  // Kept as written (with https:// added), so it reads the way they typed it.
  return candidate;
}

/**
 * An IANA zone the runtime knows ("Asia/Kolkata"), kept as the browser wrote
 * it: runtimes disagree on which of a zone's old and new names is canonical.
 */
function cleanZone(value: unknown, field: string): string {
  if (typeof value === "string" && value && value.length <= 64) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: value });
      return value;
    } catch {}
  }
  throw new HttpError(400, "bad_time_zone", "Pick a time zone from the list", field);
}

export function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    character: user.character,
    guest: user.isGuest,
    emailVerified: !!user.emailVerified,
    google: !!user.hasGoogle,
    link: user.link ?? null,
    // Guests always are: they said who they are at the door.
    introduced: user.isGuest || user.introduced !== false,
    timeZone: user.timeZone ?? null,
    timeZoneAuto: user.timeZoneAuto !== false,
    // Yours even once it has cleared, so settings can offer it again.
    spotify: user.isGuest ? null : (user.spotify ?? null),
    status: liveNote(user.status),
  };
}

/** A name to go by until someone says theirs: "jitto.joseph67@…" is Jitto Joseph. */
export function nameFromEmail(email: string): string {
  const words = email
    .split("@")[0]
    .split(/[._+\-\d]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));
  return cleanDisplayName(words.join(" ")) || cleanDisplayName(email.split("@")[0]) || "New here";
}
