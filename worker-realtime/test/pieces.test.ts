import { describe, expect, it } from "vitest";
import { FLOORS, deskOfSeat, fitsIn, spotKey, type PieceChange, type ServerMessage } from "../../shared-protocol/src";
import { Client, settle, uniqueRoom } from "./client";

/** The floor a room is on until a ticket says otherwise (a page that has never drawn one starts on another). */
const FLOOR = FLOORS.startup;

/** The next message of a kind, taken off the list, so the one after it is next. */
async function take<T extends ServerMessage["t"]>(client: Client, type: T) {
  const message = await client.next(type);
  client.messages.splice(client.messages.indexOf(message), 1);
  return message;
}

/** The room takes a few actions a second from anyone; these come one at a time. */
const pace = () => new Promise((resolve) => setTimeout(resolve, 260));

const [DESK, SPEC] = Object.entries(FLOOR.desks).find(([, desk]) => desk.side === "front")!;
const [OTHER] = Object.entries(FLOOR.desks).find(([key, desk]) => desk.side === "front" && key !== DESK)!;
const SEAT = SPEC.seat;
/** The desk's spots: one the floor filled, one it left empty (if it did), and its widest. */
const FILLED = SPEC.spots.find((spot) => FLOOR.pieces.some((piece) => piece.key === spotKey(DESK, spot.id)))!;
const EMPTY = SPEC.spots.find((spot) => spot !== FILLED && !FLOOR.pieces.some((piece) => piece.key === spotKey(DESK, spot.id)));
const NARROW = SPEC.spots.reduce((a, b) => (b.x[1] - b.x[0] < a.x[1] - a.x[0] ? b : a));
/** A thing that fits a spot, and one too wide for the narrowest. */
const fitting = (spot: (typeof SPEC.spots)[number]) => Object.keys(FLOOR.things).find((item) => fitsIn(DESK, spot, item, FLOOR) && item !== FLOOR.pieces.find((piece) => piece.key === spotKey(DESK, spot.id))?.item)!;
const TOO_WIDE = Object.keys(FLOOR.things).find((item) => FLOOR.things[item].facing !== "back" && !fitsIn(DESK, NARROW, item, FLOOR))!;
const FAR_THING = Object.keys(FLOOR.things).find((item) => FLOOR.things[item].facing === "back")!;

/** Ava in an office with her desk claimed, and Ben there to see. */
async function office() {
  const room = uniqueRoom();
  const ava = await Client.open(room, { sub: "ava", name: "Ava" });
  await ava.next("welcome");
  ava.send({ t: "desk_claim", seat: SEAT });
  await ava.next("desks");
  const ben = await Client.open(room, { sub: "ben", name: "Ben" });
  await ben.next("welcome");
  return { room, ava, ben };
}

describe("desk pieces", () => {
  it("lets you put a thing in a spot of your desk, and everyone sees it, then and later", async () => {
    const { room, ava, ben } = await office();
    const key = spotKey(DESK, FILLED.id);
    const change: PieceChange = { item: fitting(FILLED) };
    await pace();
    ava.send({ t: "piece", key, change });
    expect(await take(ben, "piece")).toMatchObject({ key, change, by: "ava" });

    const cara = await Client.open(room, { sub: "cara" });
    expect((await cara.next("welcome")).pieces).toEqual({ [key]: change });
  });

  it("lets you fill a spot the floor left empty, empty one it filled, and change your chair", async () => {
    const { ava, ben } = await office();
    if (EMPTY) {
      await pace();
      ava.send({ t: "piece", key: spotKey(DESK, EMPTY.id), change: { item: fitting(EMPTY) } });
      expect((await take(ben, "piece")).change).toEqual({ item: fitting(EMPTY) });
    }
    await pace();
    ava.send({ t: "piece", key: spotKey(DESK, FILLED.id), change: { hidden: true } });
    expect((await take(ben, "piece")).change).toEqual({ hidden: true });
    await pace();
    ava.send({ t: "piece", key: spotKey(DESK, FILLED.id), change: null });
    expect((await take(ben, "piece")).change).toBeNull();
    const chair = FLOOR.chairs.front.find((one) => one.item !== SPEC.chair.item)!.item;
    await pace();
    ava.send({ t: "piece", key: SPEC.chair.key, change: { item: chair } });
    expect((await take(ben, "piece")).change).toEqual({ item: chair });
  });

  it("keeps everyone else's desk theirs, and things in spots they fit", async () => {
    const { ava, ben } = await office();
    const key = spotKey(DESK, FILLED.id);
    // Someone else's desk, a desk you don't have, things that don't fit: each answered with the pieces as they are.
    ben.send({ t: "piece", key, change: { item: fitting(FILLED) } });
    expect((await take(ben, "pieces")).pieces).toEqual({});
    await pace();
    ava.send({ t: "piece", key: spotKey(OTHER, FILLED.id), change: { item: fitting(FILLED) } });
    await take(ava, "pieces");
    await pace();
    ava.send({ t: "piece", key, change: { item: FAR_THING } }); // a far desk's thing
    await take(ava, "pieces");
    await pace();
    ava.send({ t: "piece", key: spotKey(DESK, NARROW.id), change: { item: TOO_WIDE } }); // too wide for the spot
    await take(ava, "pieces");
    await pace();
    ava.send({ t: "piece", key: `${DESK}/spot-9`, change: { item: fitting(FILLED) } }); // no such spot
    await take(ava, "pieces");
    await pace();
    ava.send({ t: "piece", key, change: { item: fitting(FILLED), at: [0, 0] } as unknown as PieceChange }); // a place of its own
    await take(ava, "pieces");
    await pace();
    ava.send({ t: "piece", key: SPEC.chair.key, change: { item: "sofa-two" } });
    await take(ava, "pieces");
    await pace();
    ava.send({ t: "piece", key: SPEC.chair.key, change: { hidden: true } }); // a desk always has a chair
    await take(ava, "pieces");
    await settle();
    expect(ben.messages.some((message) => message.t === "piece")).toBe(false);
  });

  it("puts your desk back as the floor has it when you ask, and only yours", async () => {
    const { ava, ben } = await office();
    ava.send({ t: "piece", key: spotKey(DESK, FILLED.id), change: { item: fitting(FILLED) } });
    await take(ben, "piece");
    ben.send({ t: "desk_reset" }); // Ben has no desk: nothing happens
    await settle();
    expect(ben.messages.some((message) => message.t === "pieces")).toBe(false);
    await pace();
    ava.send({ t: "desk_reset" });
    expect((await take(ben, "pieces")).pieces).toEqual({});
  });

  it("puts a desk back as the floor has it when it's given up", async () => {
    const { ava, ben } = await office();
    await pace();
    ava.send({ t: "piece", key: spotKey(DESK, FILLED.id), change: { item: fitting(FILLED) } });
    await take(ben, "piece");
    ava.send({ t: "desk_claim", seat: FLOOR.desks[OTHER].seat });
    expect((await take(ben, "pieces")).pieces).toEqual({});
    expect(deskOfSeat(SEAT, FLOOR)).toBe(DESK);
  });
});
