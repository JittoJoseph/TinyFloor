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

  it("removes only the guests who came in through a revoked link", async () => {
    const room = uniqueRoom();
    const member = await Client.open(room);
    await member.next("welcome");
    const guest = await Client.open(room, { role: "guest", link: "link-1" });
    const guestId = (await guest.next("welcome")).self.id;
    const other = await Client.open(room, { role: "guest", link: "link-2" });
    await other.next("welcome");

    await admin.revokeGuestLink(room, "link-1");

    expect(await guest.closed()).toBe(CloseCode.AccessRevoked);
    expect((await member.next("player_left")).id).toBe(guestId);
    expect(await admin.presenceCounts([room])).toEqual({ [room]: 2 });
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
