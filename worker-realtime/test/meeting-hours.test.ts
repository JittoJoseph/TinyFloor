import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Client, uniqueRoom } from "./client";

async function pair(room = uniqueRoom(), hours?: number) {
  const claims = hours === undefined ? {} : { hours };
  const ava = await Client.open(room, { name: "Ava", ...claims }, "&x=10&y=10");
  const welcome = await ava.next("welcome");
  const ben = await Client.open(room, { name: "Ben", ...claims }, "&x=12&y=10");
  const benId = (await ben.next("welcome")).self.id;
  await ava.next("player_joined");
  return { room, ava, avaId: welcome.self.id, ben, benId, welcome };
}

describe("meeting hours", () => {
  beforeEach(() => {
    let sessions = 0;
    const realFetch = globalThis.fetch;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const request = new Request(input, init);
      if (!request.url.startsWith("https://rtc.live.cloudflare.com/")) return realFetch(input, init);
      const path = new URL(request.url).pathname.replace("/v1/apps/test-app", "");
      const body = request.method === "GET" ? null : ((await request.json().catch(() => null)) as Record<string, unknown> | null);
      if (path === "/sessions/new") return Response.json({ sessionId: `session-${++sessions}` }, { status: 201 });
      if (path.endsWith("/tracks/new")) {
        const tracks = (body?.tracks as { location: string }[]).map((track, index) => ({ ...track, mid: String(index) }));
        const remote = tracks.some((track) => track.location === "remote");
        return Response.json({
          requiresImmediateRenegotiation: remote,
          sessionDescription: { type: remote ? "offer" : "answer", sdp: remote ? "sfu-offer" : "sfu-answer" },
          tracks,
        });
      }
      return Response.json({ requiresImmediateRenegotiation: false, tracks: [] });
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it("tells everyone the office's hours when they walk in", async () => {
    const { welcome } = await pair(uniqueRoom(), 30);
    const now = new Date();
    expect(welcome.usage).toMatchObject({
      used: 0,
      allowance: 30 * 3600,
      live: 0,
      period: "month",
      paused: false,
      resetsAt: Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    });
  });

  it("counts a meeting only while two or more are in it", async () => {
    const { ava, ben } = await pair(uniqueRoom(), 30);
    ava.send({ t: "meeting_join", meeting: "main" });
    await ava.next("meeting_joined");
    ben.send({ t: "meeting_join", meeting: "main" });
    expect((await ava.next("meeting_usage")).usage).toMatchObject({ live: 1, paused: false });

    await new Promise((resolve) => setTimeout(resolve, 1100));
    ava.messages.length = 0;
    ben.send({ t: "meeting_leave" });
    const after = (await ava.next("meeting_usage")).usage;
    expect(after.live).toBe(0);
    expect(after.used).toBeGreaterThanOrEqual(1);
  });

  it("pauses video once the hours are used, and keeps the voices", async () => {
    // A plan of about two seconds, so the test doesn't wait a month.
    const { ava, avaId, ben } = await pair(uniqueRoom(), 0.0005);
    ava.send({ t: "meeting_join", meeting: "main" });
    await ava.next("meeting_joined");
    ben.send({ t: "meeting_join", meeting: "main" });
    await ben.next("meeting_joined");
    ava.send({ t: "sfu", op: "publish", sdp: "client-offer", tracks: [{ mid: "0", kind: "mic" }, { mid: "1", kind: "camera" }] });
    await ben.next("sfu"); // her tracks

    await new Promise((resolve) => setTimeout(resolve, 2200));
    ben.messages.length = 0;
    ben.send({ t: "sfu", op: "subscribe", tracks: [{ userId: avaId, kind: "camera", quality: "low" }] });
    expect(await ben.next("sfu")).toEqual({ t: "sfu", op: "error", code: "video_paused" });

    ben.messages.length = 0;
    ben.send({ t: "sfu", op: "subscribe", tracks: [{ userId: avaId, kind: "mic" }] });
    expect(await ben.next("sfu")).toMatchObject({ op: "offer", tracks: [{ userId: avaId, kind: "mic" }] });
  });

  it("gives each lobby copy two video hours a day", async () => {
    const lobby = await Client.open(`lobby-${1000 + Math.floor(Math.random() * 9000)}`, { name: "Visitor", role: "guest" });
    const { usage } = await lobby.next("welcome");
    expect(usage).toMatchObject({ allowance: 2 * 3600, period: "day", paused: false });
  });
});
