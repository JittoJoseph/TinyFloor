import { env } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { call, makeUser, type TestUser } from "./helpers";

const CLIENT_ID = "test-client.apps.googleusercontent.com";
const MEET_SCOPE = "https://www.googleapis.com/auth/meetings.space.created";
let sequence = 0;

const jwt = (payload: Record<string, unknown>) => {
  const part = (value: unknown) =>
    btoa(JSON.stringify(value)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${part({ alg: "RS256" })}.${part(payload)}.signature`;
};

/** What the fake Google does next, and what it was asked. */
let google: {
  scope: string;
  refreshToken: string | null;
  refreshFails: boolean;
  openRefused: boolean;
  spaceStatus: number;
  live: Array<{ displayName: string; kind: "signedinUser" | "anonymousUser" }> | null;
  revoked: string[];
  spaces: unknown[];
  refreshes: number;
  sub: string;
  email: string;
};

beforeEach(() => {
  google = {
    scope: `openid email ${MEET_SCOPE}`,
    refreshToken: "refresh-1",
    refreshFails: false,
    openRefused: false,
    spaceStatus: 200,
    live: null,
    revoked: [],
    spaces: [],
    refreshes: 0,
    sub: "google-meet-person",
    email: "Meetings@Example.com",
  };
  const realFetch = globalThis.fetch;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const n = `${sequence++}`;
    if (url.href === "https://oauth2.googleapis.com/token") {
      const sent = new URLSearchParams(String(init?.body));
      if (sent.get("grant_type") === "refresh_token") {
        google.refreshes++;
        if (google.refreshFails) return Response.json({ error: "invalid_grant" }, { status: 400 });
        return Response.json({ access_token: `access-${n}`, expires_in: 3600, scope: MEET_SCOPE });
      }
      return Response.json({
        access_token: `access-${n}`,
        expires_in: 3600,
        scope: google.scope,
        ...(google.refreshToken ? { refresh_token: google.refreshToken } : {}),
        id_token: jwt({
          iss: "https://accounts.google.com",
          aud: CLIENT_ID,
          exp: Math.floor(Date.now() / 1000) + 3600,
          sub: google.sub,
          email: google.email,
          email_verified: true,
        }),
      });
    }
    if (url.origin === "https://oauth2.googleapis.com" && url.pathname === "/revoke") {
      google.revoked.push(new URLSearchParams(String(init?.body)).get("token") ?? "");
      return new Response("{}");
    }
    if (url.origin === "https://meet.googleapis.com") {
      if (url.pathname === "/v2/spaces" && init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        google.spaces.push(body);
        if (google.openRefused && body.config?.accessType === "OPEN") return Response.json({ error: { status: "INVALID_ARGUMENT" } }, { status: 400 });
        if (google.spaceStatus !== 200) return Response.json({ error: { status: "PERMISSION_DENIED" } }, { status: google.spaceStatus });
        return Response.json({ name: `spaces/space${n}`, meetingUri: `https://meet.google.com/abc-${n}` });
      }
      if (url.pathname === "/v2/conferenceRecords") {
        return Response.json(google.live ? { conferenceRecords: [{ name: "conferenceRecords/c1" }] } : {});
      }
      if (url.pathname === "/v2/conferenceRecords/c1/participants") {
        return Response.json({
          participants: (google.live ?? []).map((one) => ({ [one.kind]: { displayName: one.displayName }, earliestStartTime: "2026-09-27T10:00:00Z" })),
        });
      }
    }
    return realFetch(input, init);
  });
});
afterEach(() => vi.restoreAllMocks());

async function officeOf(admin: TestUser) {
  const { body } = await call<{ office: { id: string } }>(admin, "POST", "/v1/offices", { name: "Studio" });
  return body.office.id;
}

const allow = (user: TestUser) => call<{ google: { granted: boolean; email: string | null } }>(user, "POST", "/v1/me/google/meet", { code: "c" });

describe("Google Meet permission", () => {
  it("keeps the grant, sealed, and says which Google account it is", async () => {
    const ada = await makeUser("Ada");
    const { status, body } = await allow(ada);
    expect(status).toBe(200);
    expect(body.google).toEqual({ granted: true, email: "meetings@example.com" });

    const row = await env.DB.prepare("SELECT refresh_token FROM google_grants WHERE user_id = ?").bind(ada.id).first<{ refresh_token: string }>();
    expect(row?.refresh_token).not.toContain("refresh-1");
    expect((await call(ada, "GET", "/v1/me/google/meet")).body).toEqual({ google: { granted: true, email: "meetings@example.com" } });
  });

  it("refuses when the Meet box was unticked on Google's screen", async () => {
    const ada = await makeUser("Ada");
    google.scope = "openid email";
    const { status, body } = await allow(ada);
    expect(status).toBe(403);
    expect(body).toMatchObject({ error: { code: "meet_not_granted" } });
  });

  it("drops a grant Google gave no refresh token for, so the next popup asks afresh", async () => {
    const ada = await makeUser("Ada");
    google.refreshToken = null;
    const { status, body } = await allow(ada);
    expect(status).toBe(409);
    expect(body).toMatchObject({ error: { code: "meet_permission_reset" } });
    expect(google.revoked).toHaveLength(1);
  });

  it("keeps the refresh token it has when the same account agrees again", async () => {
    const ada = await makeUser("Ada");
    await allow(ada);
    google.refreshToken = null;
    expect((await allow(ada)).status).toBe(200);
  });

  it("takes the permission back at Google too", async () => {
    const ada = await makeUser("Ada");
    await allow(ada);
    const { body } = await call(ada, "DELETE", "/v1/me/google/meet");
    expect(body).toEqual({ google: { granted: false, email: null } });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(google.revoked).toEqual(["refresh-1"]);
  });
});

describe("an office's meeting room", () => {
  it("asks an admin without a grant to allow Google Meet first", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    const { status, body } = await call(ada, "POST", `/v1/offices/${officeId}/meeting`);
    expect(status).toBe(409);
    expect(body).toMatchObject({ error: { code: "meet_permission_needed" } });
  });

  it("makes an open Meet space as the admin, once", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    await allow(ada);

    const made = await call<{ room: { uri: string; createdBy: { displayName: string } } }>(ada, "POST", `/v1/offices/${officeId}/meeting`);
    expect(made.status).toBe(201);
    expect(made.body.room.uri).toMatch(/^https:\/\/meet\.google\.com\//);
    expect(made.body.room.createdBy.displayName).toBe("Ada");
    expect(google.spaces).toEqual([{ config: { accessType: "OPEN" } }]);

    const again = await call<{ room: { uri: string } }>(ada, "POST", `/v1/offices/${officeId}/meeting`);
    expect(again.body.room.uri).toBe(made.body.room.uri);
    expect(google.spaces).toHaveLength(1);
  });

  it("falls back to Google's default access when OPEN is refused", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    await allow(ada);
    google.openRefused = true;
    expect((await call(ada, "POST", `/v1/offices/${officeId}/meeting`)).status).toBe(201);
    expect(google.spaces).toEqual([{ config: { accessType: "OPEN" } }, {}]);
  });

  it("asks again when Google has taken the permission away", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    await allow(ada);
    await env.DB.prepare("UPDATE google_grants SET access_expires_at = 0 WHERE user_id = ?").bind(ada.id).run();
    google.refreshFails = true;

    const { status, body } = await call(ada, "POST", `/v1/offices/${officeId}/meeting`);
    expect(status).toBe(409);
    expect(body).toMatchObject({ error: { code: "meet_permission_needed" } });
    expect((await call(ada, "GET", "/v1/me/google/meet")).body).toEqual({ google: { granted: false, email: null } });
  });

  it("asks again when Meet refuses the token", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    await allow(ada);
    google.spaceStatus = 403;
    expect((await call(ada, "POST", `/v1/offices/${officeId}/meeting`)).body).toMatchObject({ error: { code: "meet_permission_needed" } });
  });

  it("only lets an admin make the room", async () => {
    const ada = await makeUser("Ada");
    const bo = await makeUser("Bo");
    const officeId = await officeOf(ada);
    await env.DB.prepare("INSERT INTO memberships (office_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)")
      .bind(officeId, bo.id, Date.now())
      .run();
    await allow(bo);
    expect((await call(bo, "POST", `/v1/offices/${officeId}/meeting`)).status).toBe(403);
  });

  it("shows members who is in the room, read with the admin's grant", async () => {
    const ada = await makeUser("Ada");
    const bo = await makeUser("Bo");
    const officeId = await officeOf(ada);
    await env.DB.prepare("INSERT INTO memberships (office_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)")
      .bind(officeId, bo.id, Date.now())
      .run();
    await allow(ada);
    await call(ada, "POST", `/v1/offices/${officeId}/meeting`);
    google.live = [
      { displayName: "Ada Park", kind: "signedinUser" },
      { displayName: "Client", kind: "anonymousUser" },
    ];

    const { body } = await call<{ room: unknown; live: unknown; google: unknown }>(bo, "GET", `/v1/offices/${officeId}/meeting`);
    expect(body.room).toMatchObject({ provider: "google_meet" });
    expect(body.google).toEqual({ granted: false, email: null });
    expect(body.live).toEqual({
      status: "live",
      active: true,
      people: [
        { name: "Ada Park", kind: "signed_in", since: "2026-09-27T10:00:00Z" },
        { name: "Client", kind: "guest", since: "2026-09-27T10:00:00Z" },
      ],
    });
  });

  it("hides the room from people outside the office", async () => {
    const ada = await makeUser("Ada");
    const eve = await makeUser("Eve");
    const officeId = await officeOf(ada);
    expect((await call(eve, "GET", `/v1/offices/${officeId}/meeting`)).status).toBe(404);
  });

  it("says nobody is in a room with no conference running", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    await allow(ada);
    await call(ada, "POST", `/v1/offices/${officeId}/meeting`);
    const { body } = await call<{ live: unknown }>(ada, "GET", `/v1/offices/${officeId}/meeting`);
    expect(body.live).toEqual({ status: "live", active: false, people: [] });
  });

  it("stops reading the room with the grant of an admin who left the office", async () => {
    const ada = await makeUser("Ada");
    const bo = await makeUser("Bo");
    const officeId = await officeOf(bo);
    await env.DB.prepare("INSERT INTO memberships (office_id, user_id, role, joined_at) VALUES (?, ?, 'admin', ?)")
      .bind(officeId, ada.id, Date.now())
      .run();
    await allow(ada);
    await call(ada, "POST", `/v1/offices/${officeId}/meeting`);
    await env.DB.prepare("DELETE FROM memberships WHERE office_id = ? AND user_id = ?").bind(officeId, ada.id).run();
    google.live = [{ displayName: "Someone", kind: "signedinUser" }];
    await caches.default.delete(new Request(`https://meet-live.tinyfloor.internal/${officeId}`));

    const { body } = await call<{ room: { createdBy: { here: boolean } }; live: unknown }>(bo, "GET", `/v1/offices/${officeId}/meeting`);
    expect(body.live).toEqual({ status: "creator_gone" });
    expect(body.room.createdBy.here).toBe(false);
  });

  it("says when the admin who made the room took their permission back", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    await allow(ada);
    await call(ada, "POST", `/v1/offices/${officeId}/meeting`);
    await call(ada, "DELETE", "/v1/me/google/meet");
    await new Promise((resolve) => setTimeout(resolve, 20));

    const { body } = await call<{ live: unknown }>(ada, "GET", `/v1/offices/${officeId}/meeting`);
    expect(body.live).toEqual({ status: "creator_permission" });
  });

  it("lets an admin replace the room with a new one of their own", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    await allow(ada);
    const first = await call<{ room: { uri: string } }>(ada, "POST", `/v1/offices/${officeId}/meeting`);
    const second = await call<{ room: { uri: string } }>(ada, "POST", `/v1/offices/${officeId}/meeting`, { replace: true });
    expect(second.status).toBe(201);
    expect(second.body.room.uri).not.toBe(first.body.room.uri);
    expect(google.spaces).toHaveLength(2);
  });

  it("lets an admin remove the room", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    await allow(ada);
    await call(ada, "POST", `/v1/offices/${officeId}/meeting`);
    expect((await call(ada, "DELETE", `/v1/offices/${officeId}/meeting`)).status).toBe(200);
    expect((await call<{ room: unknown }>(ada, "GET", `/v1/offices/${officeId}/meeting`)).body.room).toBeNull();
  });
});

describe("switching Google accounts", () => {
  it("lets Google know we no longer hold the old account's grant", async () => {
    const ada = await makeUser("Ada");
    await allow(ada);
    google.sub = "another-google-account";
    google.email = "work@example.com";
    google.refreshToken = "refresh-2";
    const { body } = await allow(ada);
    expect(body.google).toEqual({ granted: true, email: "work@example.com" });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(google.revoked).toEqual(["refresh-1"]);
  });
});

describe("a grant sealed under an old key", () => {
  it("is dropped, and the admin asked again, rather than failing", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    await allow(ada);
    await env.DB.prepare("UPDATE google_grants SET refresh_token = 'bm90.c2VhbGVk', access_token = NULL WHERE user_id = ?").bind(ada.id).run();
    const { status, body } = await call(ada, "POST", `/v1/offices/${officeId}/meeting`);
    expect(status).toBe(409);
    expect(body).toMatchObject({ error: { code: "meet_permission_needed" } });
    expect((await call(ada, "GET", "/v1/me/google/meet")).body).toEqual({ google: { granted: false, email: null } });
  });
});
