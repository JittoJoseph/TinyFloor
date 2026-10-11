import { isDesk, type Desk } from "../../shared-protocol/src";

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
