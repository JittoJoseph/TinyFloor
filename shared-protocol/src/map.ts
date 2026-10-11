export const MAP_WIDTH_TILES = 48;
export const MAP_HEIGHT_TILES = 32;

/**
 * The chairs at desks: every chair on the floor outside the meeting room, by
 * the id the floor gives each chair (its tile, row × width + column, counted
 * from the chair's lower edge). A desk can be someone's own (docs/26); the
 * meeting room's chairs are everyone's.
 */
export const DESK_SEATS: readonly number[] = [
  404, 410, 548, 554, 658, 664, 802, 808, 981, 987, 1125, 1131, 1159, 1235, 1241, 1253, 1257, 1379, 1385,
];
const DESKS = new Set(DESK_SEATS);

export const isDesk = (seat: number): boolean => DESKS.has(seat);

/** The tile someone sits on at a chair, from the chair's id: the row above its lower edge. */
export function seatTile(seat: number): { x: number; y: number } {
  return { x: seat % MAP_WIDTH_TILES, y: Math.floor(seat / MAP_WIDTH_TILES) - 1 };
}

/** Inside the office walls. Walkability is the client's job; the server only keeps people on the map. */
export function isInsideMap(x: number, y: number): boolean {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 1 && x < MAP_WIDTH_TILES - 1 && y >= 1 && y < MAP_HEIGHT_TILES - 1;
}
