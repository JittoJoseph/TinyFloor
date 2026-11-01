import { FLOOR, type DeskSpot, type Floor } from "./map";
import { wallSolids, type ShellMap } from "./shell";

/**
 * An office is its floor (the Startup template, map.ts) and the changes made
 * to it, each kept against one piece's key (docs/customization.md). For now
 * the changes are to desks, by whoever has the desk: what stands in each of
 * its spots, its chair and its wood. One set of rules, here, for the floor that draws a change and the
 * room that lets it be made.
 */

/** A change to one piece: taken away, or another in its place. A desk's spot the floor left empty is given a thing the same way. */
export type PieceChange = { hidden: true } | { item: string };

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

/** A spot's key: its desk's, then the spot's own. */
export const spotKey = (desk: string, spot: string) => `${desk}/${spot}`;

/** The desk and spot a key names, if it names one. */
export function spotOfKey(key: string, floor: Floor = FLOOR): { desk: string; spot: DeskSpot } | null {
  const cut = key.lastIndexOf("/");
  if (cut <= 0) return null;
  const desk = key.slice(0, cut);
  const spot = floor.desks[desk]?.spots.find((one) => one.id === key.slice(cut + 1));
  return spot ? { desk, spot } : null;
}

/** Which desk a piece is, or belongs to: its body, a spot on it, its chair; or none. */
export function deskOfKey(key: string, floor: Floor = FLOOR): string | null {
  const body = Object.entries(floor.desks).find(([, desk]) => desk.body?.key === key);
  if (body) return body[0];
  const spot = spotOfKey(key, floor);
  if (spot) return spot.desk;
  return floor.pieces.find((piece) => piece.key === key)?.desk ?? null;
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

/** Whether a thing can stand in a spot: one of the desk's set that suits its side, its pixels no wider than the spot. */
export function fitsIn(desk: string, spot: DeskSpot, item: string, floor: Floor = FLOOR): boolean {
  const spec = floor.desks[desk];
  const thing = floor.things[item];
  if (!spec || !thing || (thing.facing !== "any" && thing.facing !== spec.side)) return false;
  if (spec.set && thing.set !== spec.set) return false;
  return thing.art[2] - thing.art[0] <= spot.x[1] - spot.x[0];
}

/** Where a thing stands in a spot: its pixels centred across it, on the art's pixels, their foot on its line, drawn just over the desk. */
export function placeIn(desk: string, spot: DeskSpot, item: string, floor: Floor = FLOOR): { x: number; y: number; depth: number } {
  const [left, , right, bottom] = floor.things[item].art;
  const x = Math.round(((spot.x[0] + spot.x[1]) / 2 - (left + right) / 2) / 2) * 2;
  return { x, y: spot.foot - bottom, depth: floor.desks[desk].depth + spot.foot / 10000 };
}

const itemOf = (change: PieceChange): string | null => ("item" in change && typeof change.item === "string" ? change.item : null);

/**
 * The office as it's drawn: the floor's pieces with the changes applied, and
 * things put in the spots the floor left empty, in draw order. A change that
 * doesn't fit the floor any more (its desk or spot gone, its thing not one
 * that fits there) is left out.
 */
export function officePieces(changes: PieceChanges, floor: Floor = FLOOR): OfficePiece[] {
  const pieces: OfficePiece[] = [];
  for (const piece of floor.pieces) {
    const change = changes[piece.key];
    const item = change ? itemOf(change) : null;
    if (change && "hidden" in change) continue;
    if (!item) {
      pieces.push(piece);
      continue;
    }
    if (piece.key.endsWith("/chair") && piece.desk) {
      const at = chairAt(floor, piece.desk, item);
      pieces.push(at ? { ...piece, item, ...at } : piece);
      continue;
    }
    const spot = spotOfKey(piece.key, floor);
    if (spot) pieces.push(fitsIn(spot.desk, spot.spot, item, floor) ? { ...piece, item, ...placeIn(spot.desk, spot.spot, item, floor) } : piece);
    else pieces.push({ ...piece, item });
  }
  const own = new Set(floor.pieces.map((piece) => piece.key));
  for (const [key, change] of Object.entries(changes)) {
    const item = itemOf(change);
    const spot = own.has(key) || !item ? null : spotOfKey(key, floor);
    if (!spot || !item || !fitsIn(spot.desk, spot.spot, item, floor)) continue;
    pieces.push({ key, item, ...placeIn(spot.desk, spot.spot, item, floor), desk: spot.desk });
  }
  return pieces.sort((a, b) => a.depth - b.depth);
}

/**
 * What can't be walked through as the office is now: its walls, and what each
 * piece standing on it says of itself. Worked out here, from the pieces, so a
 * piece swapped is solid where it is, with nothing to bake.
 */
export function officeSolids(pieces: readonly OfficePiece[], floor: Floor = FLOOR): Array<[number, number, number, number]> {
  const solids = wallSolids(floor.shell as ShellMap);
  for (const piece of pieces) {
    for (const [x, y, w, h] of floor.colliders[piece.item] ?? []) solids.push([piece.x + x, piece.y + y, w, h]);
  }
  return solids;
}

/** What stands in each of a desk's spots now, by the spot's key: null when it's empty. */
export function spotsOn(desk: string, changes: PieceChanges, floor: Floor = FLOOR): Record<string, string | null> {
  const drawn = new Map(officePieces(changes, floor).map((piece) => [piece.key, piece.item]));
  return Object.fromEntries(floor.desks[desk].spots.map((spot) => [spotKey(desk, spot.id), drawn.get(spotKey(desk, spot.id)) ?? null]));
}

/**
 * Whether whoever has `desk` may make this change (null: putting the piece
 * back as the floor has it): only to their own desk's pieces, a spot's thing
 * to one that fits there (or none), a chair to another chair for that side,
 * the desk to another of its woods.
 */
export function canChange(key: string, change: PieceChange | null, desk: string | null, changes: PieceChanges, floor: Floor = FLOOR): boolean {
  if (!desk || !floor.desks[desk] || deskOfKey(key, floor) !== desk) return false;
  if (change === null) return true;
  const spec = floor.desks[desk];
  const item = itemOf(change);
  if (key === spec.chair.key) return !!item && !!chairAt(floor, desk, item);
  // The desk itself: only into another of its woods, where it stands.
  if (key === spec.body?.key) return !!item && spec.body.options.includes(item);
  const spot = spotOfKey(key, floor);
  if (!spot) return false;
  // Emptying a spot hides what the floor put there; one it left empty is emptied by putting it back (null).
  if ("hidden" in change) return floor.pieces.some((piece) => piece.key === key);
  return !!item && fitsIn(desk, spot.spot, item, floor);
}
