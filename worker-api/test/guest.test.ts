import { env, exports } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyTicket } from "../../shared-protocol/src";

const SITE = "http://localhost:3000";
const API = "https://api.tinyfloor.com";

/** Turnstile's siteverify is the only outbound call; answer it here instead of the network. */
function mockTurnstile(success: boolean) {
  const realFetch = globalThis.fetch;
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url.startsWith("https://challenges.cloudflare.com/")) return Response.json({ success });
    return realFetch(input, init);
  });
}

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return exports.default.fetch(`${API}${path}`, {
    method: "POST",
    headers: { Origin: SITE, "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function becomeGuest(name = "Ava", character = "Lucy") {
  mockTurnstile(true);
  const response = await post("/v1/auth/guest", { name, character, turnstileToken: "token" });
  expect(response.status).toBe(201);
  const cookie = response.headers.get("Set-Cookie")!.split(";")[0];
  return { response, cookie };
}

afterEach(() => vi.restoreAllMocks());

describe("guest sessions", () => {
  it("creates a guest with a session cookie and remembers them", async () => {
    const { response, cookie } = await becomeGuest("  Ava   Stone ", "Lucy");
    expect(response.headers.get("Set-Cookie")).toMatch(/HttpOnly; Secure; SameSite=Lax; Max-Age=604800/);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(SITE);
    const { user } = await response.json<{ user: { displayName: string; guest: boolean } }>();
    expect(user).toMatchObject({ displayName: "Ava Stone", character: "Lucy", guest: true });

    const session = await exports.default.fetch(`${API}/v1/session`, { headers: { Cookie: cookie } });
    expect(await session.json()).toEqual({ user });
  });

  it("stores only a hash of the session token", async () => {
    const { cookie } = await becomeGuest();
    const token = cookie.split("=")[1];
    const stored = await env.DB.prepare("SELECT COUNT(*) AS n FROM sessions WHERE id = ?").bind(token).first<{ n: number }>();
    expect(stored?.n).toBe(0);
  });

  it("falls back to the default character and requires a name", async () => {
    mockTurnstile(true);
    const unknown = await post("/v1/auth/guest", { name: "Ben", character: "Gandalf", turnstileToken: "t" });
    expect((await unknown.json<{ user: { character: string } }>()).user.character).toBe("Adam");

    const nameless = await post("/v1/auth/guest", { name: "   ", turnstileToken: "t" });
    expect(nameless.status).toBe(400);
  });

  it("refuses a failed Turnstile check without creating anyone", async () => {
    mockTurnstile(false);
    const before = await env.DB.prepare("SELECT COUNT(*) AS n FROM users").first<{ n: number }>();
    const response = await post("/v1/auth/guest", { name: "Bot", turnstileToken: "bad" });
    expect(response.status).toBe(403);
    const after = await env.DB.prepare("SELECT COUNT(*) AS n FROM users").first<{ n: number }>();
    expect(after?.n).toBe(before?.n);
  });

  it("refuses writes from other sites or without JSON", async () => {
    const foreign = await post("/v1/auth/guest", { name: "Eve" }, { Origin: "https://evil.example" });
    expect(foreign.status).toBe(403);

    const form = await exports.default.fetch(`${API}/v1/auth/guest`, {
      method: "POST",
      headers: { Origin: SITE, "Content-Type": "application/x-www-form-urlencoded" },
      body: "name=Eve",
    });
    expect(form.status).toBe(415);
  });

  it("logs out", async () => {
    const { cookie } = await becomeGuest();
    const logout = await post("/v1/auth/logout", {}, { Cookie: cookie });
    expect(logout.headers.get("Set-Cookie")).toMatch(/tf_session=;.*Max-Age=0/);

    const session = await exports.default.fetch(`${API}/v1/session`, { headers: { Cookie: cookie } });
    expect(await session.json()).toEqual({ user: null });
  });
});

describe("lobby tickets", () => {
  it("gives a guest a lobby ticket", async () => {
    const { cookie } = await becomeGuest("Ava", "Molly");
    const response = await post("/v1/lobby/ticket", {}, { Cookie: cookie });
    expect(response.status).toBe(200);
    const { ticket, url } = await response.json<{ ticket: string; url: string }>();
    expect(url).toBe("ws://localhost:8788/lobby");
    expect(await verifyTicket(ticket, env.TICKET_SECRET)).toMatchObject({
      room: "lobby",
      name: "Ava",
      character: "Molly",
      role: "guest",
      cap: 20,
    });
  });

  it("needs a session", async () => {
    const response = await post("/v1/lobby/ticket", {});
    expect(response.status).toBe(401);
  });
});
