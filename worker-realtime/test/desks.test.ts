import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { DESK_SEATS, deskArrival, seatTile } from "../../shared-protocol/src";
import { Client, settle, uniqueRoom } from "./client";

const DESK = DESK_SEATS[0];
const OTHER_DESK = DESK_SEATS[1];

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
    ben.send({ t: "desk_claim", seat: 388 }); // a meeting room chair
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

  it("keeps the lobby free of desks", async () => {
    const ava = await Client.open("lobby", { sub: "ava" });
    expect((await ava.next("welcome")).desks).toEqual([]);
    ava.send({ t: "desk_claim", seat: DESK });
    await settle();
    expect(ava.messages.some((message) => message.t === "desks")).toBe(false);
  });
});
