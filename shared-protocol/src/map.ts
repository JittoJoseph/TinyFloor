export const MAP_WIDTH_TILES = 48;
export const MAP_HEIGHT_TILES = 32;

/**
 * The chairs at desks: every chair on the floor outside the meeting room, by
 * the id the floor gives each chair (its tile, row × width + column, counted
 * from the chair's lower edge). A desk can be someone's own (docs/product.md); the
 * meeting room's chairs are everyone's.
 *
 * Each has the tile you arrive on (docs/product.md): two steps back from where you
 * stand to sit, with a straight walk in. Worked out by running the floor's own
 * NavGrid (app-frontend lib/Navigation.ts) over office-map.tmj: from each
 * chair's standing spot (SeatManager.poseFor), two tiles further from the desk,
 * walkable, with a path back of at most a few steps. 1159's standing spot is
 * inside a collider, so its arrival is the walkable tile straight above. Work
 * them out again if the map changes.
 */
const DESK_ARRIVALS: Readonly<Record<number, readonly [number, number]>> = {
  404: [20, 4], 410: [26, 4], 548: [20, 13], 554: [26, 13], 658: [34, 9], 664: [40, 9], 802: [34, 18], 808: [40, 18],
  981: [21, 16], 987: [27, 16], 1125: [21, 25], 1131: [27, 25], 1159: [7, 19], 1235: [35, 21], 1241: [41, 21],
  1253: [5, 28], 1257: [9, 28], 1379: [35, 30], 1385: [41, 30],
};

export const DESK_SEATS: readonly number[] = Object.keys(DESK_ARRIVALS).map(Number);

export const isDesk = (seat: number): boolean => seat in DESK_ARRIVALS;

/** Where you appear arriving for this desk: near it, standing, to walk in and sit down. */
export function deskArrival(seat: number): { x: number; y: number } | null {
  const tile = DESK_ARRIVALS[seat];
  return tile ? { x: tile[0], y: tile[1] } : null;
}

/** The tile someone sits on at a chair, from the chair's id: the row above its lower edge. */
export function seatTile(seat: number): { x: number; y: number } {
  return { x: seat % MAP_WIDTH_TILES, y: Math.floor(seat / MAP_WIDTH_TILES) - 1 };
}

/** Inside the office walls. Walkability is the client's job; the server only keeps people on the map. */
export function isInsideMap(x: number, y: number): boolean {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 1 && x < MAP_WIDTH_TILES - 1 && y >= 1 && y < MAP_HEIGHT_TILES - 1;
}
