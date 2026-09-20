import { BOARD_MAX_POINTS_PER_STROKE, BOARD_MAX_STROKES, type BoardStroke } from "../../shared-protocol/src";

const DEFAULT_COLOR = "#2c2c2c";
const MAX_SIZE = 64;

interface StrokeRow extends Record<string, SqlStorageValue> {
  id: string;
  color: string;
  size: number;
  erase: number;
  points: string;
}

/** The room's whiteboard, kept in the room's own SQLite. */
export class Board {
  constructor(private readonly sql: SqlStorage) {
    sql.exec(`CREATE TABLE IF NOT EXISTS board_strokes (
      id TEXT PRIMARY KEY,
      color TEXT NOT NULL,
      size REAL NOT NULL,
      erase INTEGER NOT NULL,
      points TEXT NOT NULL,
      seq INTEGER NOT NULL
    )`);
  }

  strokes(): BoardStroke[] {
    return this.sql
      .exec<StrokeRow>("SELECT id, color, size, erase, points FROM board_strokes ORDER BY seq")
      .toArray()
      .map((row) => ({
        id: row.id,
        color: row.color,
        size: row.size,
        erase: row.erase === 1,
        points: JSON.parse(row.points) as number[],
      }));
  }

  /**
   * Strokes arrive in slices while the pen is still moving: an unknown id starts
   * a stroke, a known one extends it. The oldest stroke makes way for a new one
   * past the limit, and points past the per-stroke limit are dropped.
   */
  append(stroke: BoardStroke): void {
    const existing = this.sql
      .exec<{ points: string }>("SELECT points FROM board_strokes WHERE id = ?", stroke.id)
      .toArray()[0];

    if (existing) {
      const points = JSON.parse(existing.points) as number[];
      if (points.length + stroke.points.length > BOARD_MAX_POINTS_PER_STROKE) return;
      this.sql.exec(
        "UPDATE board_strokes SET points = ? WHERE id = ?",
        JSON.stringify(points.concat(stroke.points)),
        stroke.id,
      );
      return;
    }

    this.sql.exec(
      `DELETE FROM board_strokes WHERE id IN (
        SELECT id FROM board_strokes ORDER BY seq
        LIMIT MAX(0, (SELECT COUNT(*) FROM board_strokes) - ?)
      )`,
      BOARD_MAX_STROKES - 1,
    );
    this.sql.exec(
      `INSERT INTO board_strokes (id, color, size, erase, points, seq)
       VALUES (?, ?, ?, ?, ?, (SELECT COALESCE(MAX(seq), 0) + 1 FROM board_strokes))`,
      stroke.id,
      stroke.color,
      stroke.size,
      stroke.erase ? 1 : 0,
      JSON.stringify(stroke.points),
    );
  }

  clear(): void {
    this.sql.exec("DELETE FROM board_strokes");
  }
}

/** A drawn slice from a client, cleaned up, or null when it isn't usable. */
export function parseStroke(input: object): BoardStroke | null {
  const message = input as Record<string, unknown>;
  const { id, points } = message;
  if (typeof id !== "string" || !/^[\w-]{1,64}$/.test(id)) return null;
  if (!Array.isArray(points) || points.length < 2 || points.length % 2 !== 0) return null;
  if (points.length > BOARD_MAX_POINTS_PER_STROKE) return null;
  if (!points.every((value) => typeof value === "number" && Number.isFinite(value))) return null;

  const color =
    typeof message.color === "string" && /^#[0-9a-fA-F]{3,8}$/.test(message.color) ? message.color : DEFAULT_COLOR;
  const size =
    typeof message.size === "number" && Number.isFinite(message.size)
      ? Math.min(Math.max(message.size, 1), MAX_SIZE)
      : 3;

  return { id, color, size, erase: message.erase === true, points: points as number[] };
}
