import { deskSeats, FLOOR, isDesk, seatTile, type Desk } from "shared-protocol";

/**
 * The floor every office was on before Campus, by its size: all a claim made
 * there needs to say where it was (a seat number is a tile, row by row).
 */
const OLD_FLOOR_SIZE: [number, number] = [48, 32];

/**
 * Whose desk is whose in one office (docs/product.md), kept in the office room's own
 * SQLite: a desk has one owner, a person has one desk here, and a desk in
 * another office is another row in another room. The owner's name is kept so
 * an empty desk can still say whose it is.
 */
export class Desks {
  constructor(
    private readonly sql: SqlStorage,
    /** The office was on the old floor: every claim settles onto Campus's desks, near where it was. */
    fromOldFloor = false,
  ) {
    sql.exec(
      "CREATE TABLE IF NOT EXISTS desks (seat INTEGER PRIMARY KEY, user_id TEXT NOT NULL UNIQUE, name TEXT NOT NULL, claimed_at INTEGER NOT NULL)",
    );
    this.settle(fromOldFloor ? OLD_FLOOR_SIZE : FLOOR.shell.size, fromOldFloor);
  }

  /**
   * Claims on desks that aren't the floor's (`all` of them when the office
   * comes from the old floor; otherwise those the floor no longer has, if it
   * changed under them) move to the free desk nearest the tile they were on
   * (on a floor of `from`'s size), the earliest claim choosing first, so nobody
   * loses their desk while there are desks to go round; with none left, it's
   * let go. Every room does it as it starts, before its claims are read; with
   * nothing to move, it only reads them.
   */
  private settle(from: [number, number], all: boolean): void {
    const claims = this.sql
      .exec<{ seat: number; user_id: string }>("SELECT seat, user_id FROM desks ORDER BY claimed_at, seat")
      .toArray();
    const moving = all ? claims : claims.filter((claim) => !isDesk(claim.seat));
    if (!moving.length) return;
    const staying = new Set(claims.filter((claim) => !moving.includes(claim)).map((claim) => claim.seat));
    const free = new Set(deskSeats().filter((seat) => !staying.has(seat)));
    // Off their old seats first, so a new one can't collide with a claim not yet moved.
    for (const claim of moving) this.sql.exec("UPDATE desks SET seat = ? WHERE user_id = ?", -1 - claim.seat, claim.user_id);
    const [fromWidth, fromHeight] = from;
    const [width, height] = FLOOR.shell.size;
    for (const claim of moving) {
      // Where it was, scaled onto this floor: the same part of the office, roughly.
      const was = { x: claim.seat % fromWidth, y: Math.floor(claim.seat / fromWidth) };
      const at = { x: (was.x / fromWidth) * width, y: (was.y / fromHeight) * height };
      let best: number | null = null;
      let distance = Infinity;
      for (const seat of free) {
        const to = seatTile(seat);
        const away = Math.hypot(to.x - at.x, to.y - at.y);
        if (away < distance) [best, distance] = [seat, away];
      }
      if (best === null) {
        this.sql.exec("DELETE FROM desks WHERE user_id = ?", claim.user_id);
        continue;
      }
      free.delete(best);
      this.sql.exec("UPDATE desks SET seat = ? WHERE user_id = ?", best, claim.user_id);
    }
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
