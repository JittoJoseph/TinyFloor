import { DurableObject } from "cloudflare:workers";
import { LOBBY_COPY_CAPACITY } from "../../shared-protocol/src";

/** A count this old is ignored, in case a room was reset (say, by a deploy) without reporting. */
const STALE_AFTER_MS = 10 * 60 * 1000;

/**
 * How many people are in each room, in one place. Rooms report as people come
 * and go, so the dashboard reads one object instead of waking every room, and
 * a visitor to the public lobby is sent to a copy with space.
 */
export class Presence extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS rooms (room TEXT PRIMARY KEY, people INTEGER NOT NULL, updated_at INTEGER NOT NULL)",
    );
  }

  /** The lowest-numbered lobby copy with room, or a new one when all are full. */
  place(): string {
    const now = Date.now();
    const people = new Map<number, number>();
    for (const row of this.ctx.storage.sql.exec<{ room: string; people: number; updated_at: number }>(
      "SELECT room, people, updated_at FROM rooms WHERE room LIKE 'lobby-%'",
    )) {
      const number = lobbyCopyNumber(row.room);
      if (number && now - row.updated_at <= STALE_AFTER_MS) people.set(number, row.people);
    }

    let number = 1;
    while ((people.get(number) ?? 0) >= LOBBY_COPY_CAPACITY) number++;

    // Count the visitor straight away, so a burst of arrivals spreads across
    // copies before the rooms report back.
    this.save(lobbyCopy(number), (people.get(number) ?? 0) + 1, now);
    return lobbyCopy(number);
  }

  report(room: string, people: number): void {
    this.save(room, people, Date.now());
  }

  /** People in each of these rooms right now; rooms nobody is in are left out. */
  counts(rooms: string[]): Record<string, number> {
    if (!rooms.length) return {};
    const placeholders = rooms.map(() => "?").join(",");
    const counts: Record<string, number> = {};
    const fresh = Date.now() - STALE_AFTER_MS;
    for (const row of this.ctx.storage.sql.exec<{ room: string; people: number }>(
      `SELECT room, people FROM rooms WHERE room IN (${placeholders}) AND updated_at > ?`,
      ...rooms,
      fresh,
    )) {
      counts[row.room] = row.people;
    }
    return counts;
  }

  private save(room: string, people: number, now: number): void {
    this.ctx.storage.sql.exec(
      `INSERT INTO rooms (room, people, updated_at) VALUES (?, ?, ?)
       ON CONFLICT (room) DO UPDATE SET people = excluded.people, updated_at = excluded.updated_at`,
      room,
      people,
      now,
    );
  }
}

export function lobbyCopy(number: number): string {
  return `lobby-${number}`;
}

/** The copy number for a room name like "lobby-3", or null for any other room. */
export function lobbyCopyNumber(room: string): number | null {
  const match = /^lobby-([1-9]\d{0,3})$/.exec(room);
  return match ? Number(match[1]) : null;
}
