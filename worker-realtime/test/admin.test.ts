import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { CloseCode } from "../../shared-protocol/src";
import { Client, uniqueRoom } from "./client";

const admin = exports.RealtimeAdmin;

describe("realtime admin", () => {
  it("counts people per room", async () => {
    const busy = uniqueRoom();
    const empty = uniqueRoom();
    const ava = await Client.open(busy);
    await ava.next("welcome");
    const ben = await Client.open(busy);
    await ben.next("welcome");

    expect(await admin.presenceCounts([busy, empty])).toEqual({ [busy]: 2, [empty]: 0 });
  });

  it("closes a deleted room for everyone", async () => {
    const room = uniqueRoom();
    const ava = await Client.open(room);
    await ava.next("welcome");
    const ben = await Client.open(room);
    await ben.next("welcome");

    await admin.closeRoom(room);

    expect(await ava.closed()).toBe(CloseCode.RoomClosed);
    expect(await ben.closed()).toBe(CloseCode.RoomClosed);
  });
});
