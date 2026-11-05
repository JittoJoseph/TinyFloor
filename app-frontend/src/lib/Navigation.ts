import { MAP_WIDTH_TILES, MAP_HEIGHT_TILES, isValidTile } from "shared-protocol/map";
import { pixelToTile, tileToPixel, TILE_SIZE } from "web-shared/lib/types";

export interface Vec {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const STRAIGHT = 10;
const DIAGONAL = 14;
const TURN = 1;
const DIRS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
  [1, -1],
  [1, 1],
  [-1, 1],
  [-1, -1],
];

function heapPush(heap: number[], node: number, f: Int32Array) {
  heap.push(node);
  let i = heap.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (f[heap[p]] <= f[heap[i]]) break;
    [heap[p], heap[i]] = [heap[i], heap[p]];
    i = p;
  }
}

function heapPop(heap: number[], f: Int32Array): number {
  const top = heap[0];
  const last = heap.pop()!;
  if (heap.length) {
    heap[0] = last;
    let i = 0;
    for (;;) {
      const l = i * 2 + 1;
      const r = l + 1;
      let m = i;
      if (l < heap.length && f[heap[l]] < f[heap[m]]) m = l;
      if (r < heap.length && f[heap[r]] < f[heap[m]]) m = r;
      if (m === i) break;
      [heap[m], heap[i]] = [heap[i], heap[m]];
      i = m;
    }
  }
  return top;
}

/** How far apart a straight line is checked for walls, in pixels. */
const LINE_STEP = TILE_SIZE / 8;
/** How far out from the line the ground must be clear: a character's half-width and a little. */
const MARGIN = TILE_SIZE * 0.3;
const BODY = [
  [0, 0],
  [-MARGIN, -MARGIN],
  [MARGIN, -MARGIN],
  [-MARGIN, MARGIN],
  [MARGIN, MARGIN],
] as const;

function heuristic(ax: number, ay: number, bx: number, by: number): number {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return STRAIGHT * Math.max(dx, dy) + (DIAGONAL - STRAIGHT) * Math.min(dx, dy);
}

export class NavGrid {
  private walkable: Uint8Array;

  constructor(solids: Rect[]) {
    this.walkable = new Uint8Array(MAP_WIDTH_TILES * MAP_HEIGHT_TILES);
    this.rebuild(solids);
  }

  /** Works out again where you can walk, for what's solid now. */
  rebuild(solids: Rect[]) {
    this.walkable.fill(0);
    for (let ty = 0; ty < MAP_HEIGHT_TILES; ty++) {
      for (let tx = 0; tx < MAP_WIDTH_TILES; tx++) if (isValidTile(tx, ty)) this.walkable[ty * MAP_WIDTH_TILES + tx] = 1;
    }
    // Walkable where you could stand: nothing solid over the tile's middle (as MapManager.checkCollisionAt has it).
    // Each solid strikes out the tiles whose middles it covers, so this is quick however many pieces there are.
    const half = TILE_SIZE / 2;
    for (const r of solids) {
      const x0 = Math.max(0, Math.floor((r.x - half) / TILE_SIZE) + 1);
      const x1 = Math.min(MAP_WIDTH_TILES - 1, Math.ceil((r.x + r.width - half) / TILE_SIZE) - 1);
      const y0 = Math.max(0, Math.floor((r.y - half) / TILE_SIZE) + 1);
      const y1 = Math.min(MAP_HEIGHT_TILES - 1, Math.ceil((r.y + r.height - half) / TILE_SIZE) - 1);
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) this.walkable[ty * MAP_WIDTH_TILES + tx] = 0;
    }
  }

  isWalkable(tx: number, ty: number): boolean {
    return (
      tx >= 0 &&
      ty >= 0 &&
      tx < MAP_WIDTH_TILES &&
      ty < MAP_HEIGHT_TILES &&
      this.walkable[ty * MAP_WIDTH_TILES + tx] === 1
    );
  }

  nearestWalkable(
    tileX: number,
    tileY: number,
    range = 3,
  ): { tileX: number; tileY: number } | null {
    let best: { tileX: number; tileY: number } | null = null;
    let bestAway = Infinity;
    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        const away = dx * dx + dy * dy;
        if (away >= bestAway || !this.isWalkable(tileX + dx, tileY + dy)) continue;
        best = { tileX: tileX + dx, tileY: tileY + dy };
        bestAway = away;
      }
    }
    return best;
  }

  /**
   * The way from a point to a tile: the grid's shortest path, then pulled
   * straight wherever there's room to walk a straight line (string pulling,
   * as PathFinding.js's smoothenPath does it). On the grid alone, a walk five
   * across and two down went diagonally and then straight, a bend nobody
   * would make; now it's one line. Everyone works a walk out this same way
   * (PlayerManager.walkPlayerTo), so they all see the same one.
   */
  buildPath(fromX: number, fromY: number, goalX: number, goalY: number): Vec[] {
    const from = pixelToTile(fromX, fromY);
    const tiles = this.findTiles(from.tileX, from.tileY, goalX, goalY);
    if (!tiles.length) return [];
    return this.straighten({ x: fromX, y: fromY }, tiles.map((t) => tileToPixel(t.x, t.y)));
  }

  /** From `start`, straight to the farthest point along the way that can be reached in a line, and on from there. */
  private straighten(start: Vec, points: Vec[]): Vec[] {
    const path: Vec[] = [];
    let anchor = start;
    let next = 0;
    while (next < points.length) {
      let far = points.length - 1;
      while (far > next && !this.clearLine(anchor, points[far])) far--;
      // Even the next tile's middle may not be in a clean line from where we stand off-centre: then we go by it.
      if (far === next && path.length === 0 && !this.clearLine(anchor, points[far])) {
        const tile = pixelToTile(anchor.x, anchor.y);
        const middle = tileToPixel(tile.tileX, tile.tileY);
        if (middle.x !== anchor.x || middle.y !== anchor.y) path.push(middle);
      }
      path.push(points[far]);
      anchor = points[far];
      next = far + 1;
    }
    return path;
  }

  /**
   * Whether someone can walk straight from a to b: every step along it, the
   * ground under them and a little to every side of them is walkable, so a
   * line never shaves a wall's corner or the edge of a desk.
   */
  private clearLine(a: Vec, b: Vec): boolean {
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(length / LINE_STEP));
    for (let i = 0; i <= steps; i++) {
      const x = a.x + ((b.x - a.x) * i) / steps;
      const y = a.y + ((b.y - a.y) * i) / steps;
      for (const [ox, oy] of BODY) {
        const tile = pixelToTile(x + ox, y + oy);
        if (!this.isWalkable(tile.tileX, tile.tileY)) return false;
      }
    }
    return true;
  }

  private findTiles(sx: number, sy: number, gx: number, gy: number): Vec[] {
    const start = sy * MAP_WIDTH_TILES + sx;
    const goal = gy * MAP_WIDTH_TILES + gx;
    if (start === goal || !this.isWalkable(gx, gy)) return [];

    const size = MAP_WIDTH_TILES * MAP_HEIGHT_TILES;
    const g = new Int32Array(size).fill(-1);
    const f = new Int32Array(size);
    const from = new Int32Array(size).fill(-1);
    const step = new Int32Array(size);
    const closed = new Uint8Array(size);
    const heap: number[] = [];

    g[start] = 0;
    f[start] = heuristic(sx, sy, gx, gy);
    heapPush(heap, start, f);

    while (heap.length) {
      const cur = heapPop(heap, f);
      if (cur === goal) break;
      if (closed[cur]) continue;
      closed[cur] = 1;

      const cx = cur % MAP_WIDTH_TILES;
      const cy = (cur - cx) / MAP_WIDTH_TILES;

      for (const [dx, dy] of DIRS) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (!this.isWalkable(nx, ny)) continue;
        if (
          dx &&
          dy &&
          (!this.isWalkable(cx + dx, cy) || !this.isWalkable(cx, cy + dy))
        )
          continue;

        const n = ny * MAP_WIDTH_TILES + nx;
        if (closed[n]) continue;

        const move = n - cur;
        const turned = cur !== start && move !== step[cur] ? TURN : 0;
        const cost = g[cur] + (dx && dy ? DIAGONAL : STRAIGHT) + turned;
        if (g[n] === -1 || cost < g[n]) {
          g[n] = cost;
          from[n] = cur;
          step[n] = move;
          f[n] = cost + heuristic(nx, ny, gx, gy);
          heapPush(heap, n, f);
        }
      }
    }

    if (from[goal] === -1) return [];

    const nodes: number[] = [];
    for (let n = goal; n !== start; n = from[n]) nodes.push(n);
    nodes.reverse();
    return nodes.map((node) => {
      const x = node % MAP_WIDTH_TILES;
      return { x, y: (node - x) / MAP_WIDTH_TILES };
    });
  }
}

/**
 * The eight headings a `move` carries, clockwise from east. Everyone walks a
 * heading the same way, so the sender can predict what the others are drawing
 * and only correct them when it drifts.
 */
const HEADINGS: Vec[] = Array.from({ length: 8 }, (_, index) => ({
  x: Math.round(Math.cos((index * Math.PI) / 4) * 1e6) / 1e6,
  y: Math.round(Math.sin((index * Math.PI) / 4) * 1e6) / 1e6,
}));

/** The heading nearest a direction of travel, or null when there is none. */
export function headingOf(dx: number, dy: number): number | null {
  if (!dx && !dy) return null;
  return (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8;
}

export function headingVector(heading: number): Vec {
  return HEADINGS[heading];
}

/** Walks `pos` along a heading, stopping at a wall. False when it couldn't move. */
export function advanceHeading(pos: Vec, heading: number, step: number, nav: NavGrid): boolean {
  const dir = HEADINGS[heading];
  const x = pos.x + dir.x * step;
  const y = pos.y + dir.y * step;
  const tile = pixelToTile(x, y);
  if (!nav.isWalkable(tile.tileX, tile.tileY)) return false;
  pos.x = x;
  pos.y = y;
  return true;
}

export function advanceAlongPath(pos: Vec, path: Vec[], step: number) {
  let remaining = step;
  while (remaining > 0 && path.length) {
    const wp = path[0];
    const dx = wp.x - pos.x;
    const dy = wp.y - pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= remaining) {
      pos.x = wp.x;
      pos.y = wp.y;
      remaining -= dist;
      path.shift();
    } else {
      pos.x += (dx / dist) * remaining;
      pos.y += (dy / dist) * remaining;
      remaining = 0;
    }
  }
}
