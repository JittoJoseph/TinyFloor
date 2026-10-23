import { env, exports } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";
import { hashToken } from "../src/crypto";
import { call, makeUser, SITE } from "./helpers";

const API = "https://api.tinyfloor.com";

function mockTurnstile() {
  const realFetch = globalThis.fetch;
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url.startsWith("https://challenges.cloudflare.com/")) return Response.json({ success: true });
    return realFetch(input, init);
  });
}

/** A link as an email would carry it, written straight to D1 with the token known. */
async function link(userId: string, kind: "verify" | "reset", options: { email?: string; expiresIn?: number } = {}) {
  const token = `${kind}-${crypto.randomUUID()}`;
  const user = await env.DB.prepare("SELECT email FROM users WHERE id = ?").bind(userId).first<{ email: string }>();
  const now = Date.now();
  await env.DB.prepare("INSERT INTO email_tokens (id, user_id, kind, email, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(await hashToken(token), userId, kind, options.email ?? user!.email, now, now + (options.expiresIn ?? 60_000))
    .run();
  return token;
}

const unverify = (id: string) => env.DB.prepare("UPDATE users SET email_verified = 0 WHERE id = ?").bind(id).run();
const verified = async (id: string) =>
  (await env.DB.prepare("SELECT email_verified FROM users WHERE id = ?").bind(id).first<{ email_verified: number }>())!.email_verified === 1;

afterEach(() => vi.restoreAllMocks());

describe("confirming an email", () => {
  it("sends a link when an account is made with a password, and the session says it isn't confirmed yet", async () => {
    mockTurnstile();
    const email = `new-${crypto.randomUUID()}@example.com`;
    const response = await exports.default.fetch(`${API}/v1/auth/signup`, {
      method: "POST",
      headers: { Origin: SITE, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "a good password", turnstileToken: "token" }),
    });
    expect(response.status).toBe(201);
    const { user } = await response.json<{ user: { id: string; emailVerified: boolean } }>();
    expect(user.emailVerified).toBe(false);
    const sent = await env.DB.prepare("SELECT kind, email FROM email_tokens WHERE user_id = ?").bind(user.id).first();
    expect(sent).toEqual({ kind: "verify", email });
  });

  it("confirms the address from the link, once", async () => {
    const someone = await makeUser("Ava");
    await unverify(someone.id);
    const token = await link(someone.id, "verify");
    expect((await call(null, "POST", "/v1/auth/verify", { token })).status).toBe(200);
    expect(await verified(someone.id)).toBe(true);
    expect((await call(null, "POST", "/v1/auth/verify", { token })).body).toMatchObject({ error: { code: "link_invalid" } });
  });

  it("does nothing with a link that has expired, or is for an address the account no longer has", async () => {
    const someone = await makeUser("Ben");
    await unverify(someone.id);
    const old = await link(someone.id, "verify", { expiresIn: -1 });
    const elsewhere = await link(someone.id, "verify", { email: "old@example.com" });
    expect((await call(null, "POST", "/v1/auth/verify", { token: old })).status).toBe(400);
    expect((await call(null, "POST", "/v1/auth/verify", { token: elsewhere })).status).toBe(400);
    expect(await verified(someone.id)).toBe(false);
  });

  it("sends another link from settings, but not twice in a minute, and not for an address already confirmed", async () => {
    const someone = await makeUser("Cara");
    expect((await call(someone, "POST", "/v1/me/verify-email")).body).toEqual({ sent: false, verified: true });
    await unverify(someone.id);
    expect((await call(someone, "POST", "/v1/me/verify-email")).status).toBe(200);
    expect((await call(someone, "POST", "/v1/me/verify-email")).status).toBe(429);
  });
});

describe("resetting a password", () => {
  it("answers the same for an address with no account, and sends a link to one that has one", async () => {
    mockTurnstile();
    const someone = await makeUser("Dev");
    const email = (await env.DB.prepare("SELECT email FROM users WHERE id = ?").bind(someone.id).first<{ email: string }>())!.email;
    const nobody = await call(null, "POST", "/v1/auth/reset/request", { email: "nobody@example.com", turnstileToken: "token" });
    const them = await call(null, "POST", "/v1/auth/reset/request", { email, turnstileToken: "token" });
    expect(nobody).toEqual({ status: 200, body: { ok: true } });
    expect(them).toEqual({ status: 200, body: { ok: true } });
    expect(await env.DB.prepare("SELECT 1 FROM email_tokens WHERE user_id = ? AND kind = 'reset'").bind(someone.id).first()).not.toBeNull();
  });

  it("sets the new password from the link, ends every other session and confirms the address", async () => {
    const someone = await makeUser("Eli");
    await unverify(someone.id);
    const token = await link(someone.id, "reset");
    const response = await exports.default.fetch(`${API}/v1/auth/reset`, {
      method: "POST",
      headers: { Origin: SITE, "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: "a brand new one" }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Set-Cookie")).toMatch(/^tf_session=/);
    // The session from before the reset is gone.
    expect((await call(someone, "GET", "/v1/session")).body).toEqual({ user: null });
    expect(await verified(someone.id)).toBe(true);
    // And the link is spent.
    expect((await call(null, "POST", "/v1/auth/reset", { token, password: "another one" })).status).toBe(400);
  });

  it("refuses a password that's too short, and keeps the link for another try", async () => {
    const someone = await makeUser("Fay");
    const token = await link(someone.id, "reset");
    expect((await call(null, "POST", "/v1/auth/reset", { token, password: "short" })).body).toMatchObject({ error: { code: "password_too_short" } });
    expect((await call(null, "POST", "/v1/auth/reset", { token, password: "long enough now" })).status).toBe(200);
  });
});
