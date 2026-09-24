import { env, exports } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { call, makeUser, SITE } from "./helpers";

const API = "https://api.tinyfloor.com";
const CLIENT_ID = "test-client.apps.googleusercontent.com";
let sequence = 0;

/** What Google's token endpoint hands back for the next code, and what we sent it. */
let claims: Record<string, unknown> = {};
let sent: URLSearchParams | null = null;

const token = (payload: Record<string, unknown>) => {
  // As a JWT is: UTF-8, then base64url.
  const part = (value: unknown) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value))))
      .replace(/=+$/, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  return `${part({ alg: "RS256" })}.${part(payload)}.signature`;
};

function person(overrides: Record<string, unknown> = {}) {
  const n = `${Date.now()}${sequence++}`;
  return {
    iss: "https://accounts.google.com",
    aud: CLIENT_ID,
    exp: Math.floor(Date.now() / 1000) + 3600,
    sub: `google-${n}`,
    email: `Person${n}@Example.com`,
    email_verified: true,
    name: "Zoë Park",
    ...overrides,
  };
}

beforeEach(() => {
  const realFetch = globalThis.fetch;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url === "https://oauth2.googleapis.com/token") {
      sent = new URLSearchParams(String(init?.body));
      return Response.json({ id_token: token(claims), access_token: "unused" });
    }
    return realFetch(input, init);
  });
});
afterEach(() => vi.restoreAllMocks());

let addresses = 0;
async function google(cookie?: string) {
  const response = await exports.default.fetch(`${API}/v1/auth/google`, {
    method: "POST",
    headers: {
      Origin: SITE,
      "Content-Type": "application/json",
      "CF-Connecting-IP": `10.9.${(++addresses >> 8) & 255}.${addresses & 255}`,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify({ code: "one-time-code" }),
  });
  const setCookie = response.headers.get("Set-Cookie");
  return { status: response.status, body: (await response.json()) as Record<string, any>, cookie: setCookie?.split(";")[0] };
}

describe("sign in with Google", () => {
  it("trades the code with our secret for the popup's redirect URI", async () => {
    claims = person();
    await google();
    expect(sent?.get("code")).toBe("one-time-code");
    expect(sent?.get("client_id")).toBe(CLIENT_ID);
    expect(sent?.get("client_secret")).toBe("test-google-secret");
    expect(sent?.get("redirect_uri")).toBe("postmessage");
    expect(sent?.get("grant_type")).toBe("authorization_code");
  });

  it("makes an account named after the Google profile, with a verified email", async () => {
    claims = person();
    const result = await google();
    expect(result.status).toBe(201);
    expect(result.body).toMatchObject({ created: true, user: { email: String(claims.email).toLowerCase(), displayName: "Zoë Park", guest: false } });

    const row = await env.DB.prepare("SELECT google_sub, email_verified, password_hash FROM users WHERE id = ?")
      .bind(result.body.user.id)
      .first<{ google_sub: string; email_verified: number; password_hash: string | null }>();
    expect(row).toMatchObject({ google_sub: claims.sub, email_verified: 1, password_hash: null });

    const session = await call({ id: "", cookie: result.cookie! }, "GET", "/v1/session");
    expect(session.body.user).toMatchObject({ id: result.body.user.id, guest: false });
  });

  it("signs the same person into the same account the next time", async () => {
    claims = person();
    const first = await google();
    const again = await google();
    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({ created: false, user: { id: first.body.user.id } });
  });

  it("links Google to the account that already has the email", async () => {
    const email = `linked${Date.now()}@example.com`;
    const existing = await makeUser("Ada", { email });
    claims = person({ email });
    const result = await google();
    expect(result.body).toMatchObject({ created: false, user: { id: existing.id, displayName: "Ada" } });
    const row = await env.DB.prepare("SELECT google_sub FROM users WHERE id = ?").bind(existing.id).first<{ google_sub: string }>();
    expect(row?.google_sub).toBe(claims.sub);
  });

  it("refuses an email already linked to a different Google account", async () => {
    claims = person();
    await google();
    claims = { ...claims, sub: "someone-else" };
    const result = await google();
    expect(result.status).toBe(409);
    expect(result.body.error).toMatchObject({ code: "google_mismatch" });
  });

  it("turns a guest into an account, keeping their name and character", async () => {
    const guest = await makeUser("Gus", { guest: true });
    claims = person();
    const result = await google(guest.cookie);
    expect(result.body).toMatchObject({ created: true, user: { id: guest.id, displayName: "Gus", guest: false } });
    // The guest session made way for the account's.
    expect((await call(guest, "GET", "/v1/session")).body.user).toBeNull();
  });

  it("lets someone who came in with Google set a first password, and then sign in with it", async () => {
    claims = person();
    const made = await google();
    expect(made.body.user.password).toBe(false);
    const set = await exports.default.fetch(`${API}/v1/me/password`, {
      method: "POST",
      headers: { Origin: SITE, "Content-Type": "application/json", Cookie: made.cookie! },
      body: JSON.stringify({ newPassword: "a new password" }),
    });
    expect(set.status).toBe(200);
    const login = await exports.default.fetch(`${API}/v1/auth/login`, {
      method: "POST",
      headers: { Origin: SITE, "Content-Type": "application/json", "CF-Connecting-IP": "10.9.200.1" },
      body: JSON.stringify({ email: String(claims.email).toLowerCase(), password: "a new password" }),
    });
    expect(login.status).toBe(200);
    expect(((await login.json()) as { user: { password: boolean } }).user.password).toBe(true);
    // Two bcrypt runs, which take a while when every test file runs at once.
  }, 20_000);

  it("connects Google to an account that signed up with a password, once", async () => {
    const email = `connect${Date.now()}@example.com`;
    const ada = await makeUser("Ada", { email });
    claims = person({ email });
    const connected = await exports.default.fetch(`${API}/v1/me/google`, {
      method: "POST",
      headers: { Origin: SITE, "Content-Type": "application/json", Cookie: ada.cookie },
      body: JSON.stringify({ code: "one-time-code" }),
    });
    expect(connected.status).toBe(200);
    expect(((await connected.json()) as { user: { google: boolean } }).user.google).toBe(true);
    // Signing in with that Google account now lands in the same account.
    expect((await google()).body.user.id).toBe(ada.id);

    // Another account can't take the same Google account.
    const bo = await makeUser("Bo");
    const again = await exports.default.fetch(`${API}/v1/me/google`, {
      method: "POST",
      headers: { Origin: SITE, "Content-Type": "application/json", Cookie: bo.cookie },
      body: JSON.stringify({ code: "one-time-code" }),
    });
    expect(again.status).toBe(409);
  });

  it("refuses a token meant for another app, expired, or with an unverified email", async () => {
    for (const bad of [{ aud: "other.apps.googleusercontent.com" }, { exp: 1 }, { iss: "https://evil.example" }]) {
      claims = person(bad);
      expect((await google()).body.error).toMatchObject({ code: "google_failed" });
    }
    claims = person({ email_verified: false });
    const unverified = await google();
    expect(unverified.status).toBe(403);
    expect(unverified.body.error).toMatchObject({ code: "google_unverified" });
  });
});

describe("One Tap", () => {
  /** A key pair of our own standing in for Google's, published where Google publishes its keys. */
  let keys: CryptoKeyPair;
  const KID = "test-key";
  beforeEach(async () => {
    keys ??= (await crypto.subtle.generateKey(
      { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
      true,
      ["sign", "verify"],
    )) as CryptoKeyPair;
    const published = { ...(await crypto.subtle.exportKey("jwk", keys.publicKey)), kid: KID, alg: "RS256", use: "sig" };
    const mocked = vi.mocked(globalThis.fetch);
    const previous = mocked.getMockImplementation()!;
    mocked.mockImplementation(async (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url === "https://www.googleapis.com/oauth2/v3/certs") return Response.json({ keys: [published] });
      return previous(input, init);
    });
  });

  const b64url = (data: Uint8Array) => btoa(String.fromCharCode(...data)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const json = (value: unknown) => b64url(new TextEncoder().encode(JSON.stringify(value)));
  async function signed(payload: Record<string, unknown>) {
    const unsigned = `${json({ alg: "RS256", kid: KID, typ: "JWT" })}.${json(payload)}`;
    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", keys.privateKey, new TextEncoder().encode(unsigned));
    return `${unsigned}.${b64url(new Uint8Array(signature))}`;
  }
  async function tap(credential: string) {
    const response = await exports.default.fetch(`${API}/v1/auth/google`, {
      method: "POST",
      headers: { Origin: SITE, "Content-Type": "application/json", "CF-Connecting-IP": `10.10.${(++addresses >> 8) & 255}.${addresses & 255}` },
      body: JSON.stringify({ credential }),
    });
    return { status: response.status, body: (await response.json()) as Record<string, any> };
  }

  it("signs in with the ID token Google signed, making an account that still has to say who it is", async () => {
    const result = await tap(await signed(person()));
    expect(result.status).toBe(201);
    expect(result.body).toMatchObject({ created: true, user: { displayName: "Zoë Park", introduced: false } });
  });

  it("refuses a token whose signature doesn't check out, or that was issued to someone else", async () => {
    const token = await signed(person());
    const [head, , signature] = token.split(".");
    const forged = `${head}.${json(person({ email: "boss@example.com" }))}.${signature}`;
    expect((await tap(forged)).status).toBe(401);
    expect((await tap(await signed(person({ aud: "someone-else" })))).status).toBe(401);
    expect((await tap("not-a-token")).status).toBe(401);
  });
});
