import { runInDurableObject } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { BOARD_MAX_STROKES } from "../../shared-protocol/src";
import { Board } from "../src/board";
import { describeWhere, discordPayload, Reporter } from "../src/discord";
import { Client, settle, uniqueRoom } from "./client";

async function pair(room = uniqueRoom()) {
  const ava = await Client.open(room, { name: "Ava" }, "&x=10&y=10");
  const avaId = (await ava.next("welcome")).self.id;
  const ben = await Client.open(room, { name: "Ben" }, "&x=12&y=10");
  const benId = (await ben.next("welcome")).self.id;
  await ava.next("player_joined");
  return { room, ava, avaId, ben, benId };
}

describe("seats", () => {
  it("sits, shows the seat to newcomers, and stands", async () => {
    const { room, ava, avaId, ben } = await pair();

    ava.send({ t: "sit", seat: 7, x: 11, y: 10 });
    expect(await ben.next("sat")).toEqual({ t: "sat", id: avaId, seat: 7, x: 11, y: 10 });

    const cara = await Client.open(room);
    const welcome = await cara.next("welcome");
    expect(welcome.players.find((player) => player.id === avaId)).toMatchObject({ seat: 7, x: 11, y: 10 });

    ava.send({ t: "stand", x: 11, y: 11 });
    expect(await ben.next("stood")).toEqual({ t: "stood", id: avaId });
  });

  it("refuses a taken seat", async () => {
    const { ava, ben } = await pair();
    ava.send({ t: "sit", seat: 3, x: 11, y: 10 });
    await ben.next("sat");

    ben.send({ t: "sit", seat: 3, x: 11, y: 10 });
    expect(await ben.next("sit_rejected")).toEqual({ t: "sit_rejected", seat: 3 });
  });

  it("leaves the seat when walking off", async () => {
    const { ava, avaId, ben } = await pair();
    ava.send({ t: "sit", seat: 1, x: 11, y: 10 });
    await ben.next("sat");

    ava.send({ t: "move", x: 12, y: 11 });
    expect(await ben.next("stood")).toEqual({ t: "stood", id: avaId });
  });
});

describe("meetings", () => {
  it("joins a table's meeting and tells the others at it", async () => {
    const { ava, avaId, ben, benId } = await pair();

    ava.send({ t: "sit", seat: 1, x: 11, y: 10, meeting: "table-a" });
    expect(await ava.next("meeting_joined")).toEqual({ t: "meeting_joined", meeting: "table-a", members: [] });

    ben.send({ t: "sit", seat: 2, x: 12, y: 10, meeting: "table-a" });
    expect(await ben.next("meeting_joined")).toEqual({
      t: "meeting_joined",
      meeting: "table-a",
      members: [{ id: avaId, name: "Ava" }],
    });
    expect(await ava.next("meeting_member_joined")).toEqual({ t: "meeting_member_joined", id: benId, name: "Ben" });

    ben.send({ t: "stand", x: 12, y: 11 });
    expect(await ava.next("meeting_member_left")).toEqual({ t: "meeting_member_left", id: benId });
  });

  it("keeps meetings at other tables apart", async () => {
    const { ava, ben } = await pair();
    ava.send({ t: "sit", seat: 1, x: 11, y: 10, meeting: "table-a" });
    await ava.next("meeting_joined");
    ben.send({ t: "sit", seat: 9, x: 12, y: 10, meeting: "table-b" });
    expect((await ben.next("meeting_joined")).members).toEqual([]);
    await settle();
    expect(ava.messages.some((message) => message.t === "meeting_member_joined")).toBe(false);
  });

  it("leaves the meeting when disconnecting", async () => {
    const { ava, ben, benId } = await pair();
    ava.send({ t: "sit", seat: 1, x: 11, y: 10, meeting: "table-a" });
    await ava.next("meeting_joined");
    ben.send({ t: "sit", seat: 2, x: 12, y: 10, meeting: "table-a" });
    await ava.next("meeting_member_joined");

    ben.socket.close(1000, "bye");
    expect(await ava.next("meeting_member_left")).toEqual({ t: "meeting_member_left", id: benId });
    expect((await ava.next("player_left")).id).toBe(benId);
  });
});

describe("whiteboard", () => {
  it("draws in slices, syncs, and clears", async () => {
    const { room, ava, avaId, ben } = await pair();

    ava.send({ t: "board_draw", id: "s1", color: "#ff0000", size: 4, erase: false, points: [1, 2, 3, 4] });
    expect(await ben.next("board_draw")).toEqual({
      t: "board_draw",
      by: avaId,
      id: "s1",
      color: "#ff0000",
      size: 4,
      erase: false,
      points: [1, 2, 3, 4],
    });
    ava.send({ t: "board_draw", id: "s1", color: "#ff0000", size: 4, erase: false, points: [5, 6] });
    await settle();

    const cara = await Client.open(room);
    await cara.next("welcome");
    cara.send({ t: "board_sync" });
    expect((await cara.next("board_state")).strokes).toEqual([
      { id: "s1", color: "#ff0000", size: 4, erase: false, points: [1, 2, 3, 4, 5, 6] },
    ]);

    ben.send({ t: "board_clear" });
    expect(await cara.next("board_clear")).toEqual({ t: "board_clear", by: expect.any(String) });
    cara.messages.length = 0;
    cara.send({ t: "board_sync" });
    expect((await cara.next("board_state")).strokes).toEqual([]);
  });

  it("ignores broken strokes and cleans up odd colors and sizes", async () => {
    const { ava, ben } = await pair();
    ava.send({ t: "board_draw", id: "bad", color: "#000", size: 3, erase: false, points: [1, 2, 3] });
    ava.send({ t: "board_draw", id: "odd", color: "url(evil)", size: 999, erase: false, points: [1, 2] });
    const drawn = await ben.next("board_draw");
    expect(drawn).toMatchObject({ id: "odd", color: "#2c2c2c", size: 64 });
    await settle();
    expect(ben.messages.filter((message) => message.t === "board_draw")).toHaveLength(1);
  });

  it(`keeps at most ${BOARD_MAX_STROKES} strokes, dropping the oldest`, async () => {
    const { room, ava, ben } = await pair();
    await runInDurableObject(env.ROOM.getByName(room), (_, state) => {
      const board = new Board(state.storage.sql);
      for (let i = 0; i < BOARD_MAX_STROKES; i++) {
        board.append({ id: `s${i}`, color: "#000000", size: 2, erase: false, points: [i, i] });
      }
    });

    ava.send({ t: "board_draw", id: "newest", color: "#000000", size: 2, erase: false, points: [1, 1] });
    await ben.next("board_draw");
    ben.send({ t: "board_sync" });
    const { strokes } = await ben.next("board_state");
    expect(strokes).toHaveLength(BOARD_MAX_STROKES);
    expect(strokes[0].id).toBe("s1");
    expect(strokes.at(-1)?.id).toBe("newest");
  });
});

describe("jukebox", () => {
  it("shares what's playing and hands it to newcomers", async () => {
    const { room, ava, ben } = await pair();
    ava.send({ t: "music_set", track: 2, playing: true, offset: 12.5 });
    const music = await ben.next("music");
    expect(music).toMatchObject({ track: 2, playing: true, offset: 12.5 });
    expect((await ava.next("music")).startedAt).toBe(music.startedAt);

    const cara = await Client.open(room);
    expect((await cara.next("welcome")).music).toEqual({
      track: 2,
      playing: true,
      offset: 12.5,
      startedAt: music.startedAt,
    });
  });
});

describe("discord reports", () => {
  const join = (name: string) =>
    ({ kind: "lobby_join", name, character: "Adam", lobby: 1, where: { city: "Munich", region: "Bavaria", country: "DE" } }) as const;

  it("never lets a visitor ping anyone and mentions skipped events", () => {
    const payload = discordPayload(join("@everyone"), 3);
    expect(payload.allowed_mentions).toEqual({ parse: [] });
    expect(payload.embeds[0].footer?.text).toContain("3 more skipped");
  });

  it("says where someone is in words, not codes", () => {
    expect(describeWhere({ city: "Munich", region: "Bavaria", country: "DE" })).toBe("Munich, Bavaria, Germany");
    expect(describeWhere({ city: "Singapore", region: "Singapore", country: "SG" })).toBe("Singapore");
    expect(describeWhere({})).toBe("Somewhere unknown");
    const fields = discordPayload(join("Ada"), 0).embeds[0].fields;
    expect(fields).toContainEqual({ name: "From", value: "Munich, Bavaria, Germany", inline: true });
    expect(fields.some((field) => field.name === "Lobby")).toBe(false);
  });

  it("announces a new office", () => {
    const payload = discordPayload({ kind: "office_created", office: "Northwind", owner: "Ada", where: { country: "FR" } }, 0);
    expect(payload.embeds[0].title).toBe("New office: Northwind");
    expect(payload.embeds[0].fields).toContainEqual({ name: "From", value: "France", inline: true });
  });

  it("sends at most 20 events a minute", () => {
    const reporter = new Reporter("https://discord.example/webhook");
    const sends: unknown[] = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      sends.push(1);
      return new Response(null, { status: 204 });
    }) as typeof fetch;
    try {
      const now = 60_000 * 1000;
      for (let i = 0; i < 25; i++) reporter.report(join(`${i}`), now);
      expect(sends).toHaveLength(20);
      reporter.report(join("next minute"), now + 60_000);
      expect(sends).toHaveLength(21);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it("does nothing without a webhook", () => {
    expect(new Reporter("").report(join("A"))).toBeNull();
  });
});
