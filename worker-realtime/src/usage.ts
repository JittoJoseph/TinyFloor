/** What a room has used since it last wrote to `usage_daily`. */
interface Pending {
  peak: number;
  personMs: number;
  sfuMs: number;
  since: number;
}

/** A busy room that never empties still writes at least this often. */
const FLUSH_EVERY_MS = 60 * 60_000;

/**
 * Usage totals for one room, kept in its own SQLite and added to D1 when the
 * room empties or an hour has passed. Writes stay proportional to active rooms,
 * not to people or messages.
 */
export class Usage {
  constructor(
    private readonly sql: SqlStorage,
    private readonly db: D1Database,
  ) {
    sql.exec("CREATE TABLE IF NOT EXISTS usage_pending (id INTEGER PRIMARY KEY CHECK (id = 1), value TEXT NOT NULL)");
  }

  /**
   * Someone left after `ms` in the room, `meetingMs` of it at a meeting table,
   * with `present` people in the room at the time. The peak is taken here
   * rather than on arrival: the busiest the room ever was is a moment someone
   * then left, and this way an arrival costs no write at all.
   */
  stayed(ms: number, meetingMs: number, present: number, now: number): void {
    const pending = this.read(now);
    pending.personMs += Math.max(0, ms);
    pending.sfuMs += Math.max(0, meetingMs);
    pending.peak = Math.max(pending.peak, present);
    this.write(pending);
  }

  /** Whether it is time to write: the room is empty, or it has been a while. */
  due(present: number, now: number): boolean {
    const pending = this.peek();
    if (!pending || (pending.personMs === 0 && pending.sfuMs === 0 && pending.peak === 0)) return false;
    return present === 0 || now - pending.since >= FLUSH_EVERY_MS;
  }

  /**
   * Adds what is pending to today's row. The pending totals are cleared first
   * and put back if the write fails, so nothing is counted twice.
   */
  async flush(room: string, present: number, now: number): Promise<void> {
    const pending = this.peek();
    if (!pending) return;
    this.write({ peak: present, personMs: 0, sfuMs: 0, since: now });

    const personMinutes = Math.round(pending.personMs / 60_000);
    const sfuMinutes = Math.round(pending.sfuMs / 60_000);
    try {
      await this.db
        .prepare(
          `INSERT INTO usage_daily (day, office_id, peak_people, person_minutes, sfu_minutes)
           VALUES (?1, ?2, ?3, ?4, ?5)
           ON CONFLICT (day, office_id) DO UPDATE SET
             peak_people = MAX(peak_people, excluded.peak_people),
             person_minutes = person_minutes + excluded.person_minutes,
             sfu_minutes = sfu_minutes + excluded.sfu_minutes`,
        )
        .bind(dayOf(now), room, pending.peak, personMinutes, sfuMinutes)
        .run();
    } catch (error) {
      const current = this.read(now);
      this.write({
        peak: Math.max(current.peak, pending.peak),
        personMs: current.personMs + pending.personMs,
        sfuMs: current.sfuMs + pending.sfuMs,
        since: pending.since,
      });
      console.error("usage write failed", room, error);
    }
  }

  private peek(): Pending | null {
    const row = this.sql.exec<{ value: string }>("SELECT value FROM usage_pending WHERE id = 1").toArray()[0];
    return row ? (JSON.parse(row.value) as Pending) : null;
  }

  private read(now: number): Pending {
    return this.peek() ?? { peak: 0, personMs: 0, sfuMs: 0, since: now };
  }

  private write(pending: Pending): void {
    this.sql.exec(
      "INSERT INTO usage_pending (id, value) VALUES (1, ?) ON CONFLICT (id) DO UPDATE SET value = excluded.value",
      JSON.stringify(pending),
    );
  }
}

/** `YYYY-MM-DD` in UTC. */
export function dayOf(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}
