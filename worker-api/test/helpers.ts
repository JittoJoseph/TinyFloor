import { env, exports } from "cloudflare:workers";
import { hashToken, randomToken } from "../src/crypto";

export const SITE = "http://localhost:3000";
const API = "https://api.tinyfloor.com";

export interface TestUser {
  id: string;
  cookie: string;
}

/** An account or guest with a live session, written straight to D1 (sign-in isn't under test here). */
export async function makeUser(name: string, options: { guest?: boolean; email?: string } = {}): Promise<TestUser> {
  const id = crypto.randomUUID();
  const token = randomToken();
  const now = Date.now();
  const email = options.guest ? null : (options.email ?? `${id}@example.com`);
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO users (id, email, email_verified, display_name, character, is_guest, created_at, last_active_at) VALUES (?, ?, ?, ?, 'Adam', ?, ?, ?)",
    ).bind(id, email, email ? 1 : 0, name, options.guest ? 1 : 0, now, now),
    env.DB.prepare(
      "INSERT INTO sessions (id, user_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)",
    ).bind(await hashToken(token), id, now, now + 86_400_000, now),
  ]);
  return { id, cookie: `tf_session=${token}` };
}

export async function call<T = Record<string, unknown>>(
  user: TestUser | null,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; body: T }> {
  const headers: Record<string, string> = { Origin: SITE };
  if (user) headers.Cookie = user.cookie;
  if (method !== "GET") headers["Content-Type"] = "application/json";
  const response = await exports.default.fetch(`${API}${path}`, {
    method,
    headers,
    body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
  });
  return { status: response.status, body: (await response.json()) as T };
}

interface FakeRealtime {
  setPeople(roomId: string, count: number): Promise<void>;
  calls(): Promise<unknown[][]>;
}

export function fakeRealtime(): FakeRealtime {
  return env.REALTIME as unknown as FakeRealtime;
}
