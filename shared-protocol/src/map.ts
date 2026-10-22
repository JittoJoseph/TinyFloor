import startup from "./catalog/floors/startup.json";

export const MAP_WIDTH_TILES = 48;
export const MAP_HEIGHT_TILES = 32;

/**
 * The office everyone's floor is: the Startup template, worked out by the lab
 * (lab/build.mjs) into everything the floor draws and the room checks. Its
 * seats are numbered by the tile they're on (row × width + column).
 */
export const FLOOR = startup as unknown as Floor;

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

/** The tile a seat is on, from its id. */
export function seatTile(seat: number): { x: number; y: number } {
  return { x: seat % MAP_WIDTH_TILES, y: Math.floor(seat / MAP_WIDTH_TILES) };
}

/** Inside the office walls. Walkability is the client's job; the server only keeps people on the map. */
export function isInsideMap(x: number, y: number): boolean {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 1 && x < MAP_WIDTH_TILES - 1 && y >= 1 && y < MAP_HEIGHT_TILES - 1;
}
