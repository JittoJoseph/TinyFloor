import { HttpError } from "./http";

export const SESSION_COOKIE = "tf_session";
const GUEST_SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const LAST_SEEN_REFRESH_MS = 24 * 60 * 60 * 1000;

export interface User {
  id: string;
  displayName: string;
  character: string;
  isGuest: boolean;
}

interface SessionRow {
  user_id: string;
  display_name: string;
  character: string;
  is_guest: number;
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
  const token = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const expiresAt = now + GUEST_SESSION_MS;
  const userAgent = request.headers.get("User-Agent")?.slice(0, 200) ?? null;

  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO users (id, display_name, character, is_guest, created_at, last_active_at) VALUES (?, ?, ?, 1, ?, ?)",
    ).bind(userId, displayName, character, now, now),
    env.DB.prepare(
      "INSERT INTO sessions (id, user_id, created_at, expires_at, last_seen_at, user_agent) VALUES (?, ?, ?, ?, ?, ?)",
    ).bind(await hashToken(token), userId, now, expiresAt, now, userAgent),
  ]);

  return {
    user: { id: userId, displayName, character, isGuest: true },
    cookie: sessionCookie(env, token, GUEST_SESSION_MS / 1000),
  };
}

/** One D1 read per request; last_seen_at is written at most once a day. */
export async function currentUser(env: Env, request: Request, ctx: ExecutionContext): Promise<User | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;

  const now = Date.now();
  const id = await hashToken(token);
  const row = await env.DB.prepare(
    `SELECT s.user_id, s.last_seen_at, u.display_name, u.character, u.is_guest
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
    displayName: row.display_name,
    character: row.character,
    isGuest: row.is_guest === 1,
  };
}

export async function requireUser(env: Env, request: Request, ctx: ExecutionContext): Promise<User> {
  const user = await currentUser(env, request, ctx);
  if (!user) throw new HttpError(401, "signed_out", "Sign in or continue as a guest");
  return user;
}

/** Deletes the session, if any, and returns a cookie that clears it. */
export async function endSession(env: Env, request: Request): Promise<string> {
  const token = readCookie(request, SESSION_COOKIE);
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(await hashToken(token)).run();
  return sessionCookie(env, "", 0);
}

/** Only a hash of the token is stored, so a database leak exposes no usable sessions. */
async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return base64url(new Uint8Array(digest));
}

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
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
  return `${SESSION_COOKIE}=${token}${domain}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}
