import startup from "./catalog/floors/startup.json";

export const MAP_WIDTH_TILES = 48;
export const MAP_HEIGHT_TILES = 32;

/**
 * The office everyone's floor is: the Startup template, worked out by the lab
 * (lab/build.mjs) into everything the floor draws and the room checks. Its
 * seats are numbered by the tile they're on (row × width + column).
 */
export const FLOOR = startup as unknown as Floor;
/** Which template and version the floor is, so a room knows when its desks need moving to it. */
export const FLOOR_VERSION = `${FLOOR.id}@${FLOOR.version}`;

export interface Floor {
  id: string;
  version: number;
  shell: { size: [number, number]; legend: Record<string, { kind: "wall" | "floor" | "void"; material?: string }>; rows: string[] };
  anchors: {
    zones?: Array<{ name: string; x: number; y: number; width: number; height: number }>;
    table?: { x: number; y: number; width: number; height: number };
    whiteboard?: { x: number; y: number; width: number; height: number };
  };
  /** Everything drawn, by its item on the atlas (catalog/atlas.json), at its top left, at its depth. */
  pieces: Array<{ key: string; item: string; x: number; y: number; depth: number }>;
  /** What you can't walk through: [x, y, width, height]. */
  solids: Array<[number, number, number, number]>;
  seats: FloorSeat[];
}

export interface FloorSeat {
  id: number;
  key: string;
  /** Where whoever sits there is: the seat's point, in pixels. */
  x: number;
  y: number;
  dir: "up" | "down";
  /** A desk's own key; only desks can be someone's (docs/product.md). */
  desk?: string;
  /** Where you arrive for a desk: a walkable tile two steps back from it, worked out by the lab. */
  arrival?: [number, number];
  zone?: string;
}

const DESKS = FLOOR.seats.filter((seat) => seat.desk && seat.arrival);
const ARRIVALS = new Map(DESKS.map((seat) => [seat.id, seat.arrival!] as const));

/** The chairs at desks: the ones that can be someone's. The meeting room's and the break room's are everyone's. */
export const DESK_SEATS: readonly number[] = DESKS.map((seat) => seat.id);

export const isDesk = (seat: number): boolean => ARRIVALS.has(seat);

/** Where you appear arriving for this desk: near it, standing, to walk in and sit down. */
export function deskArrival(seat: number): { x: number; y: number } | null {
  const tile = ARRIVALS.get(seat);
  return tile ? { x: tile[0], y: tile[1] } : null;
}

/** Where a desk sits, in pixels: for moving a claim to the desk nearest it. */
export function deskPoint(seat: number): { x: number; y: number } | null {
  const desk = DESKS.find((one) => one.id === seat);
  return desk ? { x: desk.x, y: desk.y } : null;
}

/** The tile a seat is on, from its id. */
export function seatTile(seat: number): { x: number; y: number } {
  return { x: seat % MAP_WIDTH_TILES, y: Math.floor(seat / MAP_WIDTH_TILES) };
}

/**
 * The desks of the floor before the Startup template (the hand-made map, to
 * October 2026), by their old ids: each the tile of its chair's lower edge.
 * Kept only so a room can move its claims to the nearest new desk, once.
 */
export const OLD_DESKS: readonly number[] = [404, 410, 548, 554, 658, 664, 802, 808, 981, 987, 1125, 1131, 1159, 1235, 1241, 1253, 1257, 1379, 1385];

/** Where an old desk's chair stood, in pixels: the middle of the tile above its lower edge. */
export function oldDeskPoint(seat: number): { x: number; y: number } {
  return { x: (seat % MAP_WIDTH_TILES) * 32 + 16, y: Math.floor(seat / MAP_WIDTH_TILES) * 32 - 16 };
}

/** Inside the office walls. Walkability is the client's job; the server only keeps people on the map. */
export function isInsideMap(x: number, y: number): boolean {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 1 && x < MAP_WIDTH_TILES - 1 && y >= 1 && y < MAP_HEIGHT_TILES - 1;
}
