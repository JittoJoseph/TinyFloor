import { HttpError, json, readJson } from "./http";
import { readClaims } from "./google";
import type { Router } from "./router";
import { requireAccount } from "./session";

/**
 * Someone's Google Calendar, read-only, so their office can see when they're
 * in a meeting (shared-protocol messages.ts CalendarBusy). Connected from
 * Settings with Google's popup code flow, as signing in is (google.ts), asking
 * for the calendar as well; we keep the refresh token, encrypted, and trade it
 * for an access token when their page asks for their events. Their page works
 * out whether they're busy and tells the room; nobody else's page ever reads
 * their calendar, and an event's title goes no further than their own page
 * unless they turn titles on.
 */

export const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
/** The most a page can ask for at once: a day and a half covers today wherever it is. */
const LONGEST_WINDOW_MS = 48 * 60 * 60 * 1000;
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
        throw new HttpError(400, "bad_window", "Ask for a day at most");
      }
      const token = await accessToken(env, user.id, link);
      // Access taken back at Google (or the account deleted there): it's disconnected here too.
      if (!token) return json({ calendar: null, lost: true });
      const events = await eventsBetween(token, from, to);
      return json({ calendar: { email: link.email, showTitles: link.show_titles === 1, events } });
    })

    .add("POST", "/v1/me/calendar", async ({ request, env, ctx }) => {
      const user = await requireAccount(env, request, ctx);
      if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) throw new HttpError(503, "google_unavailable", "Google isn't set up here");
      const { code } = await readJson(request);
      if (typeof code !== "string" || !code) throw new HttpError(400, "code_required", "Try connecting your calendar again");

      const response = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
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
      return json({ ok: true });
    })

    // Disconnected: forgotten here, and the access taken back at Google.
    .add("DELETE", "/v1/me/calendar", async ({ request, env, ctx }) => {
      const user = await requireAccount(env, request, ctx);
      const link = await linkOf(env, user.id);
      if (link) {
        const refresh = await open(await keyOf(env), link.refresh_token);
        if (refresh) ctx.waitUntil(revoke(refresh));
        await env.DB.prepare("DELETE FROM calendar_links WHERE user_id = ?").bind(user.id).run();
      }
      return json({ ok: true });
    });
}

function linkOf(env: Env, userId: string): Promise<LinkRow | null> {
  return env.DB.prepare("SELECT email, refresh_token, access_token, access_until, show_titles FROM calendar_links WHERE user_id = ?")
    .bind(userId)
    .first<LinkRow>();
}

/** An access token for their calendar: the one kept while it lasts, or a new one for the refresh token. Null once Google won't give one. */
async function accessToken(env: Env, userId: string, link: LinkRow): Promise<string | null> {
  const key = await keyOf(env);
  if (link.access_token && (link.access_until ?? 0) > Date.now()) {
    const kept = await open(key, link.access_token);
    if (kept) return kept;
  }
  const refresh = await open(key, link.refresh_token);
  const response = refresh
    ? await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ refresh_token: refresh, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, grant_type: "refresh_token" }),
      })
    : null;
  const tokens = (await response?.json().catch(() => null)) as { access_token?: string; expires_in?: number; error?: string } | null;
  if (!response?.ok || !tokens?.access_token) {
    // Taken back (invalid_grant), or a key we can't open: the link is gone. Anything else (Google down) is tried again next time.
    if (!refresh || tokens?.error === "invalid_grant") {
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
    maxResults: "50",
    fields: "items(id,summary,start,end,transparency,visibility,eventType,status,hangoutLink,location,conferenceData/entryPoints,attendees(self,responseStatus))",
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
