import { FLOOR, type Floor } from "./map";

/**
 * An office is its floor (the Startup template, map.ts) and the changes made
 * to it, each kept against one piece's key (docs/customization.md). For now
 * the changes are to desks, by whoever has the desk: the things on it and its
 * chair. One set of rules, here, for the floor that draws a change and the
 * room that lets it be made.
 */

/** A change to one piece: taken away, or swapped and moved; a key the floor doesn't have is a thing added to a desk. */
export type PieceChange = { hidden: true } | { item?: string; at?: [number, number] };

export type PieceChanges = Record<string, PieceChange>;

export interface OfficePiece {
  key: string;
  item: string;
  x: number;
  y: number;
  depth: number;
  /** The desk it belongs to, when it's a desk's: a thing on it, or its chair. */
  desk?: string;
}

/** The most things a desk takes, the floor's own included: a working desk, not a cluttered one. */
export const DESK_THINGS_MAX = 8;
/** Things are placed to the art's pixels: two of ours. */
const GRID = 2;
/** Added things' keys: their desk's key, then this, then a short id of their own. */
const ADDED = "/+";

/** Which desk a piece is, or belongs to: its own key's desk, an added thing's, or none. */
export function deskOfKey(key: string, floor: Floor = FLOOR): string | null {
  const added = key.indexOf(ADDED);
  if (added > 0) return floor.desks[key.slice(0, added)] ? key.slice(0, added) : null;
  return floor.pieces.find((piece) => piece.key === key)?.desk ?? null;
}

/** A new key for a thing added to a desk. */
export function addedKey(desk: string): string {
  return `${desk}${ADDED}${Math.random().toString(36).slice(2, 8)}`;
}

/** The desk whose seat this is, if it's a desk's. */
export function deskOfSeat(seat: number, floor: Floor = FLOOR): string | null {
  for (const [key, desk] of Object.entries(floor.desks)) if (desk.seat === seat) return key;
  return null;
}

/** Where a desk's chair stands when it's this one: lined up by its seat, so you sit in the same spot whichever it is. */
function chairAt(floor: Floor, desk: string, item: string): { x: number; y: number; depth: number } | null {
  const spec = floor.desks[desk];
  const option = floor.chairs[spec.side].find((one) => one.item === item);
  const now = floor.chairs[spec.side].find((one) => one.item === spec.chair.item);
  if (!option || !now) return null;
  const x = spec.chair.x + option.dx - now.dx;
  const y = spec.chair.y + option.dy - now.dy;
  // Facing down you sit in front of the chair; facing up its back is drawn over you (lab check: the same sort lines).
  return { x, y, depth: y + option.sortY };
}

/** A thing on a desk is drawn just over the desk, the lower one over the higher. */
const thingDepth = (floor: Floor, desk: string, y: number, item: string) => floor.desks[desk].depth + (y + floor.things[item].size[1]) / 10000;

/**
 * The office as it's drawn: the floor's pieces with the changes applied, and
 * the things people added, in draw order. A change that doesn't fit the floor
 * any more (its desk gone, its thing not a thing) is left out.
 */
export function officePieces(changes: PieceChanges, floor: Floor = FLOOR): OfficePiece[] {
  const pieces: OfficePiece[] = [];
  for (const piece of floor.pieces) {
    const change = changes[piece.key];
    if (!change) {
      pieces.push(piece);
      continue;
    }
    if ("hidden" in change) continue;
    const item = change.item ?? piece.item;
    if (piece.key.endsWith("/chair") && piece.desk) {
      const at = chairAt(floor, piece.desk, item);
      if (at) pieces.push({ ...piece, item, ...at });
      else pieces.push(piece);
      continue;
    }
    const [x, y] = change.at ?? [piece.x, piece.y];
    pieces.push({ ...piece, item, x, y, depth: piece.desk && floor.things[item] ? thingDepth(floor, piece.desk, y, item) : piece.depth });
  }
  for (const [key, change] of Object.entries(changes)) {
    const desk = key.includes(ADDED) ? deskOfKey(key, floor) : null;
    if (!desk || "hidden" in change || !change.item || !change.at || !floor.things[change.item]) continue;
    const [x, y] = change.at;
    pieces.push({ key, item: change.item, x, y, depth: thingDepth(floor, desk, y, change.item), desk });
  }
  return pieces.sort((a, b) => a.depth - b.depth);
}

/** The things standing on a desk now, its own and added, as they're drawn. */
export function thingsOn(desk: string, changes: PieceChanges, floor: Floor = FLOOR): OfficePiece[] {
  const chair = floor.desks[desk]?.chair.key;
  return officePieces(changes, floor).filter((piece) => piece.desk === desk && piece.key !== chair);
}

/** Where a thing could stand on a desk: within its length, its foot in the desk's band, clear of a near desk's chair. */
export function fitsOn(desk: string, item: string, [x, y]: [number, number], floor: Floor = FLOOR): boolean {
  const spec = floor.desks[desk];
  const thing = floor.things[item];
  if (!spec || !thing) return false;
  if (thing.facing !== "any" && thing.facing !== spec.side) return false;
  if (!Number.isInteger(x) || !Number.isInteger(y) || x % GRID || y % GRID) return false;
  const [w, h] = thing.size;
  if (x < spec.along[0] || x + w > spec.along[1]) return false;
  if (y + h < spec.feet[0] || y + h > spec.feet[1]) return false;
  return !spec.clear || x + w <= spec.clear[0] || x >= spec.clear[1];
}

/**
 * Whether whoever has `desk` may make this change (null: putting the piece
 * back as the floor has it): only to their own desk's pieces, a thing to
 * another thing that fits there, a chair to another chair for that side, no
 * more than DESK_THINGS_MAX things on it.
 */
export function canChange(key: string, change: PieceChange | null, desk: string | null, changes: PieceChanges, floor: Floor = FLOOR): boolean {
  if (!desk || !floor.desks[desk] || deskOfKey(key, floor) !== desk) return false;
  if (change === null) return true;
  const piece = floor.pieces.find((one) => one.key === key);
  const chair = floor.desks[desk].chair.key;
  if (key === chair) return !("hidden" in change) && !("at" in change) && !!change.item && !!chairAt(floor, desk, change.item);
  if ("hidden" in change) return !!piece;
  const now = officePieces(changes, floor).find((one) => one.key === key);
  const item = change.item ?? now?.item ?? piece?.item;
  const at = change.at ?? (now ? ([now.x, now.y] as [number, number]) : undefined);
  if (!item || !at || !fitsOn(desk, item, at, floor)) return false;
  // A new thing, or one put back on the desk, counts against how many it takes.
  const showing = thingsOn(desk, changes, floor).some((one) => one.key === key);
  return showing || thingsOn(desk, changes, floor).length < DESK_THINGS_MAX;
}
