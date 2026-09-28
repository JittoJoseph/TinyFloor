import type { MeetingUsage } from "../../shared-protocol/src";

/** A lobby copy's video allowance: nobody pays for the lobby (docs/14). */
export const LOBBY_MEETING_HOURS_A_DAY = 2;
/** While meetings are counting, the room wakes at least this often to settle up and tell everyone. */
const TICK_MS = 10 * 60_000;

type Period = "month" | "day";

/** The period `now` falls in, and when the next one starts. UTC, so everyone agrees. */
function periodOf(now: number, period: Period): { key: string; endsAt: number } {
  const date = new Date(now);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  if (period === "day") {
    const day = date.getUTCDate();
    return { key: date.toISOString().slice(0, 10), endsAt: Date.UTC(year, month, day + 1) };
  }
  return { key: date.toISOString().slice(0, 7), endsAt: Date.UTC(year, month + 1, 1) };
}

/**
 * Meeting hours for one room (docs/14): the time each meeting has two or more
 * people in it, pooled for the period. Kept in the room's SQLite, since the
 * room hibernates and remembers nothing in memory between messages; a meeting
 * that is counting stores when it started, and is settled into the period's
 * total when it stops, or when the room's alarm wakes it.
 */
export class MeetingClock {
  constructor(
    private readonly sql: SqlStorage,
    private readonly period: Period,
  ) {
    sql.exec("CREATE TABLE IF NOT EXISTS meeting_live (meeting TEXT PRIMARY KEY, since INTEGER NOT NULL)");
    sql.exec("CREATE TABLE IF NOT EXISTS meeting_used (period TEXT PRIMARY KEY, seconds REAL NOT NULL)");
    sql.exec("CREATE TABLE IF NOT EXISTS meeting_allowance (id INTEGER PRIMARY KEY CHECK (id = 1), hours REAL)");
  }

  /** Hours a period includes; null for no limit (an office that hasn't been told its plan yet). */
  allowanceHours(): number | null {
    if (this.period === "day") return LOBBY_MEETING_HOURS_A_DAY;
    const row = this.sql.exec<{ hours: number | null }>("SELECT hours FROM meeting_allowance WHERE id = 1").toArray()[0];
    return row?.hours ?? null;
  }

  /** The plan's hours, from a ticket or the API. True when it changed. */
  setAllowance(hours: number): boolean {
    if (this.period === "day" || this.allowanceHours() === hours) return false;
    this.sql.exec(
      "INSERT INTO meeting_allowance (id, hours) VALUES (1, ?) ON CONFLICT (id) DO UPDATE SET hours = excluded.hours",
      hours,
    );
    return true;
  }

  private live(): { meeting: string; since: number }[] {
    return this.sql.exec<{ meeting: string; since: number }>("SELECT meeting, since FROM meeting_live").toArray();
  }

  private settledSeconds(key: string): number {
    return this.sql.exec<{ seconds: number }>("SELECT seconds FROM meeting_used WHERE period = ?", key).toArray()[0]?.seconds ?? 0;
  }

  private add(key: string, seconds: number): void {
    if (seconds <= 0) return;
    this.sql.exec(
      "INSERT INTO meeting_used (period, seconds) VALUES (?, ?) ON CONFLICT (period) DO UPDATE SET seconds = seconds + excluded.seconds",
      key,
      seconds,
    );
  }

  /**
   * A meeting now has `people` in it. It counts from when it reaches two and
   * stops when it drops below. True when it started or stopped counting.
   */
  update(meeting: string, people: number, now: number): boolean {
    const counting = this.live().find((one) => one.meeting === meeting);
    if (people >= 2 && !counting) {
      this.sql.exec("INSERT INTO meeting_live (meeting, since) VALUES (?, ?)", meeting, now);
      return true;
    }
    if (people < 2 && counting) {
      this.add(periodOf(now, this.period).key, (now - counting.since) / 1000);
      this.sql.exec("DELETE FROM meeting_live WHERE meeting = ?", meeting);
      return true;
    }
    return false;
  }

  /** Moves the time counted so far into the period's total, so nothing waits in `since` for long. */
  settle(now: number): void {
    const key = periodOf(now, this.period).key;
    for (const { meeting, since } of this.live()) {
      this.add(key, (now - since) / 1000);
      this.sql.exec("UPDATE meeting_live SET since = ? WHERE meeting = ?", now, meeting);
    }
  }

  usage(now: number): MeetingUsage {
    const { key, endsAt } = periodOf(now, this.period);
    const live = this.live();
    const used = this.settledSeconds(key) + live.reduce((sum, one) => sum + Math.max(0, now - one.since) / 1000, 0);
    const hours = this.allowanceHours();
    const allowance = hours === null ? null : hours * 3600;
    return {
      used: Math.round(used),
      allowance,
      live: live.length,
      period: this.period,
      resetsAt: endsAt,
      paused: allowance !== null && used >= allowance,
    };
  }

  /** This period's settled total, for the API's copy in D1. */
  periodTotal(now: number): { key: string; seconds: number } {
    const { key } = periodOf(now, this.period);
    return { key, seconds: Math.round(this.settledSeconds(key)) };
  }

  /**
   * When the room should next wake: when the allowance will run out at the
   * current rate, and at least every tick while meetings count. Null when
   * nothing is counting.
   */
  nextWake(now: number): number | null {
    const usage = this.usage(now);
    if (!usage.live) return null;
    let at = now + TICK_MS;
    if (usage.allowance !== null && !usage.paused) {
      at = Math.min(at, now + Math.ceil(((usage.allowance - usage.used) / usage.live) * 1000) + 500);
    }
    return Math.min(at, usage.resetsAt + 500);
  }
}
