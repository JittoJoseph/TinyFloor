import { afterEach, describe, expect, it, vi } from "vitest";
import { call, makeUser } from "./helpers";

afterEach(() => vi.restoreAllMocks());

describe("ice servers", () => {
  it("fetches TURN credentials from Cloudflare and reuses them for the same person", async () => {
    const realFetch = globalThis.fetch;
    const turnCalls: { url: string; authorization: string | null; body: unknown }[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const request = new Request(input, init);
      if (!request.url.startsWith("https://rtc.live.cloudflare.com/")) return realFetch(input, init);
      turnCalls.push({ url: request.url, authorization: request.headers.get("Authorization"), body: await request.json() });
      return Response.json({
        iceServers: [{ urls: ["turns:turn.cloudflare.com:443?transport=tcp"], username: "u", credential: "c" }],
      });
    });

    const user = await makeUser("Ava", { guest: true });
    const first = await call<{ iceServers: unknown[]; expiresAt: number }>(user, "POST", "/v1/calls/ice-servers");
    expect(first.status).toBe(200);
    expect(first.body.iceServers).toHaveLength(1);
    expect(turnCalls[0].url).toBe(
      "https://rtc.live.cloudflare.com/v1/turn/keys/test-turn-key/credentials/generate-ice-servers",
    );
    expect(turnCalls[0].authorization).toBe("Bearer test-turn-token");
    expect(turnCalls[0].body).toEqual({ ttl: 14400 });

    const second = await call(user, "POST", "/v1/calls/ice-servers");
    expect(second.body).toEqual(first.body);
    expect(turnCalls).toHaveLength(1);
  });

  it("needs a session", async () => {
    expect((await call(null, "POST", "/v1/calls/ice-servers")).status).toBe(401);
  });
});
