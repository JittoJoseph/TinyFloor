import { env, exports } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { call, makeUser, SITE } from "./helpers";

const API = "https://api.tinyfloor.com";
let sequence = 0;
const uniqueEmail = () => `person${Date.now()}${sequence++}@example.com`;

/** Each code the API would have emailed, by address: without RESEND_API_KEY it logs the email instead (src/email.ts). */
let sent: { to: string; code: string }[] = [];

beforeEach(() => {
  sent = [];
  const realFetch = globalThis.fetch;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url.startsWith("https://challenges.cloudflare.com/")) return Response.json({ success: true });
    return realFetch(input, init);
  });
  vi.spyOn(console, "log").mockImplementation((message: unknown, details?: { to?: string; subject?: string }) => {
    const code = details?.subject?.match(/^(\d{6}) is your TinyFloor code$/)?.[1];
    if (message === "email not sent (no RESEND_API_KEY)" && details?.to && code) sent.push({ to: details.to, code });
  });
});
afterEach(() => vi.restoreAllMocks());

let addresses = 0;
/** A different address per request unless a test names one, so the per-IP limit doesn't trip. */
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

const askForCode = (email: string, cookie?: string) => post("/v1/auth/code", { email, turnstileToken: "t" }, cookie);
const lastCode = (email: string) => sent.filter((one) => one.to === email).at(-1)?.code;
const enterCode = (email: string, code: string, cookie?: string) => post("/v1/auth/code/verify", { email, code }, cookie);

/** Signs in (or up) the whole way: a code to the address, and the code typed in. */
async function signIn(email: string, cookie?: string) {
  expect((await askForCode(email, cookie)).status).toBe(200);
  return enterCode(email, lastCode(email)!, cookie);
}

/** Lets the next request for this address send a new code, as if a minute had passed. */
const aMinuteLater = (email: string) =>
  env.DB.prepare("UPDATE email_codes SET created_at = created_at - 60000 WHERE email = ?").bind(email).run();

describe("signing in with a code", () => {
  it("makes an account the first time, named from the address, and asks the rest at the first door", async () => {
    const email = `jitto.joseph67.${Date.now()}${sequence++}@example.com`;
    const result = await signIn(email);
    expect(result.status).toBe(201);
    expect(result.body).toMatchObject({ created: true, user: { email, displayName: "Jitto Joseph", introduced: false, emailVerified: true, guest: false } });
    // A 90-day session.
    expect(result.setCookie).toMatch(/Max-Age=7776000/);

    // At their first door they say who they are, and from then on they are.
    const me = { id: result.body.user.id, cookie: result.cookie! };
    const named = await call(me, "PATCH", "/v1/me", { displayName: "Jitto", character: "Bob", introduced: true });
    expect(named.body.user).toMatchObject({ displayName: "Jitto", character: "Bob", introduced: true });
    expect((await call(me, "GET", "/v1/session")).body.user).toMatchObject({ introduced: true });
  });

  it("signs the same address into the same account the next time, whatever its case", async () => {
    const email = uniqueEmail();
    const first = await signIn(email);
    await askForCode(`  ${email.toUpperCase()} `);
    const again = await enterCode(email.toUpperCase(), lastCode(email)!);
    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({ created: false, user: { id: first.body.user.id, email } });
    expect((await call({ id: "", cookie: again.cookie! }, "GET", "/v1/session")).body.user).toMatchObject({ id: first.body.user.id });
  });

  it("confirms the address of an account that never was", async () => {
    const email = uniqueEmail();
    const ada = await makeUser("Ada", { email });
    await env.DB.prepare("UPDATE users SET email_verified = 0 WHERE id = ?").bind(ada.id).run();
    const result = await signIn(email);
    expect(result.body.user).toMatchObject({ id: ada.id, emailVerified: true });
  });

  it("answers the same for any address, and says what's wrong with one that isn't", async () => {
    const known = uniqueEmail();
    await makeUser("Known", { email: known });
    expect(await askForCode(known)).toMatchObject({ status: 200, body: { ok: true } });
    expect(await askForCode(uniqueEmail())).toMatchObject({ status: 200, body: { ok: true } });
    expect((await askForCode("not-an-email")).body.error).toMatchObject({ code: "bad_email", field: "email" });
  });

  it("refuses a wrong code, and a code after five wrong ones, even the right one", async () => {
    const email = uniqueEmail();
    await askForCode(email);
    const code = lastCode(email)!;
    const wrong = code === "000000" ? "111111" : "000000";
    expect((await enterCode(email, wrong)).body.error).toMatchObject({ code: "wrong_code", field: "code" });
    expect((await enterCode(email, "12ab")).body.error).toMatchObject({ code: "wrong_code" });
    for (let i = 0; i < 3; i++) await enterCode(email, wrong);
    expect((await enterCode(email, wrong)).body.error).toMatchObject({ code: "code_expired" });
    expect((await enterCode(email, code)).body.error).toMatchObject({ code: "code_expired" });
  });

  it("refuses a code that has expired, and one already used", async () => {
    const email = uniqueEmail();
    await askForCode(email);
    const code = lastCode(email)!;
    await env.DB.prepare("UPDATE email_codes SET expires_at = ? WHERE email = ?").bind(Date.now() - 1, email).run();
    expect((await enterCode(email, code)).body.error).toMatchObject({ code: "code_expired" });

    await aMinuteLater(email);
    const used = await signIn(email);
    expect(used.status).toBe(201);
    expect((await enterCode(email, lastCode(email)!)).body.error).toMatchObject({ code: "code_expired" });
  });

  it("sends nothing new within a minute, since the code already sent works, and only five codes an hour", async () => {
    const email = uniqueEmail();
    await askForCode(email);
    await askForCode(email);
    expect(sent.filter((one) => one.to === email)).toHaveLength(1);

    for (let i = 0; i < 4; i++) {
      await aMinuteLater(email);
      expect((await askForCode(email)).status).toBe(200);
    }
    expect(sent.filter((one) => one.to === email)).toHaveLength(5);
    await aMinuteLater(email);
    expect((await askForCode(email)).body.error).toMatchObject({ code: "too_many_codes" });
    // The last code sent still works.
    expect((await enterCode(email, lastCode(email)!)).status).toBe(201);
  });

  it("turns a guest into an account in place, keeping their name and character", async () => {
    const guest = await post("/v1/auth/guest", { name: "Gus", character: "Bob", turnstileToken: "t" });
    const result = await signIn(uniqueEmail(), guest.cookie);
    expect(result.status).toBe(201);
    expect(result.body.user).toMatchObject({ id: guest.body.user.id, displayName: "Gus", character: "Bob", guest: false, introduced: true });
    // The old guest session no longer works; the new account session does.
    expect((await call({ id: "", cookie: guest.cookie! }, "GET", "/v1/session")).body.user).toBeNull();
    expect((await call({ id: "", cookie: result.cookie! }, "GET", "/v1/session")).body.user).toMatchObject({ id: guest.body.user.id });
  });

  it("leaves a guest behind as a guest when they sign in to the account they have", async () => {
    const email = uniqueEmail();
    const account = await makeUser("Ada", { email });
    const guest = await post("/v1/auth/guest", { name: "Gus", character: "Bob", turnstileToken: "t" });
    const result = await signIn(email, guest.cookie);
    expect(result.body.user.id).toBe(account.id);
    expect((await call({ id: "", cookie: guest.cookie! }, "GET", "/v1/session")).body.user).toBeNull();
  });

  it("confirms a signed-in account's address from settings, keeping the session it has", async () => {
    const email = uniqueEmail();
    const ada = await makeUser("Ada", { email });
    await env.DB.prepare("UPDATE users SET email_verified = 0 WHERE id = ?").bind(ada.id).run();
    expect((await call(ada, "GET", "/v1/session")).body.user).toMatchObject({ emailVerified: false });

    expect((await post("/v1/me/email-code", {}, ada.cookie)).status).toBe(200);
    const confirmed = await enterCode(email, lastCode(email)!, ada.cookie);
    expect(confirmed.status).toBe(200);
    expect(confirmed.setCookie).toBeNull();
    expect((await call(ada, "GET", "/v1/session")).body.user).toMatchObject({ emailVerified: true });
  });
});

describe("staying signed in", () => {
  it("renews an account's session while it's used, once a day", async () => {
    // makeUser's session ends in a day.
    const ada = await makeUser("Ada");
    const response = await exports.default.fetch(`${API}/v1/session`, { headers: { Origin: SITE, Cookie: ada.cookie } });
    expect(response.headers.get("Set-Cookie")).toMatch(new RegExp(`^${ada.cookie}; .*Max-Age=7776000`));
    // The renewal is written after the answer.
    await new Promise((resolve) => setTimeout(resolve, 50));
    const row = await env.DB.prepare("SELECT expires_at FROM sessions WHERE user_id = ?").bind(ada.id).first<{ expires_at: number }>();
    expect(row!.expires_at).toBeGreaterThan(Date.now() + 89 * 24 * 60 * 60 * 1000);

    const later = await exports.default.fetch(`${API}/v1/session`, { headers: { Origin: SITE, Cookie: ada.cookie } });
    expect(later.headers.get("Set-Cookie")).toBeNull();
  });

  it("doesn't renew a guest's", async () => {
    const guest = await makeUser("Gus", { guest: true });
    const response = await exports.default.fetch(`${API}/v1/session`, { headers: { Origin: SITE, Cookie: guest.cookie } });
    expect(response.headers.get("Set-Cookie")).toBeNull();
  });
});

describe("per-address limit", () => {
  it("slows down one IP address trying codes quickly", async () => {
    const email = uniqueEmail();
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      statuses.push((await post("/v1/auth/code/verify", { email, code: "123456" }, undefined, "198.51.100.9")).status);
    }
    expect(statuses.slice(0, 10).every((status) => status === 400)).toBe(true);
    expect(statuses.slice(10)).toEqual([429, 429]);
    // Someone else is unaffected.
    expect((await post("/v1/auth/code/verify", { email, code: "123456" })).status).toBe(400);
  }, 30_000);
});
