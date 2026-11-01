import startup from "./catalog/floors/startup.json";
import campus from "./catalog/floors/campus.json";

/**
 * Every floor there is, by id, worked out by the lab (lab/build.mjs) into
 * everything the floor draws and the room checks. Each office is on one
 * (offices.floor, set from the admin view), the demo office on LOBBY_FLOOR;
 * the room is told which by its ticket, and keeps desks to it. Startup is
 * where every office began; Campus, an office in grounds, is the new one,
 * rolled out an office at a time.
 */
export const FLOORS: Record<string, Floor> = { startup: startup as unknown as Floor, campus: campus as unknown as Floor };

/** The floor an id names; Startup for one that isn't. */
export const floorOf = (id: string | null | undefined): Floor => FLOORS[id ?? ""] ?? FLOORS.startup;

const DRAWN = "tinyfloor:floor";

/** What a page has of a browser's, typed here because the room (a worker) has no window. */
type PageGlobals = { localStorage?: { getItem(key: string): string | null; setItem(key: string, value: string): void } };

/**
 * The floor this page draws: the one its last room ticket said (drawFloor),
 * kept in this browser, so the page loads already drawing it. A page's whole
 * floor, its walls, solids and desks, is this one; the room's is its own.
 */
export const FLOOR: Floor = (() => {
  try {
    return floorOf((globalThis as PageGlobals).localStorage?.getItem(DRAWN));
  } catch {
    return FLOORS.startup;
  }
})();

/**
 * A room ticket says which floor its room is on. True when it isn't the one
 * this page drew: it's remembered, and the page has to load again to draw it
 * (PhaserGame does). Only while offices move to a new floor; once they all
 * have, nothing changes here.
 */
export function drawFloor(id: string | undefined): boolean {
  if (!id || floorOf(id).id === FLOOR.id) return false;
  try {
    (globalThis as PageGlobals).localStorage?.setItem(DRAWN, floorOf(id).id);
  } catch {
    // Without storage the page draws the first floor again; nothing to loop on.
    return false;
  }
  return true;
}

export const MAP_WIDTH_TILES = FLOOR.shell.size[0];
export const MAP_HEIGHT_TILES = FLOOR.shell.size[1];

/** On this page's floor, short of its edge tiles. */
export function isValidTile(tileX: number, tileY: number): boolean {
  return tileX >= 1 && tileX < MAP_WIDTH_TILES - 1 && tileY >= 1 && tileY < MAP_HEIGHT_TILES - 1;
}

export interface Floor {
  id: string;
  version: number;
  shell: { size: [number, number]; legend: Record<string, { kind: "wall" | "floor" | "void"; material?: string }>; rows: string[] };
  anchors: {
    zones?: Array<{ name: string; x: number; y: number; width: number; height: number }>;
    table?: { x: number; y: number; width: number; height: number };
    whiteboard?: { x: number; y: number; width: number; height: number };
  };
  /** Everything drawn, by its item on the atlas (catalog/atlas.json), at its top left, at its depth; a desk's own pieces say whose desk. */
  pieces: Array<{ key: string; item: string; x: number; y: number; depth: number; desk?: string }>;
  /** What you can't walk through of each thing that can stand on the floor: [x, y, width, height] from its top left (office.ts officeSolids). */
  colliders: Record<string, Array<[number, number, number, number]>>;
  seats: FloorSeat[];
  /** Every desk, by its key (office.ts). */
  desks: Record<string, FloorDesk>;
  /**
   * What can stand on a desk: which side it suits, its frame's size in pixels,
   * where its pixels are in the frame ([left, top, right, bottom], right and
   * bottom past the last), and the shelf it's shown on.
   */
  things: Record<string, { facing: "front" | "back" | "any"; size: [number, number]; art: [number, number, number, number]; shelf?: string }>;
  /** The chairs each side of a desk can have, lined up by their seat (dx, dy from where the floor's chair stands). */
  chairs: Record<"front" | "back", Array<{ item: string; dx: number; dy: number; sortY: number }>>;
}

export interface FloorDesk {
  seat: number;
  /** A near desk (you sit facing up, at its front) or a far one (facing down, behind its strip). */
  side: "front" | "back";
  /** Where things stand on it: how far along, and the band the foot of their pixels is in (pixels). */
  along: [number, number];
  feet: [number, number];
  /** On a near desk, how high a thing's pixels may rise: the divider's top, so nothing stands over onto the far side. */
  ceiling?: number;
  chair: { key: string; item: string; x: number; y: number };
  /** The depth things on it are drawn at, just over the desk. */
  depth: number;
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

/** A floor's desks, by seat, with where you arrive for each: worked out once a floor. */
const arrivals = new Map<Floor, Map<number, [number, number]>>();
const arrivalsOf = (floor: Floor) => {
  let found = arrivals.get(floor);
  if (!found) arrivals.set(floor, (found = new Map(floor.seats.filter((seat) => seat.desk && seat.arrival).map((seat) => [seat.id, seat.arrival!] as const))));
  return found;
};

/** The chairs at desks: the ones that can be someone's. The meeting room's and the break room's are everyone's. */
export const deskSeats = (floor: Floor = FLOOR): number[] => [...arrivalsOf(floor).keys()];

export const isDesk = (seat: number, floor: Floor = FLOOR): boolean => arrivalsOf(floor).has(seat);

/** Where you appear arriving for this desk: near it, standing, to walk in and sit down. */
export function deskArrival(seat: number, floor: Floor = FLOOR): { x: number; y: number } | null {
  const tile = arrivalsOf(floor).get(seat);
  return tile ? { x: tile[0], y: tile[1] } : null;
}

/** The tile a seat is on, from its id. */
export function seatTile(seat: number, floor: Floor = FLOOR): { x: number; y: number } {
  const width = floor.shell.size[0];
  return { x: seat % width, y: Math.floor(seat / width) };
}

/** The largest floor's size: the room keeps people within it, whichever floor their page draws. */
const BOUNDS = Object.values(FLOORS).reduce(([w, h], floor) => [Math.max(w, floor.shell.size[0]), Math.max(h, floor.shell.size[1])], [0, 0]);

/** Inside the office walls. Walkability is the client's job; the server only keeps people on the map. */
export function isInsideMap(x: number, y: number): boolean {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 1 && x < BOUNDS[0] - 1 && y >= 1 && y < BOUNDS[1] - 1;
}
