import { DurableObject } from "cloudflare:workers";
import { LOBBY_COPY_CAPACITY } from "../../shared-protocol/src";

/** A count this old is ignored, in case a copy was reset (say, by a deploy) without reporting. */
const STALE_AFTER_MS = 10 * 60 * 1000;

/**
 * Decides which copy of the public lobby a visitor goes to. A single instance,
 * woken only by placements and by copies reporting their headcount.
 */
export class LobbyRouter extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS copies (number INTEGER PRIMARY KEY, people INTEGER NOT NULL, updated_at INTEGER NOT NULL)",
    );
  }

  /** The lowest-numbered copy with room, or a new one when all are full. */
  place(): string {
    const now = Date.now();
    const people = new Map<number, number>();
    for (const copy of this.ctx.storage.sql.exec<{ number: number; people: number; updated_at: number }>(
      "SELECT number, people, updated_at FROM copies",
    )) {
      if (now - copy.updated_at <= STALE_AFTER_MS) people.set(copy.number, copy.people);
    }

    let number = 1;
    while ((people.get(number) ?? 0) >= LOBBY_COPY_CAPACITY) number++;

    // Count the visitor straight away, so a burst of arrivals spreads across
    // copies before the rooms report back.
    this.save(number, (people.get(number) ?? 0) + 1, now);
    return lobbyCopy(number);
  }

  report(copy: string, people: number): void {
    const number = lobbyCopyNumber(copy);
    if (number) this.save(number, people, Date.now());
  }

  private save(number: number, people: number, now: number): void {
    this.ctx.storage.sql.exec(
      "INSERT INTO copies (number, people, updated_at) VALUES (?, ?, ?) ON CONFLICT (number) DO UPDATE SET people = excluded.people, updated_at = excluded.updated_at",
      number,
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
