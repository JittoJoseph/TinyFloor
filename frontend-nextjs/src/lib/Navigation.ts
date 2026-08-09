import {
  MAP_WIDTH_TILES,
  MAP_HEIGHT_TILES,
  isValidTile,
  pixelToTile,
  tileToPixel,
} from "./types";

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

const CORE = 8;
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

function heuristic(ax: number, ay: number, bx: number, by: number): number {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return STRAIGHT * Math.max(dx, dy) + (DIAGONAL - STRAIGHT) * Math.min(dx, dy);
}

export class NavGrid {
  private walkable: Uint8Array;

  constructor(solids: Rect[]) {
    this.walkable = new Uint8Array(MAP_WIDTH_TILES * MAP_HEIGHT_TILES);
    for (let ty = 0; ty < MAP_HEIGHT_TILES; ty++) {
      for (let tx = 0; tx < MAP_WIDTH_TILES; tx++) {
        if (!isValidTile(tx, ty)) continue;
        const c = tileToPixel(tx, ty);
        const blocked = solids.some(
          (r) =>
            c.x + CORE > r.x &&
            c.x - CORE < r.x + r.width &&
            c.y + CORE > r.y &&
            c.y - CORE < r.y + r.height,
        );
        if (!blocked) this.walkable[ty * MAP_WIDTH_TILES + tx] = 1;
      }
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

  buildPath(fromX: number, fromY: number, goalX: number, goalY: number): Vec[] {
    const from = pixelToTile(fromX, fromY);
    const turns = this.findTurns(from.tileX, from.tileY, goalX, goalY);
    if (!turns.length) return [];

    const path = turns.map((t) => tileToPixel(t.x, t.y));
    const origin = tileToPixel(from.tileX, from.tileY);
    if (fromX !== origin.x || fromY !== origin.y) path.unshift(origin);
    return path;
  }

  private findTurns(sx: number, sy: number, gx: number, gy: number): Vec[] {
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

    const turns: Vec[] = [];
    for (let i = 0; i < nodes.length; i++) {
      if (i + 1 < nodes.length && step[nodes[i + 1]] === step[nodes[i]]) continue;
      const x = nodes[i] % MAP_WIDTH_TILES;
      turns.push({ x, y: (nodes[i] - x) / MAP_WIDTH_TILES });
    }
    return turns;
  }
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
