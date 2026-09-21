import { runInDurableObject } from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import { describe, expect, it, vi } from "vitest";
import { dayOf } from "../src/usage";
import { Client, settle, uniqueRoom } from "./client";

interface UsageRow {
  peak_people: number;
  person_minutes: number;
  sfu_minutes: number;
}

const usageOf = (room: string) =>
  env.DB.prepare("SELECT peak_people, person_minutes, sfu_minutes FROM usage_daily WHERE day = ? AND office_id = ?")
    .bind(dayOf(Date.now()), room)
    .first<UsageRow>();

interface RoomWithAttachments {
  attachmentOf(socket: WebSocket): { joinedAt: number; meeting: string | null; meetingSince: number | null };
}

/** Pretends everyone arrived, and sat down, some minutes ago, in the room's own copy. */
const backdate = (room: string, joinedMinutesAgo: number, satMinutesAgo: number) =>
  runInDurableObject(env.ROOM.getByName(room), (instance, state) => {
    for (const socket of state.getWebSockets()) {
      const attachment = (instance as unknown as RoomWithAttachments).attachmentOf(socket);
      attachment.joinedAt = Date.now() - joinedMinutesAgo * 60_000;
      if (attachment.meeting) attachment.meetingSince = Date.now() - satMinutesAgo * 60_000;
    }
  });

describe("usage totals", () => {
  it("writes the day's peak, person minutes and meeting minutes when the room empties", async () => {
    const room = uniqueRoom();
    const ava = await Client.open(room);
    await ava.next("welcome");
    const ben = await Client.open(room);
    await ben.next("welcome");
    ben.send({ t: "sit", seat: 1, x: 11, y: 10, meeting: "table-a" });
    await ben.next("meeting_joined");
    await backdate(room, 10, 4);

    ben.socket.close(1000, "bye");
    await ava.next("player_left");
    await settle();
    expect(await usageOf(room)).toBeNull(); // Ava is still there.

    ava.socket.close(1000, "bye");
    await vi.waitFor(async () => expect(await usageOf(room)).toEqual({ peak_people: 2, person_minutes: 20, sfu_minutes: 4 }), { timeout: 5000 });

    // Coming back later the same day adds to the row.
    const cara = await Client.open(room);
    await cara.next("welcome");
    await backdate(room, 3, 0);
    cara.socket.close(1000, "bye");
    await vi.waitFor(async () => expect(await usageOf(room)).toEqual({ peak_people: 2, person_minutes: 23, sfu_minutes: 4 }), { timeout: 5000 });
  }, 20_000);

  it("counts people removed by the room, in the lobby copy's own row", async () => {
    const room = uniqueRoom();
    const ava = await Client.open(room);
    await ava.next("welcome");
    await backdate(room, 6, 0);

    await exports.RealtimeAdmin.closeRoom(room);
    await ava.closed();
    await vi.waitFor(async () => expect(await usageOf(room)).toEqual({ peak_people: 1, person_minutes: 6, sfu_minutes: 0 }), { timeout: 5000 });
  }, 20_000);

  it("forgets a deleted room's whiteboard", async () => {
    const room = uniqueRoom();
    const ava = await Client.open(room);
    await ava.next("welcome");
    ava.send({ t: "board_draw", id: "s1", color: "#000000", size: 2, erase: false, points: [1, 2, 3, 4] });
    await settle();

    await exports.RealtimeAdmin.forgetRoom(room);
    await ava.closed();

    const ben = await Client.open(room);
    await ben.next("welcome");
    ben.send({ t: "board_sync" });
    expect((await ben.next("board_state")).strokes).toEqual([]);
  }, 20_000);
});
