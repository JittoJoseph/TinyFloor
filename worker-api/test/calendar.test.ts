import { env } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { call, makeUser } from "./helpers";

const SCOPE = "openid email https://www.googleapis.com/auth/calendar.events.readonly";

/** What Google answers next, and everything we asked it. */
let grant: Record<string, unknown> = {};
let refresh: Record<string, unknown> = {};
let refreshStatus = 200;
let events: unknown[] = [];
let asked: Array<{ url: string; body: string; auth: string | null }> = [];

const idToken = (payload: Record<string, unknown>) => `e30.${btoa(JSON.stringify(payload)).replace(/=+$/, "")}.sig`;

beforeEach(() => {
  asked = [];
  grant = { access_token: "access-1", refresh_token: "refresh-1", expires_in: 3600, scope: SCOPE, id_token: idToken({ email: "Ada@Example.com" }) };
  refresh = { access_token: "access-2", expires_in: 3600 };
  refreshStatus = 200;
  events = [];
  const realFetch = globalThis.fetch;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    const body = String(init?.body ?? "");
    const auth = new Headers(init?.headers).get("Authorization");
    if (url.startsWith("https://oauth2.googleapis.com/") || url.startsWith("https://www.googleapis.com/")) asked.push({ url, body, auth });
    if (url === "https://oauth2.googleapis.com/token") {
      const form = new URLSearchParams(body);
      return form.get("grant_type") === "refresh_token" ? Response.json(refresh, { status: refreshStatus }) : Response.json(grant);
    }
    if (url === "https://oauth2.googleapis.com/revoke") return new Response("");
    if (url.startsWith("https://www.googleapis.com/calendar/v3/calendars/primary/events")) return Response.json({ items: events });
    return realFetch(input, init);
  });
});
afterEach(() => vi.restoreAllMocks());

const window = () => {
  const now = Date.now();
  return `from=${now - 3_600_000}&to=${now + 20 * 3_600_000}`;
};
const at = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

describe("a Google Calendar, connected", () => {
  it("is connected with the popup's code, its tokens kept sealed, and read back as events", async () => {
    const ada = await makeUser("Ada");
    expect((await call(ada, "GET", `/v1/me/calendar?${window()}`)).body).toEqual({ calendar: null });

    const connected = await call(ada, "POST", "/v1/me/calendar", { code: "one-time" });
    expect(connected.status).toBe(201);
    expect(connected.body).toEqual({ calendar: { email: "ada@example.com", showTitles: false } });
    const row = await env.DB.prepare("SELECT refresh_token, access_token FROM calendar_links WHERE user_id = ?").bind(ada.id).first<{ refresh_token: string; access_token: string }>();
    expect(row!.refresh_token).not.toContain("refresh-1");
    expect(row!.access_token).not.toContain("access-1");

    events = [
      { id: "a", summary: "Design review", start: { dateTime: at(-10) }, end: { dateTime: at(20) }, hangoutLink: "https://meet.google.com/abc-defg-hij" },
      { id: "b", summary: "Lunch", start: { dateTime: at(60) }, end: { dateTime: at(90) }, transparency: "transparent" },
      { id: "c", summary: "Declined", start: { dateTime: at(30) }, end: { dateTime: at(45) }, attendees: [{ self: true, responseStatus: "declined" }] },
      { id: "d", summary: "Office", start: { date: "2026-11-13" }, end: { date: "2026-11-14" }, eventType: "workingLocation" },
      { id: "e", summary: "1:1", start: { dateTime: at(120) }, end: { dateTime: at(150) }, visibility: "private", location: "Zoom https://zoom.us/j/123 room" },
    ];
    const { body } = await call<{ calendar: { events: Array<Record<string, unknown>> } }>(ada, "GET", `/v1/me/calendar?${window()}`);
    expect(body.calendar.events.map((one) => one.id)).toEqual(["a", "b", "e"]);
    expect(body.calendar.events[0]).toMatchObject({ title: "Design review", busy: true, private: false, allDay: false, link: "https://meet.google.com/abc-defg-hij" });
    expect(body.calendar.events[1]).toMatchObject({ busy: false });
    expect(body.calendar.events[2]).toMatchObject({ private: true, link: "https://zoom.us/j/123" });
    // The kept access token was used, opened again: no new one asked for.
    expect(asked.filter((one) => one.url.includes("/events")).map((one) => one.auth)).toEqual(["Bearer access-1"]);
  });

  it("asks again for one Google didn't let it see, or didn't give lasting access to", async () => {
    const ada = await makeUser("Ada");
    grant = { ...grant, scope: "openid email" };
    expect((await call(ada, "POST", "/v1/me/calendar", { code: "x" })).status).toBe(403);
    grant = { ...grant, scope: SCOPE, refresh_token: undefined };
    expect((await call(ada, "POST", "/v1/me/calendar", { code: "x" })).status).toBe(409);
    // Either way the access it did give is taken back, so Google asks properly next time.
    expect(asked.filter((one) => one.url.endsWith("/revoke"))).toHaveLength(2);
    expect((await call(ada, "GET", `/v1/me/calendar?${window()}`)).body).toEqual({ calendar: null });
  });

  it("gets a new access token when the kept one has run out, and lets go of a link Google took back", async () => {
    const ada = await makeUser("Ada");
    await call(ada, "POST", "/v1/me/calendar", { code: "x" });
    await env.DB.prepare("UPDATE calendar_links SET access_until = 0 WHERE user_id = ?").bind(ada.id).run();
    await call(ada, "GET", `/v1/me/calendar?${window()}`);
    expect(asked.filter((one) => one.url.includes("/events")).at(-1)?.auth).toBe("Bearer access-2");
    expect(new URLSearchParams(asked.find((one) => one.body.includes("refresh_token"))!.body).get("refresh_token")).toBe("refresh-1");

    await env.DB.prepare("UPDATE calendar_links SET access_until = 0 WHERE user_id = ?").bind(ada.id).run();
    refresh = { error: "invalid_grant" };
    refreshStatus = 400;
    expect((await call(ada, "GET", `/v1/me/calendar?${window()}`)).body).toEqual({ calendar: null, lost: true });
    expect(await env.DB.prepare("SELECT 1 FROM calendar_links WHERE user_id = ?").bind(ada.id).first()).toBeNull();
  });

  it("shows titles only when asked to, and disconnects for good", async () => {
    const ada = await makeUser("Ada");
    expect((await call(ada, "PATCH", "/v1/me/calendar", { showTitles: true })).status).toBe(404);
    await call(ada, "POST", "/v1/me/calendar", { code: "x" });
    expect((await call(ada, "PATCH", "/v1/me/calendar", { showTitles: true })).status).toBe(200);
    expect((await call<{ calendar: { showTitles: boolean } }>(ada, "GET", `/v1/me/calendar?${window()}`)).body.calendar.showTitles).toBe(true);

    expect((await call(ada, "DELETE", "/v1/me/calendar")).status).toBe(200);
    expect(new URLSearchParams(asked.filter((one) => one.url.endsWith("/revoke")).at(-1)!.body).get("token")).toBe("refresh-1");
    expect((await call(ada, "GET", `/v1/me/calendar?${window()}`)).body).toEqual({ calendar: null });
  });

  it("is for accounts, and reads a day at most", async () => {
    const gus = await makeUser("Gus", { guest: true });
    expect((await call(gus, "POST", "/v1/me/calendar", { code: "x" })).status).toBe(403);
    const ada = await makeUser("Ada");
    await call(ada, "POST", "/v1/me/calendar", { code: "x" });
    expect((await call(ada, "GET", `/v1/me/calendar?from=0&to=${5 * 86_400_000}`)).status).toBe(400);
  });
});
