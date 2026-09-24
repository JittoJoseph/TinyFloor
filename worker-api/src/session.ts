import { hashToken, randomToken } from "./crypto";
import { HttpError } from "./http";

/**
 * The session cookie's name. Preview uses its own, so a live session in the
 * same browser can't shadow it: cookies are matched by name, and a `.tinyfloor.com`
 * one is sent to every subdomain.
 */
const sessionCookieName = (env: Env) => env.SESSION_COOKIE || "tf_session";
const GUEST_SESSION_MS = 7 * 24 * 60 * 60 * 1000;
export const ACCOUNT_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const LAST_SEEN_REFRESH_MS = 24 * 60 * 60 * 1000;

export interface User {
  id: string;
  email: string | null;
  displayName: string;
  character: string;
  isGuest: boolean;
  /** Has a password, not only Google. */
  hasPassword?: boolean;
  /** Can sign in with Google. */
  hasGoogle?: boolean;
  /** The link on their profile. */
  link?: string | null;
  /** Has said who they are on the floor: a name and a character, at their first door. */
  introduced?: boolean;
  /** The country they last walked onto a floor from (see noteCountry). */
  country?: string | null;
  /** The hashed id of the session this request came with. */
  sessionId: string;
}

interface SessionRow {
  user_id: string;
  email: string | null;
  display_name: string;
  character: string;
  is_guest: number;
  has_password: number;
  has_google: number;
  link: string | null;
  introduced: number;
  country: string | null;
  last_seen_at: number;
}

export async function createGuest(
  env: Env,
  request: Request,
  displayName: string,
  character: string,
): Promise<{ user: User; cookie: string }> {
  const now = Date.now();
  const userId = crypto.randomUUID();
  await env.DB.prepare(
    // A guest chose their name and character at the door, so they are introduced already.
    "INSERT INTO users (id, display_name, character, is_guest, created_at, last_active_at, introduced_at) VALUES (?, ?, ?, 1, ?, ?, ?)",
  )
    .bind(userId, displayName, character, now, now, now)
    .run();
  const { sessionId, cookie } = await createSession(env, request, userId, GUEST_SESSION_MS);
  return { user: { id: userId, email: null, displayName, character, isGuest: true, sessionId }, cookie };
}

/**
 * The country Cloudflare places a connection in, as ISO 3166 letters. Unknown
 * ("XX") and Tor ("T1") come back as nothing.
 */
export function countryOf(request: Request): string | null {
  const code = (request.cf as { country?: string } | undefined)?.country;
  return code && /^[A-Z]{2}$/.test(code) && code !== "XX" && code !== "T1" ? code : null;
}

/**
 * Notes the country someone walks onto a floor from, for the admin view. The
 * session read already brought the stored one, so this costs nothing unless
 * it changed: then one write, after the response.
 */
export function noteCountry(env: Env, request: Request, ctx: ExecutionContext, user: User): void {
  const country = countryOf(request);
  if (!country || country === user.country) return;
  ctx.waitUntil(env.DB.prepare("UPDATE users SET country = ? WHERE id = ?").bind(country, user.id).run());
}

/** A new session for the user, as a cookie. Only the token's hash is stored. */
export async function createSession(
  env: Env,
  request: Request,
  userId: string,
  lifetimeMs: number,
): Promise<{ sessionId: string; cookie: string }> {
  const now = Date.now();
  const token = randomToken();
  const sessionId = await hashToken(token);
  await env.DB.prepare(
    "INSERT INTO sessions (id, user_id, created_at, expires_at, last_seen_at, user_agent) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(sessionId, userId, now, now + lifetimeMs, now, request.headers.get("User-Agent")?.slice(0, 200) ?? null)
    .run();
  return { sessionId, cookie: sessionCookie(env, token, lifetimeMs / 1000) };
}

/** One D1 read per request; last_seen_at is written at most once a day. */
export async function currentUser(env: Env, request: Request, ctx: ExecutionContext): Promise<User | null> {
  const token = readCookie(request, sessionCookieName(env));
  if (!token) return null;

  const now = Date.now();
  const id = await hashToken(token);
  const row = await env.DB.prepare(
    `SELECT s.user_id, s.last_seen_at, u.email, u.display_name, u.character, u.is_guest, u.password_hash IS NOT NULL AS has_password,
            u.google_sub IS NOT NULL AS has_google, u.link, u.introduced_at IS NOT NULL AS introduced, u.country
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at > ?`,
  )
    .bind(id, now)
    .first<SessionRow>();
  if (!row) return null;

  if (now - row.last_seen_at > LAST_SEEN_REFRESH_MS) {
    ctx.waitUntil(
      env.DB.batch([
        env.DB.prepare("UPDATE sessions SET last_seen_at = ? WHERE id = ?").bind(now, id),
        env.DB.prepare("UPDATE users SET last_active_at = ? WHERE id = ?").bind(now, row.user_id),
      ]),
    );
  }

  return {
    id: row.user_id,
    email: row.email,
    displayName: row.display_name,
    character: row.character,
    isGuest: row.is_guest === 1,
    hasPassword: row.has_password === 1,
    hasGoogle: row.has_google === 1,
    link: row.link,
    introduced: row.introduced === 1,
    country: row.country,
    sessionId: id,
  };
}

export async function requireUser(env: Env, request: Request, ctx: ExecutionContext): Promise<User> {
  const user = await currentUser(env, request, ctx);
  if (!user) throw new HttpError(401, "signed_out", "Sign in or continue as a guest");
  return user;
}

/** Workspaces are for accounts; guests only visit the lobby and guest-link rooms. */
export async function requireAccount(env: Env, request: Request, ctx: ExecutionContext): Promise<User> {
  const user = await requireUser(env, request, ctx);
  if (user.isGuest) throw new HttpError(403, "account_required", "Sign in with an account first");
  return user;
}

/** Deletes the session, if any, and returns a cookie that clears it. */
export async function endSession(env: Env, request: Request): Promise<string> {
  const token = readCookie(request, sessionCookieName(env));
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(await hashToken(token)).run();
  return clearSessionCookie(env);
}

function clearSessionCookie(env: Env): string {
  return sessionCookie(env, "", 0);
}

function readCookie(request: Request, name: string): string | null {
  for (const part of (request.headers.get("Cookie") ?? "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return null;
}

function sessionCookie(env: Env, token: string, maxAgeSeconds: number): string {
  const domain = env.COOKIE_DOMAIN ? `; Domain=${env.COOKIE_DOMAIN}` : "";
  return `${sessionCookieName(env)}=${token}${domain}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}
