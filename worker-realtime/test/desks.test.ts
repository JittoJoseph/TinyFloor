import { runInDurableObject } from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { DESK_SEATS, FLOOR, deskArrival, seatTile } from "../../shared-protocol/src";
import { Desks } from "../src/desks";
import { Client, settle, uniqueRoom } from "./client";

const DESK = DESK_SEATS[0];
const OTHER_DESK = DESK_SEATS[1];
const MEETING_CHAIR = FLOOR.seats.find((seat) => seat.zone === "meeting")!.id;
/** The desks of the hand-made map the Startup template replaced (October 2026), as claims on them were stored. */
const OLD_DESKS = [404, 410, 548, 554, 658, 664, 802, 808, 981, 987, 1125, 1131, 1159, 1235, 1241, 1253, 1257, 1379, 1385];
const tilesApart = (a: number, b: number) => Math.hypot(seatTile(a).x - seatTile(b).x, seatTile(a).y - seatTile(b).y);

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
    const { x, y } = seatTile(DESK);
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
    expect(welcome.self).toMatchObject({ seat: null, ...deskArrival(DESK) });
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
    const free = DESK_SEATS.filter((seat) => seat !== DESK).map((seat) => deskArrival(seat));
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

  it("moves claims on desks the floor doesn't have to the nearest free ones, earliest first", async () => {
    const room = uniqueRoom();
    const ava = await Client.open(room, { sub: "ava" });
    await ava.next("welcome");
    await runInDurableObject(env.ROOM.getByName(room), (_room, state) => {
      const sql = state.storage.sql;
      // An office as it was on the hand-made map: every old desk claimed, the first ones first.
      OLD_DESKS.forEach((seat, n) => sql.exec("INSERT INTO desks (seat, user_id, name, claimed_at) VALUES (?, ?, ?, ?)", seat, `user-${n}`, `Person ${n}`, 1000 + n));
      const moved = new Desks(sql).list();

      // Everyone who can have a desk keeps one, each on a desk of the new floor, no two on one.
      expect(moved).toHaveLength(Math.min(OLD_DESKS.length, DESK_SEATS.length));
      expect(new Set(moved.map((desk) => desk.seat)).size).toBe(moved.length);
      for (const desk of moved) expect(DESK_SEATS).toContain(desk.seat);
      // The earliest claim got the desk nearest its old one; the latest, when there weren't enough, were let go.
      const nearest = [...DESK_SEATS].sort((a, b) => tilesApart(a, OLD_DESKS[0]) - tilesApart(b, OLD_DESKS[0]))[0];
      expect(moved.find((desk) => desk.userId === "user-0")?.seat).toBe(nearest);
      expect(moved.some((desk) => desk.userId === `user-${OLD_DESKS.length - 1}`)).toBe(OLD_DESKS.length <= DESK_SEATS.length);

      // With every claim on a desk, the room starting again leaves them where they are.
      expect(new Desks(sql).list()).toEqual(moved);
      // A claim on a desk it has stays put while one beside it moves round it.
      sql.exec("DELETE FROM desks");
      sql.exec("INSERT INTO desks (seat, user_id, name, claimed_at) VALUES (?, 'stays', 'Stays', 2), (?, 'moves', 'Moves', 1)", nearest, OLD_DESKS[0]);
      const after = new Desks(sql).list();
      expect(after.find((desk) => desk.userId === "stays")?.seat).toBe(nearest);
      expect(after.find((desk) => desk.userId === "moves")?.seat).not.toBe(nearest);
      expect(DESK_SEATS).toContain(after.find((desk) => desk.userId === "moves")?.seat);
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
