import { runInDurableObject } from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { FLOOR, deskArrival, deskSeats, seatTile } from "shared-protocol";
import { Desks } from "../src/desks";
import { Client, settle, uniqueRoom } from "./client";

const DESK_SEATS = deskSeats();
const DESK = DESK_SEATS[0];
const OTHER_DESK = DESK_SEATS[1];
const MEETING_CHAIR = FLOOR.seats.find((seat) => seat.zone === "meeting")!.id;
/** The old floor's desks (48 tiles wide, before Campus), as claims on them were stored. */
const OLD_WIDTH = 48;
const OLD_DESKS = [358, 364, 501, 508, 611, 618, 755, 761, 934, 940, 1079, 1085, 1189, 1194, 1332, 1338];
/** Where an old claim was, as a place on Campus: the same part of the office. */
const onCampus = (old: number) => ({
  x: ((old % OLD_WIDTH) / OLD_WIDTH) * FLOOR.shell.size[0],
  y: (Math.floor(old / OLD_WIDTH) / 32) * FLOOR.shell.size[1],
});
const away = (seat: number, at: { x: number; y: number }) => Math.hypot(seatTile(seat).x - at.x, seatTile(seat).y - at.y);

describe("desks", () => {
  it("lets a member make a desk theirs, and tells everyone", async () => {
    const room = uniqueRoom();
    const ava = await Client.open(room, { sub: "ava", name: "Ava" });
    expect((await ava.next("welcome")).desks).toEqual([]);
    const ben = await Client.open(room, { sub: "ben", name: "Ben" });
    await ben.next("welcome");

    ava.send({ t: "desk_claim", seat: DESK });
    expect((await ben.next("desks")).desks).toEqual([{ seat: DESK, userId: "ava", name: "Ava" }]);

    // One desk each: moving lets the first one go.
    ben.messages.length = 0;
    ava.send({ t: "desk_claim", seat: OTHER_DESK });
    expect((await ben.next("desks")).desks).toEqual([{ seat: OTHER_DESK, userId: "ava", name: "Ava" }]);
  });

  it("won't give away someone else's desk, a meeting chair, or any desk to a guest", async () => {
    const room = uniqueRoom();
    const ava = await Client.open(room, { sub: "ava" });
    await ava.next("welcome");
    ava.send({ t: "desk_claim", seat: DESK });
    await ava.next("desks");

    const ben = await Client.open(room, { sub: "ben" });
    await ben.next("welcome");
    ben.send({ t: "desk_claim", seat: DESK });
    ben.send({ t: "desk_claim", seat: MEETING_CHAIR });
    const guest = await Client.open(room, { sub: "gus", role: "guest" });
    await guest.next("welcome");
    guest.send({ t: "desk_claim", seat: OTHER_DESK });
    await settle();
    expect(ben.messages.some((message) => message.t === "desks")).toBe(false);

    // Nobody else sits at it either.
    const { x, y } = seatTile(DESK, FLOOR);
    ben.send({ t: "sit", seat: DESK, x, y });
    expect((await ben.next("sit_rejected")).seat).toBe(DESK);
  });

  it("puts you by your desk to walk in when you arrive, but not when you come back from a dropped connection", async () => {
    const room = uniqueRoom();
    const first = await Client.open(room, { sub: "ava" });
    await first.next("welcome");
    first.send({ t: "desk_claim", seat: DESK });
    await first.next("desks");
    first.socket.close(1000, "bye");
    await settle();

    const arriving = await Client.open(room, { sub: "ava" }, "&x=10&y=10&arrive=1");
    const welcome = await arriving.next("welcome");
    expect(welcome.self).toMatchObject({ seat: null, ...deskArrival(DESK, FLOOR) });
    expect(welcome.desks).toEqual([{ seat: DESK, userId: "ava", name: "Ava" }]);

    const back = await Client.open(room, { sub: "ava" }, "&x=10&y=10");
    expect((await back.next("welcome")).self).toMatchObject({ seat: null, x: 10, y: 10 });
  });

  it("puts a member without a desk by a free one, and a guest where they asked", async () => {
    const room = uniqueRoom();
    const ava = await Client.open(room, { sub: "ava" });
    await ava.next("welcome");
    ava.send({ t: "desk_claim", seat: DESK });
    await ava.next("desks");

    const ben = await Client.open(room, { sub: "ben" }, "&x=10&y=10&arrive=1");
    const at = (await ben.next("welcome")).self;
    const free = DESK_SEATS.filter((seat) => seat !== DESK).map((seat) => deskArrival(seat, FLOOR));
    expect(free).toContainEqual({ x: at.x, y: at.y });

    const gus = await Client.open(room, { sub: "gus", role: "guest" }, "&x=10&y=10&arrive=1");
    expect((await gus.next("welcome")).self).toMatchObject({ x: 10, y: 10 });
  });

  it("frees a desk when its owner leaves the office", async () => {
    const room = uniqueRoom();
    const ava = await Client.open(room, { sub: "ava" });
    await ava.next("welcome");
    ava.send({ t: "desk_claim", seat: DESK });
    await ava.next("desks");
    const ben = await Client.open(room, { sub: "ben" });
    await ben.next("welcome");

    await exports.RealtimeAdmin.removeMember(room, "ava");
    expect((await ben.next("desks")).desks).toEqual([]);
  });

  it("moves an office's claims from the old floor onto Campus's desks, earliest first, once", async () => {
    const room = uniqueRoom();
    const ava = await Client.open(room, { sub: "ava" });
    await ava.next("welcome");
    await runInDurableObject(env.ROOM.getByName(room), (_room, state) => {
      const sql = state.storage.sql;
      // An office as it was on the old floor: every desk claimed, the first ones first.
      sql.exec("DELETE FROM desks");
      OLD_DESKS.forEach((seat, n) => sql.exec("INSERT INTO desks (seat, user_id, name, claimed_at) VALUES (?, ?, ?, ?)", seat, `user-${n}`, `Person ${n}`, 1000 + n));
      const moved = new Desks(sql, true).list();

      // Everyone who can have a desk keeps one, each on a Campus desk, no two on one.
      expect(moved).toHaveLength(Math.min(OLD_DESKS.length, DESK_SEATS.length));
      expect(new Set(moved.map((desk) => desk.seat)).size).toBe(moved.length);
      for (const desk of moved) expect(DESK_SEATS).toContain(desk.seat);
      // The earliest claim got the desk nearest where it was; the latest, when there weren't enough, were let go.
      const nearest = [...DESK_SEATS].sort((a, b) => away(a, onCampus(OLD_DESKS[0])) - away(b, onCampus(OLD_DESKS[0])))[0];
      expect(moved.find((desk) => desk.userId === "user-0")?.seat).toBe(nearest);
      expect(moved.some((desk) => desk.userId === `user-${OLD_DESKS.length - 1}`)).toBe(OLD_DESKS.length <= DESK_SEATS.length);

      // On Campus, the room starting again leaves them where they are.
      expect(new Desks(sql).list()).toEqual(moved);
    });
  });

  it("converts an office still on the old floor as its room starts, and only then", async () => {
    const room = uniqueRoom();
    const ava = await Client.open(room, { sub: "ava" });
    await ava.next("welcome");
    const stub = env.ROOM.getByName(room);
    await runInDurableObject(stub, (_room, state) => {
      const sql = state.storage.sql;
      // As an office looked before Campus: its floor unsaid, a claim on an old desk, and a decorated old desk.
      sql.exec("DELETE FROM room_state WHERE key IN ('floor', 'floor_since')");
      sql.exec("INSERT INTO desks (seat, user_id, name, claimed_at) VALUES (?, 'old', 'Old', 1)", OLD_DESKS[0]);
      sql.exec("INSERT INTO pieces (key, desk, change, user_id, changed_at) VALUES ('lpadec/back-0:a', 'lpadec/back-0', '{}', 'old', 1)");
    });
    await runInDurableObject(stub, async (instance) => {
      // A room starts by reading its tables again.
      (instance as unknown as { createTables(): void }).createTables();
    });
    await runInDurableObject(stub, (_room, state) => {
      const sql = state.storage.sql;
      const seat = sql.exec<{ seat: number }>("SELECT seat FROM desks WHERE user_id = 'old'").toArray()[0]?.seat;
      expect(DESK_SEATS).toContain(seat);
      expect(sql.exec("SELECT key FROM pieces").toArray()).toEqual([]);
      expect(sql.exec<{ value: string }>("SELECT value FROM room_state WHERE key = 'floor'").toArray()[0]?.value).toBe(FLOOR.id);
    });
  });

  it("keeps the lobby free of desks", async () => {
    const ava = await Client.open("lobby", { sub: "ava" });
    expect((await ava.next("welcome")).desks).toEqual([]);
    ava.send({ t: "desk_claim", seat: DESK });
    await settle();
    expect(ava.messages.some((message) => message.t === "desks")).toBe(false);
  });
});
