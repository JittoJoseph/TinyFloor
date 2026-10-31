// An office's building, as rooms: each a rectangle with its floor and what
// it's for. Everything else is worked out from them, never drawn by hand:
//
// - walls: a room's edge; across, two tiles deep (the top and its face), down,
//   one wide. Rooms side by side share the wall between them; one above the
//   other share two rows, so the wall between them is one wall, in step;
// - doorways: every room opens onto the main room (the hall) through the wall
//   they share, or, if it doesn't touch the hall, onto the neighbour that's
//   nearest it. One doorway a room, in the middle of the shared wall unless
//   the room says where. Its floor runs on from the room above (through a
//   wall across) or the room off the hall (through a wall down);
// - the outside: a wall facing the grounds is brick, and the grounds are
//   grass, paved where the plan says;
// - exits: doors out to the grounds, the only openings a plan names itself,
//   each with its paving: never a door straight onto the grass. A patio off
//   a door in a wall down, a plaza off one in a wall across, centred on it.
//
// So taking a room away closes the hall's wall where its doorway was (and the
// wall, now outside, gets windows like any other: lab/pages/floor.js), and
// moving one moves its walls, its doorway and its carpets with it.
//
// It's cheap (a few thousand tiles, once), the same everywhere, and has no
// randomness, so a builder can run it as a room is dragged, and the shell it
// gives is what gets saved and drawn.

import type { ShellMap } from "./shell";

/** [x0, y0, x1, y1], in tiles, both ends included. */
export type Rect = [number, number, number, number];

/** What a room is for: it decides what stands along its walls. */
export type RoomKind = "open" | "meeting" | "kitchen" | "lounge" | "library" | "quiet";

export interface PlanRoom {
  id: string;
  kind: RoomKind;
  /** The room, walls included. */
  rect: Rect;
  floor: string;
  /** Its doorway: how many tiles wide (2 by default), and where along the shared wall, in tiles from the room's own left (or top) wall. */
  door?: { width?: number; at?: number };
  /** Carpet on its floor: rectangles from the room's top-left corner (its wall's), with their floor. */
  carpets?: Array<[number, number, number, number, string]>;
  /** Doors out to the grounds: which wall, how far along it from the room's left (or top) wall, how wide, and its paving if not the usual. */
  exits?: Exit[];
}

export type Side = "top" | "bottom" | "left" | "right";

export interface Exit {
  side: Side;
  at: number;
  width?: number;
  /** The paving it opens onto: how far out from the wall, and how long along it, centred on the door. */
  patio?: { out: number; along: number };
}

/** The usual paving off a door out: a patio off a wall down, ten long and seven out; a plaza off a wall across, four out. */
const PATIO: Record<"across" | "down", { out: number; along: number }> = { down: { out: 7, along: 10 }, across: { out: 4, along: 10 } };

/** The tiles a door out takes in its room's wall. */
export function exitDoor([x0, y0, x1, y1]: Rect, { side, at, width = 2 }: Exit): Rect {
  const from = side === "top" || side === "bottom" ? x0 + at : y0 + at;
  return side === "top" ? [from, y0, from + width - 1, y0 + 1]
    : side === "bottom" ? [from, y1 - 1, from + width - 1, y1]
    : side === "left" ? [x0, from, x0, from + width - 1]
    : [x1, from, x1, from + width - 1];
}

/** The paving a door out opens onto, centred on it. */
export function exitPatio(rect: Rect, exit: Exit): Rect {
  const across = exit.side === "top" || exit.side === "bottom";
  const { out, along } = exit.patio ?? PATIO[across ? "across" : "down"];
  const width = exit.width ?? 2;
  const [x0, y0, x1, y1] = rect;
  const start = (across ? x0 : y0) + exit.at + Math.floor(width / 2) - Math.floor(along / 2);
  const [a0, a1] = [start, start + along - 1];
  return exit.side === "top" ? [a0, y0 - out, a1, y0 - 1]
    : exit.side === "bottom" ? [a0, y1 + 1, a1, y1 + out]
    : exit.side === "left" ? [x0 - out, a0, x0 - 1, a1]
    : [x1 + 1, a0, x1 + out, a1];
}

export interface Plan {
  size: [number, number];
  /** The room the others open onto. */
  main: string;
  rooms: PlanRoom[];
  walls: { inside: string; outside: string };
  /** The grounds: grass, with paved patches (corners rounded off) and paths (a round brush along the points). */
  paving?: Array<{ rect: Rect } | { path: Array<[number, number]>; radius: number }>;
}

/** The shell a plan draws, its doorways and doors out (to keep clear), its patios, and where it can't be built as it stands. */
export interface PlannedShell extends ShellMap {
  doors: Rect[];
  patios: Array<{ rect: Rect; side: Side; door: Rect; room: string }>;
  problems: string[];
}

const GRASS = ".";
const PAVING = "=";
const INSIDE = "#";
const OUTSIDE = "%";

/** Where two rooms meet, if they do: the wall they share, and the stretch of it a doorway can go in. */
export function sharedWall(a: Rect, b: Rect): { across: boolean; from: number; to: number; at: number } | null {
  // One above the other: the lower starts on the upper's last two rows.
  for (const [up, down] of [[a, b], [b, a]]) {
    if (down[1] !== up[3] - 1) continue;
    const from = Math.max(up[0], down[0]) + 1, to = Math.min(up[2], down[2]) - 1;
    if (to >= from) return { across: true, from, to, at: up[3] - 1 };
  }
  // Side by side: one column between them.
  for (const [left, right] of [[a, b], [b, a]]) {
    if (right[0] !== left[2]) continue;
    const from = Math.max(left[1], right[1]) + 2, to = Math.min(left[3], right[3]) - 2;
    if (to >= from) return { across: false, from, to, at: left[2] };
  }
  return null;
}

const overlaps = (a: Rect, b: Rect) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];

/** Whether two rooms can stand where they are: apart, or sharing a wall, never one inside the other. */
export function fits(a: Rect, b: Rect): boolean {
  const [x0, y0, x1, y1] = [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])];
  if (x0 > x1 || y0 > y1) return true;
  if (x0 === x1 && (a[2] === b[0] || b[2] === a[0])) return true;
  return y1 - y0 === 1 && (a[3] - 1 === b[1] || b[3] - 1 === a[1]);
}

/** Each room's way to the hall: the room its doorway opens onto, nearest the hall first. */
function connections(plan: Plan): Map<string, string> {
  const byId = new Map(plan.rooms.map((room) => [room.id, room]));
  const parent = new Map<string, string>();
  const queue = [plan.main];
  const seen = new Set(queue);
  // Rooms that only touch at a corner's worth of wall don't open onto each other: a doorway needs a tile clear either side.
  const opens = (a: Rect, b: PlanRoom) => {
    const wall = sharedWall(a, b.rect);
    return !!wall && wall.to - wall.from + 1 >= (b.door?.width ?? 2) + 2;
  };
  while (queue.length) {
    const id = queue.shift()!;
    for (const room of plan.rooms) {
      if (seen.has(room.id) || !opens(byId.get(id)!.rect, room)) continue;
      seen.add(room.id);
      parent.set(room.id, id);
      queue.push(room.id);
    }
  }
  return parent;
}

/** The plan's shell: its rows of tiles and their legend, and anything that stops it being built. */
export function planShell(plan: Plan): PlannedShell {
  const [w, h] = plan.size;
  const problems: string[] = [];
  const doors: Rect[] = [];
  const patios: PlannedShell["patios"] = [];
  const legend: ShellMap["legend"] = {
    [GRASS]: { kind: "floor", material: "grass" },
    [PAVING]: { kind: "floor", material: "paving" },
    [INSIDE]: { kind: "wall", material: plan.walls.inside },
    [OUTSIDE]: { kind: "wall", material: plan.walls.outside },
  };
  // One letter a floor, in the order they come.
  const letters = new Map<string, string>();
  const letter = (floor: string) => {
    if (!letters.has(floor)) {
      const ch = String.fromCharCode(97 + letters.size);
      letters.set(floor, ch);
      legend[ch] = { kind: "floor", material: floor };
    }
    return letters.get(floor)!;
  };
  const grid = Array.from({ length: h }, () => Array<string>(w).fill(GRASS));
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h;
  const at = (x: number, y: number) => (inside(x, y) ? grid[y][x] : GRASS);
  const fill = ([x0, y0, x1, y1]: Rect, ch: string) => {
    for (let y = Math.max(0, y0); y <= Math.min(h - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(w - 1, x1); x++) grid[y][x] = ch;
  };
  const isGround = (ch: string) => ch === GRASS || ch === PAVING;

  const rooms = plan.rooms;
  const byId = new Map(rooms.map((room) => [room.id, room]));
  if (!byId.has(plan.main)) problems.push(`there's no ${plan.main} for the rooms to open onto`);
  for (const [i, room] of rooms.entries()) {
    const [x0, y0, x1, y1] = room.rect;
    if (x0 < 1 || y0 < 1 || x1 > w - 2 || y1 > h - 2) problems.push(`the ${room.id} runs off the grounds`);
    if (x1 - x0 < 3 || y1 - y0 < 4) problems.push(`the ${room.id} is too small for a floor`);
    for (const other of rooms.slice(i + 1)) if (!fits(room.rect, other.rect)) problems.push(`the ${room.id} and the ${other.id} overlap`);
  }

  // Walls, then floors, then carpets: a room's floor stops at its own walls, whoever else's they are too.
  for (const room of rooms) fill(room.rect, INSIDE);
  for (const room of rooms) {
    const [x0, y0, x1, y1] = room.rect;
    fill([x0 + 1, y0 + 2, x1 - 1, y1 - 2], letter(room.floor));
  }
  for (const room of rooms) {
    const [x0, y0, x1, y1] = room.rect;
    for (const [cx0, cy0, cx1, cy1, floor] of room.carpets ?? []) {
      fill([Math.max(x0 + 1, x0 + cx0), Math.max(y0 + 2, y0 + cy0), Math.min(x1 - 1, x0 + cx1), Math.min(y1 - 2, y0 + cy1)], letter(floor));
    }
  }

  // Doorways, each room's onto the room nearer the hall.
  const parent = connections(plan);
  for (const room of rooms) {
    if (room.id === plan.main) continue;
    const onto = byId.get(parent.get(room.id) ?? "");
    if (!onto) {
      problems.push(`the ${room.id} has no way in: it doesn't share a wall with the ${plan.main} or a room off it`);
      continue;
    }
    const wall = sharedWall(room.rect, onto.rect)!;
    const width = Math.max(1, room.door?.width ?? 2);
    if (wall.to - wall.from + 1 < width) {
      problems.push(`the ${room.id}'s wall with the ${onto.id} is too short for its doorway`);
      continue;
    }
    const own = wall.across ? room.rect[0] : room.rect[1];
    const want = room.door?.at === undefined ? wall.from + Math.floor((wall.to - wall.from + 1 - width) / 2) : own + room.door.at;
    const start = Math.min(wall.to - width + 1, Math.max(wall.from, want));
    // Through a wall across, the room above's floor runs on through the gap; through a wall down, the room's own.
    const upper = room.rect[1] < onto.rect[1] ? room : onto;
    const door: Rect = wall.across ? [start, wall.at, start + width - 1, wall.at + 1] : [wall.at, start, wall.at, start + width - 1];
    fill(door, letter(wall.across ? upper.floor : room.floor));
    doors.push(door);
  }

  // Doors out, with the room's floor through them, and the paving they open onto.
  const paved = (rect: Rect) => {
    const [x0, y0, x1, y1] = rect;
    const corners = new Set([`${x0},${y0}`, `${x1},${y0}`, `${x0},${y1}`, `${x1},${y1}`]);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inside(x, y) && grid[y][x] === GRASS && !corners.has(`${x},${y}`)) grid[y][x] = PAVING;
  };
  for (const room of rooms) {
    const [x0, y0, x1, y1] = room.rect;
    for (const exit of room.exits ?? []) {
      const across = exit.side === "top" || exit.side === "bottom";
      const door = exitDoor(room.rect, exit);
      const [from, to] = across ? [door[0], door[2]] : [door[1], door[3]];
      // Through a wall down, two tiles of wall under the wall across above it, or the faces don't line up.
      if (across ? from <= x0 || to >= x1 : from < y0 + 4 || to > y1 - 2) {
        problems.push(`the ${room.id}'s door out on its ${exit.side} runs past the room`);
        continue;
      }
      const beyond = exit.side === "top" ? at(from, y0 - 1) : exit.side === "bottom" ? at(from, y1 + 1) : exit.side === "left" ? at(x0 - 1, from) : at(x1 + 1, from);
      if (!isGround(beyond)) problems.push(`the ${room.id}'s door out on its ${exit.side} doesn't lead outside`);
      const patio = exitPatio(room.rect, exit);
      const into = rooms.find((other) => other !== room && overlaps(patio, other.rect));
      if (into) problems.push(`the paving off the ${room.id}'s door out runs into the ${into.id}`);
      fill(door, letter(room.floor));
      doors.push(door);
      paved(patio);
      patios.push({ rect: patio, side: exit.side, door, room: room.id });
    }
  }

  // The grounds' paving, on open ground only.
  for (const area of plan.paving ?? []) {
    if ("rect" in area) {
      paved(area.rect);
      continue;
    }
    const { path, radius: r } = area;
    for (let i = 0; i < path.length - 1; i++) {
      const [[ax, ay], [bx, by]] = [path[i], path[i + 1]];
      const steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 4);
      for (let n = 0; n <= steps; n++) {
        const cx = ax + ((bx - ax) * n) / steps, cy = ay + ((by - ay) * n) / steps;
        for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
          for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
            if (inside(x, y) && grid[y][x] === GRASS && (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) grid[y][x] = PAVING;
          }
        }
      }
    }
  }

  // Brick wherever a wall's face looks out onto the grounds.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) if (grid[y][x] === INSIDE && (isGround(at(x, y + 1)) || (at(x, y + 1) === INSIDE && isGround(at(x, y + 2))))) grid[y][x] = OUTSIDE;
  }
  return { size: [w, h], legend, rows: grid.map((row) => row.join("")), doors, patios, problems };
}

/** Which room a tile's floor belongs to: the room whose floor it's on (not its walls). */
export function roomAt(plan: Plan, x: number, y: number): PlanRoom | null {
  return plan.rooms.find(({ rect: [x0, y0, x1, y1] }) => x > x0 && x < x1 && y >= y0 + 2 && y <= y1 - 2) ?? null;
}

/**
 * Where a room of this size goes, held near a tile: against the hall, on
 * whichever side of it is nearest, sharing its wall, slid along that wall to
 * follow the tile but kept overlapping it enough for a doorway, and snapped
 * flush to a room already there when it's within a couple of tiles. Never
 * over another room or in front of a door out. Null when there's no room for
 * it there.
 */
export function attach(plan: Plan, size: [number, number], [px, py]: [number, number], ignore?: string): Rect | null {
  const main = plan.rooms.find((room) => room.id === plan.main);
  if (!main) return null;
  const [w, h] = size;
  const [mx0, my0, mx1, my1] = main.rect;
  const others = plan.rooms.filter((room) => room.id !== plan.main && room.id !== ignore);
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  // Each side of the hall: how far the tile is from a room there, the room slid along it, and how far it can slide and
  // still share four tiles of wall with the hall (room for a doorway, a tile clear of each corner).
  type Side = { distance: number; across: boolean; rect: (along: number) => Rect; along: number; lo: number; hi: number; on: (r: Rect) => boolean };
  const acrossRange = { along: px - Math.floor(w / 2), lo: mx0 - w + 5, hi: mx1 - 5 };
  const downRange = { along: py - Math.floor(h / 2), lo: my0 - h + 7, hi: my1 - 7 };
  const sides: Side[] = [
    { distance: Math.abs(py - (my0 - h / 2)), across: true, rect: (x) => [x, my0 + 1 - h, x + w, my0 + 1], on: (r) => r[3] === my0 + 1, ...acrossRange },
    { distance: Math.abs(py - (my1 + h / 2)), across: true, rect: (x) => [x, my1 - 1, x + w, my1 - 1 + h], on: (r) => r[1] === my1 - 1, ...acrossRange },
    { distance: Math.abs(px - (mx0 - w / 2)), across: false, rect: (y) => [mx0 - w, y, mx0, y + h], on: (r) => r[2] === mx0, ...downRange },
    { distance: Math.abs(px - (mx1 + w / 2)), across: false, rect: (y) => [mx1, y, mx1 + w, y + h], on: (r) => r[0] === mx1, ...downRange },
  ];
  const [W, H] = plan.size;
  // The paving off the doors out: a room put there would shut one.
  const patios = plan.rooms.filter((room) => room.id !== ignore).flatMap((room) => (room.exits ?? []).map((exit) => exitPatio(room.rect, exit)));
  // The side the tile is nearest, or one about as near (by a corner): not a jump to the far side of the hall.
  const nearest = Math.min(...sides.map((side) => side.distance));
  for (const side of sides.filter((s) => s.distance <= nearest + 3).sort((a, b) => a.distance - b.distance)) {
    let along = clamp(side.along, side.lo, side.hi);
    // Flush with a room already on this side when it's close: their walls become one.
    const probe = side.rect(along);
    for (const { rect: [ox0, oy0, ox1, oy1] } of others.filter((other) => side.on(other.rect))) {
      const near = side.across ? [ox1 - probe[0], ox0 - probe[2]] : [oy1 - 1 - probe[1], oy0 + 1 - probe[3]];
      const shift = near.find((d) => d !== 0 && Math.abs(d) <= 2);
      if (shift !== undefined) along = clamp(along + shift, side.lo, side.hi);
    }
    const rect = side.rect(along);
    if (rect[0] < 1 || rect[1] < 1 || rect[2] > W - 2 || rect[3] > H - 2) continue;
    if (patios.some((patio) => overlaps(patio, rect))) continue;
    if (others.every((other) => fits(rect, other.rect))) return rect;
  }
  return null;
}

/**
 * Where a patio goes, held near a tile: against the outside wall nearest it,
 * its door in the middle of the patio, slid along the wall to follow the tile
 * but kept a tile from the room's corners. The wall has to face the grounds
 * all along the door, and the paving can't run into a room or another patio.
 * Null when there's no such wall near.
 */
export function attachPatio(plan: Plan, [px, py]: [number, number], exit: Omit<Exit, "side" | "at">, ignore?: Exit): { room: string; side: Side; at: number } | null {
  const [W, H] = plan.size;
  const width = exit.width ?? 2;
  const within = (x: number, y: number) => plan.rooms.some(({ rect: [x0, y0, x1, y1] }) => x >= x0 && x <= x1 && y >= y0 && y <= y1);
  const others = plan.rooms.flatMap((room) => (room.exits ?? []).filter((e) => e !== ignore).map((e) => exitPatio(room.rect, e)));
  let best: { room: string; side: Side; at: number; d: number } | null = null;
  for (const room of plan.rooms) {
    const [x0, y0, x1, y1] = room.rect;
    for (const side of ["top", "bottom", "left", "right"] as Side[]) {
      const across = side === "top" || side === "bottom";
      // Along the wall: from a tile in from one corner to a tile in from the other (a wall down: two tiles under the wall above).
      const [lo, hi] = across ? [1, x1 - x0 - width] : [4, y1 - y0 - 1 - width];
      if (hi < lo) continue;
      const want = (across ? px - x0 : py - y0) - Math.floor(width / 2);
      const at = Math.min(hi, Math.max(lo, want));
      const candidate: Exit = { ...exit, side, at };
      const door = exitDoor(room.rect, candidate);
      // Every tile just past the door is outside: no room there.
      const beyond = Array.from({ length: width }, (_, i): [number, number] =>
        side === "top" ? [door[0] + i, y0 - 1] : side === "bottom" ? [door[0] + i, y1 + 1] : side === "left" ? [x0 - 1, door[1] + i] : [x1 + 1, door[1] + i],
      );
      if (beyond.some(([x, y]) => within(x, y))) continue;
      const patio = exitPatio(room.rect, candidate);
      if (patio[0] < 1 || patio[1] < 1 || patio[2] > W - 2 || patio[3] > H - 2) continue;
      if (plan.rooms.some((other) => overlaps(patio, other.rect)) || others.some((other) => overlaps(patio, other))) continue;
      const [cx, cy] = [(patio[0] + patio[2] + 1) / 2, (patio[1] + patio[3] + 1) / 2];
      const d = (px + 0.5 - cx) ** 2 + (py + 0.5 - cy) ** 2;
      if (!best || d < best.d) best = { room: room.id, side, at, d };
    }
  }
  return best && { room: best.room, side: best.side, at: best.at };
}
