import { DESK_SEATS, FLOOR_VERSION, deskPoint, isDesk, oldDeskPoint, type Desk } from "../../shared-protocol/src";

/**
 * Whose desk is whose in one office (docs/product.md), kept in the office room's own
 * SQLite: a desk has one owner, a person has one desk here, and a desk in
 * another office is another row in another room. The owner's name is kept so
 * an empty desk can still say whose it is.
 */
export class Desks {
  constructor(private readonly sql: SqlStorage) {
    sql.exec(
      "CREATE TABLE IF NOT EXISTS desks (seat INTEGER PRIMARY KEY, user_id TEXT NOT NULL UNIQUE, name TEXT NOT NULL, claimed_at INTEGER NOT NULL)",
    );
    // Which floor the claims are on (shared-protocol map.ts, FLOOR_VERSION); none for the hand-made map before it.
    sql.exec("CREATE TABLE IF NOT EXISTS floor (version TEXT NOT NULL)");
    this.moveTo(FLOOR_VERSION);
  }

  /**
   * The floor changed: each claim moves to the free desk nearest the one it
   * was, the earliest claim choosing first, so nobody loses their desk while
   * there are desks to go round; a claim with none left is let go. Once per
   * floor. From the hand-made map, the old desks' places are known
   * (OLD_DESKS); a later version of the template keeps its desks' ids, so a
   * claim on a desk it still has stays where it is.
   */
  private moveTo(version: string): void {
    const was = this.sql.exec<{ version: string }>("SELECT version FROM floor").toArray()[0]?.version ?? null;
    if (was === version) return;
    const claims = this.sql
      .exec<{ seat: number; user_id: string; name: string; claimed_at: number }>("SELECT seat, user_id, name, claimed_at FROM desks ORDER BY claimed_at, seat")
      .toArray();
    const free = new Set(DESK_SEATS);
    const placed: Array<{ seat: number; user_id: string; name: string; claimed_at: number }> = [];
    for (const claim of claims) {
      const from = was === null ? oldDeskPoint(claim.seat) : isDesk(claim.seat) && free.has(claim.seat) ? deskPoint(claim.seat) : null;
      if (!from) continue;
      let best: number | null = null;
      let distance = Infinity;
      for (const seat of free) {
        const to = deskPoint(seat)!;
        const away = Math.hypot(to.x - from.x, to.y - from.y);
        if (away < distance) [best, distance] = [seat, away];
      }
      if (best === null) continue;
      free.delete(best);
      placed.push({ ...claim, seat: best });
    }
    this.sql.exec("DELETE FROM desks");
    for (const claim of placed) {
      this.sql.exec("INSERT INTO desks (seat, user_id, name, claimed_at) VALUES (?, ?, ?, ?)", claim.seat, claim.user_id, claim.name, claim.claimed_at);
    }
    this.sql.exec("DELETE FROM floor");
    this.sql.exec("INSERT INTO floor (version) VALUES (?)", version);
  }

  list(): Desk[] {
    return this.sql
      .exec<{ seat: number; user_id: string; name: string }>("SELECT seat, user_id, name FROM desks ORDER BY seat")
      .toArray()
      .map((row) => ({ seat: row.seat, userId: row.user_id, name: row.name }));
  }

  /** This person's desk here, if they have one. */
  of(userId: string): number | null {
    return this.sql.exec<{ seat: number }>("SELECT seat FROM desks WHERE user_id = ?", userId).toArray()[0]?.seat ?? null;
  }

  ownerOf(seat: number): string | null {
    return this.sql.exec<{ user_id: string }>("SELECT user_id FROM desks WHERE seat = ?", seat).toArray()[0]?.user_id ?? null;
  }

  /** Makes a free desk this person's, letting go of any other they had. False when it isn't a desk, or is someone else's. */
  claim(seat: number, userId: string, name: string, now: number): boolean {
    if (!isDesk(seat)) return false;
    const owner = this.ownerOf(seat);
    if (owner === userId) return true;
    if (owner) return false;
    this.sql.exec("DELETE FROM desks WHERE user_id = ?", userId);
    this.sql.exec("INSERT INTO desks (seat, user_id, name, claimed_at) VALUES (?, ?, ?, ?)", seat, userId, name, now);
    return true;
  }

  /** True when they had a desk to let go of. */
  release(userId: string): boolean {
    return this.sql.exec("DELETE FROM desks WHERE user_id = ?", userId).rowsWritten > 0;
  }

  /** Their name changed since they claimed it: the desk says the new one. True when it did. */
  rename(userId: string, name: string): boolean {
    return this.sql.exec("UPDATE desks SET name = ? WHERE user_id = ? AND name <> ?", name, userId, name).rowsWritten > 0;
  }
}
