import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Client, settle, uniqueRoom } from "./client";

async function pair(room = uniqueRoom()) {
  const ava = await Client.open(room, { name: "Ava" }, "&x=10&y=10");
  const avaId = (await ava.next("welcome")).self.id;
  const ben = await Client.open(room, { name: "Ben" }, "&x=12&y=10");
  const benId = (await ben.next("welcome")).self.id;
  await ava.next("player_joined");
  return { room, ava, avaId, ben, benId };
}

describe("peer-to-peer call signalling", () => {
  it("relays to one person with the sender added", async () => {
    const { ava, avaId, ben, benId } = await pair();
    ava.send({ t: "call", kind: "signal", to: benId, data: { sdp: "offer" } });
    expect(await ben.next("call")).toEqual({ t: "call", kind: "signal", from: avaId, fromName: "Ava", data: { sdp: "offer" } });
  });

  it("ends the call when the other person isn't here", async () => {
    const { ava } = await pair();
    ava.send({ t: "call", kind: "invite", to: "nobody" });
    expect(await ava.next("call")).toEqual({ t: "call", kind: "end", from: "nobody", fromName: "" });
  });

  it("names an added person from the room's own record", async () => {
    const room = uniqueRoom();
    const { ava, ben, benId } = await pair(room);
    const cara = await Client.open(room, { name: "Cara" });
    const caraId = (await cara.next("welcome")).self.id;
    ava.send({ t: "call", kind: "add", to: benId, data: { id: caraId, name: "Impostor", offer: true } });
    expect((await ben.next("call")).data).toEqual({ id: caraId, name: "Cara", offer: true });
  });
});

describe("meeting tables through the SFU", () => {
  let sfuRequests: { method: string; path: string; body: Record<string, unknown> | null }[];

  beforeEach(() => {
    sfuRequests = [];
    let sessions = 0;
    const realFetch = globalThis.fetch;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const request = new Request(input, init);
      if (!request.url.startsWith("https://rtc.live.cloudflare.com/")) return realFetch(input, init);
      const path = new URL(request.url).pathname.replace("/v1/apps/test-app", "");
      const body = request.method === "GET" ? null : ((await request.json().catch(() => null)) as Record<string, unknown> | null);
      sfuRequests.push({ method: request.method, path, body });

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

  async function seated() {
    const { ava, avaId, ben, benId } = await pair();
    ava.send({ t: "sit", seat: 1, x: 11, y: 10, meeting: "table" });
    await ava.next("meeting_joined");
    ben.send({ t: "sit", seat: 2, x: 12, y: 10, meeting: "table" });
    await ben.next("meeting_joined");
    return { ava, avaId, ben, benId };
  }

  it("publishes tracks and tells the others at the table", async () => {
    const { ava, avaId, ben } = await seated();
    ava.send({ t: "sfu", op: "publish", sdp: "client-offer", tracks: [{ mid: "0", kind: "mic" }, { mid: "1", kind: "camera" }] });

    expect(await ava.next("sfu")).toEqual({ t: "sfu", op: "published", sdp: "sfu-answer" });
    expect(await ben.next("sfu")).toEqual({ t: "sfu", op: "tracks", userId: avaId, kinds: ["mic", "camera"] });
    expect(sfuRequests[0].path).toBe("/sessions/new");
    expect(sfuRequests[1]).toMatchObject({
      path: "/sessions/session-1/tracks/new",
      body: {
        sessionDescription: { type: "offer", sdp: "client-offer" },
        tracks: [
          { location: "local", mid: "0", trackName: "mic" },
          { location: "local", mid: "1", trackName: "camera" },
        ],
      },
    });
  });

  it("subscribes to another member's camera at the chosen layer, then renegotiates", async () => {
    const { ava, avaId, ben } = await seated();
    ava.send({ t: "sfu", op: "publish", sdp: "client-offer", tracks: [{ mid: "0", kind: "camera" }] });
    await ben.next("sfu");
    ben.messages.length = 0;

    ben.send({ t: "sfu", op: "subscribe", tracks: [{ userId: avaId, kind: "camera", layer: "q" }] });
    expect(await ben.next("sfu")).toEqual({
      t: "sfu",
      op: "offer",
      sdp: "sfu-offer",
      tracks: [{ userId: avaId, kind: "camera", mid: "0" }],
    });
    const subscribe = sfuRequests.find((request) => request.path === "/sessions/session-2/tracks/new");
    expect(subscribe?.body?.tracks).toEqual([
      {
        location: "remote",
        sessionId: "session-1",
        trackName: "camera",
        simulcast: { preferredRid: "q", priorityOrdering: "asciibetical", ridNotAvailable: "asciibetical" },
      },
    ]);

    ben.send({ t: "sfu", op: "answer", sdp: "client-answer" });
    ben.send({ t: "sfu", op: "layer", userId: avaId, mid: "0", layer: "f" });
    await vi.waitFor(() => {
      expect(sfuRequests).toContainEqual({
        method: "PUT",
        path: "/sessions/session-2/renegotiate",
        body: { sessionDescription: { type: "answer", sdp: "client-answer" } },
      });
      expect(sfuRequests.find((request) => request.path.endsWith("/tracks/update"))?.body?.tracks).toEqual([
        expect.objectContaining({ sessionId: "session-1", mid: "0", simulcast: expect.objectContaining({ preferredRid: "f" }) }),
      ]);
    }, { timeout: 5000 });
  });

  it("won't let someone watch a table they aren't at", async () => {
    const room = uniqueRoom();
    const ava = await Client.open(room, { name: "Ava" });
    const avaId = (await ava.next("welcome")).self.id;
    const eve = await Client.open(room, { name: "Eve" });
    await eve.next("welcome");
    ava.send({ t: "sit", seat: 1, x: 11, y: 10, meeting: "table" });
    await ava.next("meeting_joined");
    ava.send({ t: "sfu", op: "publish", sdp: "o", tracks: [{ mid: "0", kind: "camera" }] });
    await ava.next("sfu");

    eve.send({ t: "sfu", op: "subscribe", tracks: [{ userId: avaId, kind: "camera" }] });
    expect(await eve.next("sfu")).toEqual({ t: "sfu", op: "error", code: "not_in_meeting" });

    eve.send({ t: "sit", seat: 5, x: 12, y: 10, meeting: "other-table" });
    await eve.next("meeting_joined");
    eve.messages.length = 0;
    eve.send({ t: "sfu", op: "subscribe", tracks: [{ userId: avaId, kind: "camera" }] });
    expect(await eve.next("sfu")).toEqual({ t: "sfu", op: "error", code: "no_tracks" });
  });

  it("tells a newcomer what is already published at the table", async () => {
    const room = uniqueRoom();
    const ava = await Client.open(room, { name: "Ava" });
    const avaId = (await ava.next("welcome")).self.id;
    ava.send({ t: "sit", seat: 1, x: 11, y: 10, meeting: "table" });
    await ava.next("meeting_joined");
    ava.send({ t: "sfu", op: "publish", sdp: "o", tracks: [{ mid: "0", kind: "mic" }] });
    await ava.next("sfu");

    const ben = await Client.open(room, { name: "Ben" });
    await ben.next("welcome");
    ben.send({ t: "sit", seat: 2, x: 12, y: 10, meeting: "table" });
    expect(await ben.next("sfu")).toEqual({ t: "sfu", op: "tracks", userId: avaId, kinds: ["mic"] });
  });

  it("shares who has their mic, camera and screen on, including with newcomers", async () => {
    const room = uniqueRoom();
    const ava = await Client.open(room, { name: "Ava" });
    const avaId = (await ava.next("welcome")).self.id;
    ava.send({ t: "sit", seat: 1, x: 11, y: 10, meeting: "table" });
    await ava.next("meeting_joined");
    const ben = await Client.open(room, { name: "Ben" });
    await ben.next("welcome");
    ben.send({ t: "sit", seat: 2, x: 12, y: 10, meeting: "table" });
    await ben.next("meeting_joined");

    ava.send({ t: "sfu", op: "media", mic: true, camera: false, screen: false });
    expect(await ben.next("sfu")).toEqual({ t: "sfu", op: "media", userId: avaId, mic: true, camera: false, screen: false });

    const cara = await Client.open(room, { name: "Cara" });
    await cara.next("welcome");
    cara.send({ t: "sit", seat: 3, x: 13, y: 10, meeting: "table" });
    expect(await cara.next("sfu")).toEqual({ t: "sfu", op: "media", userId: avaId, mic: true, camera: false, screen: false });
  });

  it("closes a member's tracks when they leave the table", async () => {
    const { ava, avaId, ben } = await seated();
    ava.send({ t: "sfu", op: "publish", sdp: "o", tracks: [{ mid: "0", kind: "mic" }, { mid: "1", kind: "screen" }] });
    await ben.next("sfu");
    ben.messages.length = 0;

    ava.send({ t: "sfu", op: "unpublish", kinds: ["screen"] });
    expect(await ben.next("sfu")).toEqual({ t: "sfu", op: "untracks", userId: avaId, kinds: ["screen"] });
    ben.messages.length = 0;

    ava.send({ t: "stand", x: 11, y: 11 });
    expect(await ben.next("sfu")).toEqual({ t: "sfu", op: "gone", userId: avaId });
    await settle();
    const closes = sfuRequests.filter((request) => request.path.endsWith("/tracks/close"));
    expect(closes.map((request) => request.body)).toEqual([
      { tracks: [{ mid: "1" }], force: true },
      { tracks: [{ mid: "0" }], force: true },
    ]);
  });
});
