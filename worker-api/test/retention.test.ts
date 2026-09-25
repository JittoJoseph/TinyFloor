import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { runRetention } from "../src/retention";
import { makeUser } from "./helpers";

const DAY = 24 * 60 * 60 * 1000;
const exists = async (table: string, id: string) =>
  (await env.DB.prepare(`SELECT 1 AS found FROM ${table} WHERE id = ?`).bind(id).first()) !== null;

describe("daily retention", () => {
  it("removes what has expired and keeps what is still in use", async () => {
    const now = Date.now();
    const owner = await makeUser("Olive");
    const idleGuest = await makeUser("Idle guest", { guest: true });
    const activeGuest = await makeUser("Active guest", { guest: true });
    const office = crypto.randomUUID();

    await env.DB.batch([
      // The idle guest's only session expired long ago; the active guest's is live.
      env.DB.prepare("UPDATE sessions SET expires_at = ? WHERE user_id = ?").bind(now - 8 * DAY, idleGuest.id),
      env.DB.prepare("UPDATE users SET last_active_at = ? WHERE id IN (?, ?)").bind(now - 10 * DAY, idleGuest.id, activeGuest.id),
      env.DB.prepare("INSERT INTO offices (id, name, owner_id, created_at) VALUES (?, 'W', ?, ?)").bind(office, owner.id, now),
      env.DB.prepare(
        `INSERT INTO invites (id, office_id, token_hash, role, created_by, created_at, expires_at, accepted_at) VALUES
           ('inv-old-used', ?1, ?2, 'member', ?3, 0, ?4, ?5),
           ('inv-old-expired', ?1, ?6, 'member', ?3, 0, ?5, NULL),
           ('inv-live', ?1, ?7, 'member', ?3, 0, ?4, NULL)`,
      ).bind(office, crypto.randomUUID(), owner.id, now + 5 * DAY, now - 31 * DAY, crypto.randomUUID(), crypto.randomUUID()),
      env.DB.prepare(
        "INSERT INTO usage_daily (day, office_id, peak_people) VALUES ('2020-01-01', ?1, 1), (?2, ?1, 1)",
      ).bind(office, new Date(now).toISOString().slice(0, 10)),
    ]);

    const report = await runRetention(env, now);

    expect(await exists("users", idleGuest.id)).toBe(false);
    expect(await exists("users", activeGuest.id)).toBe(true);
    expect(await exists("users", owner.id)).toBe(true);
    expect(await exists("invites", "inv-old-used")).toBe(false);
    expect(await exists("invites", "inv-old-expired")).toBe(false);
    expect(await exists("invites", "inv-live")).toBe(true);
    const usage = await env.DB.prepare("SELECT day FROM usage_daily WHERE office_id = ?").bind(office).all<{ day: string }>();
    expect(usage.results.map((row) => row.day)).toEqual([new Date(now).toISOString().slice(0, 10)]);

    expect(report).toMatchObject({ guests: 1, invites: 2, usage: 1 });
    expect(report.sessions).toBeGreaterThanOrEqual(1);

    // Running again finds nothing left to do.
    expect(await runRetention(env, now)).toMatchObject({ guests: 0, invites: 0, usage: 0 });
  });
});
