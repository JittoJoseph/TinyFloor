import type { ChairSpec, MapAnchor } from "./MapManager";
import type { NavGrid } from "./Navigation";
import { pixelToTile, tileToPixel, TILE_SIZE } from "@/lib/types";

export const MEETING_ZONE = "meeting";

/** Whether a point on the floor is inside the meeting room. */
export function inZone(zone: MapAnchor | undefined, x: number, y: number): boolean {
  return !!zone && x >= zone.x && x < zone.x + zone.width && y >= zone.y && y < zone.y + zone.height;
}

/**
 * A place to stand in the meeting room for someone joining a meeting: a free
 * tile you can walk to, not a chair and not the table, around the table, and
 * not beside someone already standing there, so a meeting fills the room as a
 * ring of people rather than a pile. Two people joining at once are spread
 * apart by their ids, so they rarely aim for the same tile.
 */
export function standingSpot({
  zone,
  table,
  nav,
  chairs,
  taken,
  seed,
}: {
  zone: MapAnchor;
  table?: MapAnchor;
  nav: NavGrid;
  chairs: ChairSpec[];
  /** Tiles other people stand on. */
  taken: Array<{ tileX: number; tileY: number }>;
  seed: string;
}): { x: number; y: number } | null {
  const chairTiles = new Set(chairs.map((chair) => key(pixelToTile(chair.x, chair.y))));
  const takenTiles = new Set(taken.map(key));
  const crowded = (tileX: number, tileY: number) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (takenTiles.has(`${tileX + dx},${tileY + dy}`)) return true;
    return false;
  };

  const centre = table
    ? { x: table.x + table.width / 2, y: table.y + table.height / 2 }
    : { x: zone.x + zone.width / 2, y: zone.y + zone.height / 2 };
  // Around the table, not pressed against it: the ring starts a step out.
  const ring = table ? Math.max(table.width, table.height) / 2 + TILE_SIZE : 0;
  const jitter = hash(seed);

  const spots: Array<{ x: number; y: number; score: number; crowded: boolean }> = [];
  const first = pixelToTile(zone.x, zone.y);
  const last = pixelToTile(zone.x + zone.width - 1, zone.y + zone.height - 1);
  for (let tileY = first.tileY; tileY <= last.tileY; tileY++) {
    for (let tileX = first.tileX; tileX <= last.tileX; tileX++) {
      const point = tileToPixel(tileX, tileY);
      if (!inZone(zone, point.x, point.y) || !nav.isWalkable(tileX, tileY)) continue;
      const here = `${tileX},${tileY}`;
      if (chairTiles.has(here) || takenTiles.has(here)) continue;
      const away = Math.hypot(point.x - centre.x, point.y - centre.y);
      // Near the ring around the table is best; a little of the seed breaks ties.
      const score = Math.abs(away - ring) + ((jitter + tileX * 31 + tileY * 17) % 97) / 97;
      spots.push({ ...point, score, crowded: crowded(tileX, tileY) });
    }
  }
  if (!spots.length) return null;
  spots.sort((a, b) => Number(a.crowded) - Number(b.crowded) || a.score - b.score);
  return { x: spots[0].x, y: spots[0].y };
}

function key(tile: { tileX: number; tileY: number }): string {
  return `${tile.tileX},${tile.tileY}`;
}

function hash(text: string): number {
  let value = 0;
  for (let index = 0; index < text.length; index++) value = (value * 31 + text.charCodeAt(index)) >>> 0;
  return value % 997;
}
