import { env, exports } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { call, makeUser, SITE } from "./helpers";

const API = "https://api.tinyfloor.com";
let sequence = 0;
const uniqueEmail = () => `person${Date.now()}${sequence++}@example.com`;

beforeEach(() => {
  const realFetch = globalThis.fetch;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url.startsWith("https://challenges.cloudflare.com/")) return Response.json({ success: true });
    return realFetch(input, init);
  });
});
afterEach(() => vi.restoreAllMocks());

let addresses = 0;
/** A different address per request unless a test names one, so the per-IP limits don't trip. */
const freshIp = () => `10.1.${(++addresses >> 8) & 255}.${addresses & 255}`;

async function post(path: string, body: unknown, cookie?: string, ip = freshIp()) {
  const response = await exports.default.fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      Origin: SITE,
      "Content-Type": "application/json",
      "CF-Connecting-IP": ip,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
  const setCookie = response.headers.get("Set-Cookie");
  return {
    status: response.status,
    body: (await response.json()) as Record<string, any>,
    cookie: setCookie ? setCookie.split(";")[0] : undefined,
    setCookie,
  };
}

async function signUp(email = uniqueEmail(), password = "correct horse", extra: Record<string, unknown> = {}) {
  return post("/v1/auth/signup", { email, password, displayName: "Ava", character: "Lucy", turnstileToken: "t", ...extra });
}

describe("sign up", () => {
  it("creates an account with a 30-day session and stores only a bcrypt hash", async () => {
    const email = uniqueEmail();
    const result = await signUp(`  ${email.toUpperCase()} `);
    expect(result.status).toBe(201);
    expect(result.body.user).toMatchObject({ email, displayName: "Ava", character: "Lucy", guest: false });
    expect(result.setCookie).toMatch(/Max-Age=2592000/);

    const row = await env.DB.prepare("SELECT password_hash FROM users WHERE email = ?").bind(email).first<{ password_hash: string }>();
    expect(row?.password_hash).toMatch(/^\$2[aby]\$11\$/);
    expect(await bcrypt.compare("correct horse", row!.password_hash)).toBe(true);

    const session = await call({ id: "", cookie: result.cookie! }, "GET", "/v1/session");
    expect(session.body.user).toMatchObject({ email, guest: false });
  });

  it("explains what's wrong with the email and password, field by field", async () => {
    expect((await signUp("not-an-email")).body.error).toMatchObject({ code: "bad_email", field: "email" });
    expect((await signUp(uniqueEmail(), "short")).body.error).toMatchObject({ code: "password_too_short", field: "password" });
    expect((await signUp(uniqueEmail(), "x".repeat(73))).body.error).toMatchObject({ code: "password_too_long" });
    expect((await signUp(uniqueEmail(), "correct horse", { displayName: "  " })).body.error).toMatchObject({
      field: "displayName",
    });
  });

  it("refuses an email that already has an account", async () => {
    const email = uniqueEmail();
    await signUp(email);
    const again = await signUp(email);
    expect(again.status).toBe(409);
    expect(again.body.error).toMatchObject({ code: "email_taken", field: "email" });
  });

  it("turns a guest into an account in place, keeping their name and character", async () => {
    const guest = await post("/v1/auth/guest", { name: "Gus", character: "Bob", turnstileToken: "t" });
    const guestId = guest.body.user.id;
    const upgraded = await post(
      "/v1/auth/signup",
      { email: uniqueEmail(), password: "correct horse", turnstileToken: "t" },
      guest.cookie,
    );
    expect(upgraded.status).toBe(201);
    expect(upgraded.body.user).toMatchObject({ id: guestId, displayName: "Gus", character: "Bob", guest: false });

    // The old guest session no longer works; the new account session does.
    expect((await call({ id: "", cookie: guest.cookie! }, "GET", "/v1/session")).body.user).toBeNull();
    expect((await call<{ user: { id: string } }>({ id: "", cookie: upgraded.cookie! }, "GET", "/v1/session")).body.user.id).toBe(guestId);
  });
});

describe("sign in", () => {
  it("signs in with the right password, whatever the email's case", async () => {
    const email = uniqueEmail();
    const created = await signUp(email);
    const result = await post("/v1/auth/login", { email: email.toUpperCase(), password: "correct horse" });
    expect(result.status).toBe(200);
    expect(result.body.user.id).toBe(created.body.user.id);
    expect(result.setCookie).toMatch(/HttpOnly; Secure; SameSite=Lax; Max-Age=2592000/);
  });

  it("gives the same answer for a wrong password and an unknown email", async () => {
    const email = uniqueEmail();
    await signUp(email);
    const wrongPassword = await post("/v1/auth/login", { email, password: "wrong horse" }, undefined, "203.0.113.2");
    const unknown = await post("/v1/auth/login", { email: uniqueEmail(), password: "correct horse" }, undefined, "203.0.113.2");
    expect(wrongPassword.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknown.body);
  });

  it("locks an email for a while after five wrong passwords, even with the right one", async () => {
    const email = uniqueEmail();
    await signUp(email);
    for (let i = 0; i < 5; i++) {
      expect((await post("/v1/auth/login", { email, password: `nope ${i} nope` }, undefined, "203.0.113.3")).status).toBe(401);
    }
    const locked = await post("/v1/auth/login", { email, password: "correct horse" }, undefined, "203.0.113.3");
    expect(locked.status).toBe(429);
    expect(locked.body.error.message).toMatch(/Try again in 15 minutes/);
  }, 30_000);

  it("limits attempts from one IP address across many emails", async () => {
    const ip = "198.51.100.7";
    for (let i = 0; i < 30; i++) await env.PASSWORD_GUARD.getByName(`ip:${ip}`).attempt(30);
    const result = await post("/v1/auth/login", { email: uniqueEmail(), password: "whatever it is" }, undefined, ip);
    expect(result.status).toBe(429);
  });

  it("accepts a password carried over from the Java backend and upgrades its hash", async () => {
    const email = uniqueEmail();
    const user = await makeUser("Old Timer", { email });
    const javaHash = bcrypt.hashSync("legacy password", 10).replace(/^\$2b\$/, "$2a$");
    await env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(javaHash, user.id).run();

    const result = await post("/v1/auth/login", { email, password: "legacy password" }, undefined, "203.0.113.4");
    expect(result.status).toBe(200);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const row = await env.DB.prepare("SELECT password_hash FROM users WHERE id = ?").bind(user.id).first<{ password_hash: string }>();
    expect(bcrypt.getRounds(row!.password_hash)).toBe(11);
  }, 30_000);
});

describe("changing the password", () => {
  it("needs the current password and signs out other sessions", async () => {
    const email = uniqueEmail();
    const first = await signUp(email);
    const second = await post("/v1/auth/login", { email, password: "correct horse" }, undefined, "203.0.113.5");

    const wrong = await post("/v1/me/password", { currentPassword: "nope nope", newPassword: "battery staple" }, first.cookie);
    expect(wrong.body.error).toMatchObject({ code: "wrong_password", field: "currentPassword" });

    const changed = await post("/v1/me/password", { currentPassword: "correct horse", newPassword: "battery staple" }, first.cookie);
    expect(changed.status).toBe(200);
    expect((await call({ id: "", cookie: first.cookie! }, "GET", "/v1/session")).body.user).not.toBeNull();
    expect((await call({ id: "", cookie: second.cookie! }, "GET", "/v1/session")).body.user).toBeNull();

    const relogin = await post("/v1/auth/login", { email, password: "battery staple" }, undefined, "203.0.113.5");
    expect(relogin.status).toBe(200);
  }, 30_000);
});

describe("per-address limit", () => {
  it("slows down one address creating sessions quickly", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      statuses.push((await post("/v1/auth/login", { email: uniqueEmail(), password: "whatever it is" }, undefined, "198.51.100.9")).status);
    }
    expect(statuses.slice(0, 10).every((status) => status === 401)).toBe(true);
    expect(statuses.slice(10)).toEqual([429, 429]);
    const body = (await post("/v1/auth/login", { email: uniqueEmail(), password: "x" }, undefined, "198.51.100.9")).body;
    expect(body.error.code).toBe("slow_down");
    // Someone else is unaffected.
    expect((await post("/v1/auth/login", { email: uniqueEmail(), password: "whatever it is" })).status).toBe(401);
  }, 30_000);
});
