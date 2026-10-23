import { describe, expect, it } from "vitest";
import { DESK_THINGS_MAX, FLOOR, deskOfSeat, placeOn, type PieceChange, type ServerMessage } from "../../shared-protocol/src";
import { Client, settle, uniqueRoom } from "./client";

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
const PAPER = FLOOR.things.paper.size;
/** A spot on the desk for a paper: the n-th along it, at its front. */
const spot = (n = 0): [number, number] => placeOn(DESK, "paper", SPEC.along[0] + 16 + n * PAPER[0], SPEC.feet[1])!;
/** The middle of the desk, where whoever sits there is. */
const MIDDLE = (SPEC.along[0] + SPEC.along[1]) / 2;
const ownThing = FLOOR.pieces.find((piece) => piece.desk === DESK && !piece.key.endsWith("/chair"));

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
  it("lets you add a thing to your desk, and everyone sees it, then and later", async () => {
    const { room, ava, ben } = await office();
    const change: PieceChange = { item: "paper", at: spot() };
    await pace();
    ava.send({ t: "piece", key: `${DESK}/+a1`, change });
    expect(await take(ben, "piece")).toMatchObject({ key: `${DESK}/+a1`, change, by: "ava" });

    const cara = await Client.open(room, { sub: "cara" });
    expect((await cara.next("welcome")).pieces).toEqual({ [`${DESK}/+a1`]: change });
  });

  it("lets a thing stand anywhere along the desk, in front of whoever sits there too", async () => {
    const { ava, ben } = await office();
    const at = placeOn(DESK, "monitor-blue", MIDDLE, SPEC.feet[0] + 8)!;
    await pace();
    ava.send({ t: "piece", key: `${DESK}/+a1`, change: { item: "monitor-blue", at } });
    expect((await take(ben, "piece")).change).toEqual({ item: "monitor-blue", at });
  });

  it("lets you take away, move and put back what your desk came with, and change your chair", async () => {
    const { ava, ben } = await office();
    if (ownThing) {
      await pace();
      ava.send({ t: "piece", key: ownThing.key, change: { hidden: true } });
      expect((await take(ben, "piece")).change).toEqual({ hidden: true });
      await pace();
      ava.send({ t: "piece", key: ownThing.key, change: null });
      expect((await take(ben, "piece")).change).toBeNull();
    }
    const chair = FLOOR.chairs.front.find((one) => one.item !== SPEC.chair.item)!.item;
    await pace();
    ava.send({ t: "piece", key: SPEC.chair.key, change: { item: chair } });
    expect((await take(ben, "piece")).change).toEqual({ item: chair });
  });

  it("keeps everyone else's desk theirs, and things where they fit", async () => {
    const { ava, ben } = await office();
    // Someone else's desk, a desk you don't have, things that don't fit: each answered with the pieces as they are.
    ben.send({ t: "piece", key: `${DESK}/+b1`, change: { item: "paper", at: spot() } });
    expect((await take(ben, "pieces")).pieces).toEqual({});
    await pace();
    ava.send({ t: "piece", key: `${OTHER}/+a1`, change: { item: "paper", at: spot() } });
    await take(ava, "pieces");
    await pace();
    ava.send({ t: "piece", key: `${DESK}/+a2`, change: { item: "monitor-back-dark", at: spot() } }); // a far desk's thing
    await take(ava, "pieces");
    await pace();
    ava.send({ t: "piece", key: `${DESK}/+a3`, change: { item: "paper", at: [SPEC.along[1], spot()[1]] } }); // off its end
    await take(ava, "pieces");
    await pace();
    const tall = placeOn(DESK, "setup-laptop", MIDDLE, SPEC.feet[1])!;
    ava.send({ t: "piece", key: `${DESK}/+a4`, change: { item: "setup-laptop", at: [tall[0], tall[1] - 16] } }); // over the divider
    await take(ava, "pieces");
    await pace();
    ava.send({ t: "piece", key: SPEC.chair.key, change: { item: "sofa-two" } });
    await take(ava, "pieces");
    await pace();
    ava.send({ t: "piece", key: SPEC.chair.key, change: { hidden: true } }); // a desk always has a chair
    await take(ava, "pieces");
    await pace();
    ava.send({ t: "piece", key: `${DESK}/+a5`, change: { item: "paper", at: spot(), extra: 1 } as unknown as PieceChange });
    await take(ava, "pieces");
    await settle();
    expect(ben.messages.some((message) => message.t === "piece")).toBe(false);
  });

  it(`takes no more than ${DESK_THINGS_MAX} things on a desk`, async () => {
    const { ava } = await office();
    const already = FLOOR.pieces.filter((piece) => piece.desk === DESK && !piece.key.endsWith("/chair")).length;
    for (let n = 0; n < DESK_THINGS_MAX - already; n++) {
      await pace();
      ava.send({ t: "piece", key: `${DESK}/+n${n}`, change: { item: "paper", at: spot() } });
      await take(ava, "piece");
    }
    await pace();
    ava.send({ t: "piece", key: `${DESK}/+over`, change: { item: "paper", at: spot() } });
    expect(Object.keys((await take(ava, "pieces")).pieces)).not.toContain(`${DESK}/+over`);
  });

  it("puts your desk back as the floor has it when you ask, and only yours", async () => {
    const { ava, ben } = await office();
    ava.send({ t: "piece", key: `${DESK}/+a1`, change: { item: "paper", at: spot() } });
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
    ava.send({ t: "piece", key: `${DESK}/+a1`, change: { item: "paper", at: spot() } });
    await take(ben, "piece");
    ava.send({ t: "desk_claim", seat: FLOOR.desks[OTHER].seat });
    expect((await take(ben, "pieces")).pieces).toEqual({});
    expect(deskOfSeat(SEAT)).toBe(DESK);
  });
});
