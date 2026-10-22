import type { PieceChange, PieceChanges } from "../../shared-protocol/src";

/**
 * What people have made of their desks in one office (docs/customization.md),
 * kept in the office room's own SQLite beside whose desk is whose: one row per
 * changed piece, by its key, with the desk it belongs to so letting a desk go
 * puts all of it back at once. Whether a change may be made is the room's to
 * ask first (shared-protocol office.ts, canChange).
 */
export class Pieces {
  constructor(private readonly sql: SqlStorage) {
    sql.exec(
      "CREATE TABLE IF NOT EXISTS pieces (key TEXT PRIMARY KEY, desk TEXT NOT NULL, change TEXT NOT NULL, user_id TEXT NOT NULL, changed_at INTEGER NOT NULL)",
    );
    sql.exec("CREATE INDEX IF NOT EXISTS pieces_desk ON pieces (desk)");
  }

  all(): PieceChanges {
    const changes: PieceChanges = {};
    for (const row of this.sql.exec<{ key: string; change: string }>("SELECT key, change FROM pieces").toArray()) {
      changes[row.key] = JSON.parse(row.change) as PieceChange;
    }
    return changes;
  }

  /** Keeps a change to a piece, or (null) puts the piece back as the floor has it. */
  set(key: string, desk: string, change: PieceChange | null, userId: string, now: number): void {
    if (change === null) this.sql.exec("DELETE FROM pieces WHERE key = ?", key);
    else
      this.sql.exec(
        "INSERT INTO pieces (key, desk, change, user_id, changed_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT (key) DO UPDATE SET change = excluded.change, user_id = excluded.user_id, changed_at = excluded.changed_at",
        key,
        desk,
        JSON.stringify(change),
        userId,
        now,
      );
  }

  /** A desk let go goes back to the floor's own. True when it had changes. */
  clearDesk(desk: string): boolean {
    return this.sql.exec("DELETE FROM pieces WHERE desk = ?", desk).rowsWritten > 0;
  }
}
