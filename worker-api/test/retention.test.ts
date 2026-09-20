import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { runRetention } from "../src/retention";
import { fakeRealtime, makeUser } from "./helpers";

const DAY = 24 * 60 * 60 * 1000;
const exists = async (table: string, id: string) =>
  (await env.DB.prepare(`SELECT 1 AS found FROM ${table} WHERE id = ?`).bind(id).first()) !== null;

describe("daily retention", () => {
  it("removes what has expired and keeps what is still in use", async () => {
    const now = Date.now();
    const owner = await makeUser("Olive");
    const idleGuest = await makeUser("Idle guest", { guest: true });
    const activeGuest = await makeUser("Active guest", { guest: true });
    const workspace = crypto.randomUUID();

    await env.DB.batch([
      // The idle guest's only session expired long ago; the active guest's is live.
      env.DB.prepare("UPDATE sessions SET expires_at = ? WHERE user_id = ?").bind(now - 8 * DAY, idleGuest.id),
      env.DB.prepare("UPDATE users SET last_active_at = ? WHERE id IN (?, ?)").bind(now - 10 * DAY, idleGuest.id, activeGuest.id),
      env.DB.prepare("INSERT INTO workspaces (id, name, owner_id, created_at) VALUES (?, 'W', ?, ?)").bind(workspace, owner.id, now),
      env.DB.prepare(
        `INSERT INTO invites (id, workspace_id, token_hash, role, created_by, created_at, expires_at, accepted_at) VALUES
           ('inv-old-used', ?1, ?2, 'member', ?3, 0, ?4, ?5),
           ('inv-old-expired', ?1, ?6, 'member', ?3, 0, ?5, NULL),
           ('inv-live', ?1, ?7, 'member', ?3, 0, ?4, NULL)`,
      ).bind(workspace, crypto.randomUUID(), owner.id, now + 5 * DAY, now - 31 * DAY, crypto.randomUUID(), crypto.randomUUID()),
      env.DB.prepare(
        `INSERT INTO rooms (id, workspace_id, name, created_by, created_at, archived_at) VALUES
           ('room-gone', ?1, 'Gone', ?2, 0, ?3),
           ('room-recent', ?1, 'Recent', ?2, 0, ?4),
           ('room-live', ?1, 'Live', ?2, 0, NULL)`,
      ).bind(workspace, owner.id, now - 40 * DAY, now - 2 * DAY),
      env.DB.prepare(
        `INSERT INTO guest_links (id, room_id, token_hash, created_by, created_at, expires_at, revoked_at) VALUES
           ('link-old', 'room-live', ?1, ?2, 0, ?3, ?4),
           ('link-live', 'room-live', ?5, ?2, 0, ?3, NULL)`,
      ).bind(crypto.randomUUID(), owner.id, now + DAY, now - 31 * DAY, crypto.randomUUID()),
      env.DB.prepare(
        "INSERT INTO usage_daily (day, room_id, peak_people) VALUES ('2020-01-01', 'room-live', 1), (?, 'room-live', 1)",
      ).bind(new Date(now).toISOString().slice(0, 10)),
    ]);

    const report = await runRetention(env, now);

    expect(await exists("users", idleGuest.id)).toBe(false);
    expect(await exists("users", activeGuest.id)).toBe(true);
    expect(await exists("users", owner.id)).toBe(true);
    expect(await exists("invites", "inv-old-used")).toBe(false);
    expect(await exists("invites", "inv-old-expired")).toBe(false);
    expect(await exists("invites", "inv-live")).toBe(true);
    expect(await exists("guest_links", "link-old")).toBe(false);
    expect(await exists("guest_links", "link-live")).toBe(true);
    expect(await exists("rooms", "room-gone")).toBe(false);
    expect(await exists("rooms", "room-recent")).toBe(true);
    expect(await exists("rooms", "room-live")).toBe(true);
    expect(await fakeRealtime().calls()).toContainEqual(["forgetRoom", "room-gone"]);
    const usage = await env.DB.prepare("SELECT day FROM usage_daily WHERE room_id = 'room-live'").all<{ day: string }>();
    expect(usage.results.map((row) => row.day)).toEqual([new Date(now).toISOString().slice(0, 10)]);

    expect(report).toMatchObject({ guests: 1, invites: 2, guestLinks: 1, rooms: 1, usage: 1 });
    expect(report.sessions).toBeGreaterThanOrEqual(1);

    // Running again finds nothing left to do.
    expect(await runRetention(env, now)).toMatchObject({ guests: 0, invites: 0, guestLinks: 0, rooms: 0, usage: 0 });
  });
});
