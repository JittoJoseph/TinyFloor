// The office's walls and floors, drawn from a plain map of what each tile is
// (wall, a floor material, or nothing) instead of placed by hand, so any shape
// of wall comes out right: ends, corners, joins and door openings included.
// One drawing for everywhere: the app draws the floor's walls with it, the lab
// (lab/pages/shell.js, whose server strips the types) its editor's.
//
// The packs draw walls in 3/4 view at two pixels per art pixel: a white top
// outlined in #3a3a50, and a face two tiles tall under any wall with floor in
// front of it. So each art pixel is sorted into wall top, wall face or floor,
// and the outline is wherever the top meets anything else, and wherever a face
// meets floor. Nothing is looked up; it is worked out, like a geometry rule.

export const TILE = 32;
const ART = 2;
const N = TILE / ART;
type Rgba = [number, number, number, number?];
const OUTLINE: Rgba = [0x3a, 0x3a, 0x50];
// One white for every wall top, the cap above a face included, so a wall meeting another reads as one surface.
const TOP: Rgba = [0xf8, 0xf8, 0xf8];
/** How deep, in art pixels, a wall's top shows above its face: the cap band and the line under it. */
const CAP_ROWS = 6;
/** How far into the room a wall at your side keeps you: your feet are your middle, and you're about this wide either side of it. */
const SIDE_GAP = 16;

/** Wall faces, by the room builder tiles their pattern is taken from (the middle pieces, upper and lower). */
export const WALLS: Record<string, { upper: number; lower: number }> = {
  lavender: { upper: 178, lower: 194 },
  "lavender-pattern": { upper: 82, lower: 98 },
  grey: { upper: 114, lower: 130 },
  brick: { upper: 146, lower: 162 },
};

/**
 * Floors, by their first room builder tile: each is four tiles, plain and with
 * the shadow a wall casts from above, from the left, and from both.
 */
export const FLOORS: Record<string, number> = {
  plank: 90,
  "plank-light": 93,
  graphite: 122,
  olive: 125,
  tile: 154,
  "olive-tile": 157,
  maroon: 186,
  mauve: 189,
};

export interface ShellCell {
  kind: "wall" | "floor" | "void";
  material?: string;
}

/** A floor's walls and floors: one character a tile, from its legend. */
export interface ShellMap {
  size: [number, number];
  legend: Record<string, ShellCell>;
  rows: string[];
}

/** Pixels, RGBA, as a canvas's ImageData or a PNG's. */
export interface Pixels {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array;
}

/**
 * A floor tile with the shadow the walls cast on it: from a wall above, from
 * one on the left, from both, or, with neither, the small shadow of a wall's
 * corner up and to the left (where a wall ends beside a doorway, say).
 */
const floorTile = (base: number, above: boolean, left: boolean, corner: boolean) => base + (above && left ? 1 : above ? 2 : left ? 17 : corner ? 3 : 18);

/** A shell's tiles, row by row. */
export function cells(shell: ShellMap): ShellCell[] {
  const [w, h] = shell.size;
  const grid: ShellCell[] = [];
  for (let y = 0; y < h; y++) {
    const row = shell.rows[y] ?? "";
    for (let x = 0; x < w; x++) grid.push(shell.legend[row[x] ?? " "] ?? { kind: "void" });
  }
  return grid;
}

/** The shell's pixels, drawn from the room builder sheet's: the floor's walls and floors as one picture. */
export function paintShell(shell: ShellMap, sheet: Pixels): Pixels & { data: Uint8ClampedArray } {
  const [w, h] = shell.size;
  const grid = cells(shell);
  const at = (x: number, y: number): ShellCell => (x < 0 || y < 0 || x >= w || y >= h ? { kind: "void" } : grid[y * w + x]);
  const wall = (x: number, y: number) => at(x, y).kind === "wall";
  const floor = (x: number, y: number) => at(x, y).kind === "floor";

  // A wall with floor in front of it (below, on screen) shows its face there,
  // two tiles tall: the lower tile, and the upper one with the top's edge.
  const role = (x: number, y: number) => {
    if (!wall(x, y)) return null;
    if (floor(x, y + 1)) return "lower";
    if (wall(x, y + 1) && floor(x, y + 2)) return "upper";
    return "top";
  };

  const pixels = sheet.data;
  const columns = sheet.width / TILE;

  // Art pixels: which are the wall's top (T) and which its face (F).
  const AW = w * N, AH = h * N;
  const T = new Uint8Array(AW * AH);
  const F = new Uint8Array(AW * AH);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const r = role(x, y);
      if (!r) continue;
      for (let ly = 0; ly < N; ly++) {
        for (let lx = 0; lx < N; lx++) {
          const i = (y * N + ly) * AW + x * N + lx;
          if (r === "top" || (r === "upper" && ly < CAP_ROWS)) T[i] = 1;
          else F[i] = 1;
        }
      }
    }
  }
  // Off the map isn't wall top, so an outer wall is outlined along the map's edge too.
  const isT = (ax: number, ay: number) => (ax < 0 || ay < 0 || ax >= AW || ay >= AH ? 0 : T[ay * AW + ax]);
  const isWall = (ax: number, ay: number) => (ax < 0 || ay < 0 || ax >= AW || ay >= AH ? 1 : T[ay * AW + ax] || F[ay * AW + ax]);

  const out = { width: w * TILE, height: h * TILE, data: new Uint8ClampedArray(w * TILE * h * TILE * 4) };
  const data = out.data;
  const stride = w * TILE * 4;
  // Each art pixel is ART by ART screen pixels, of one colour.
  const put = (ax: number, ay: number, r: number, g: number, b: number, a: number) => {
    for (let dy = 0; dy < ART; dy++) {
      let o = (ay * ART + dy) * stride + ax * ART * 4;
      for (let dx = 0; dx < ART; dx++, o += 4) {
        data[o] = r;
        data[o + 1] = g;
        data[o + 2] = b;
        data[o + 3] = a;
      }
    }
  };
  const fill = (ax: number, ay: number, [r, g, b, a = 255]: Rgba) => put(ax, ay, r, g, b, a);
  /** An art pixel of a room builder tile (1-based ids, as Tiled numbers them), copied. */
  const copy = (ax: number, ay: number, tile: number, lx: number, ly: number) => {
    const i = tile - 1;
    const o = ((Math.floor(i / columns) * TILE + ly * ART) * sheet.width + (i % columns) * TILE + lx * ART) * 4;
    put(ax, ay, pixels[o], pixels[o + 1], pixels[o + 2], pixels[o + 3]);
  };

  // A tile at a time: what it is, and the tile its pattern comes from, are worked out once for all its art pixels.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cell = at(x, y);
      const face = cell.kind === "wall" ? (WALLS[cell.material ?? ""] ?? WALLS.lavender)[role(x, y) === "upper" ? "upper" : "lower"] : 0;
      const ground = cell.kind === "floor" ? floorTile(FLOORS[cell.material ?? ""] ?? FLOORS.plank, wall(x, y - 1), wall(x - 1, y), wall(x - 1, y - 1)) : 0;
      for (let ly = 0; ly < N; ly++) {
        const ay = y * N + ly;
        for (let lx = 0; lx < N; lx++) {
          const ax = x * N + lx;
          const i = ay * AW + ax;
          if (T[i]) {
            let edge = false;
            for (let dy = -1; dy <= 1 && !edge; dy++) for (let dx = -1; dx <= 1; dx++) if (!isT(ax + dx, ay + dy)) edge = true;
            fill(ax, ay, edge ? OUTLINE : TOP);
          } else if (F[i]) {
            const edge = !isWall(ax - 1, ay) || !isWall(ax + 1, ay) || !isWall(ax, ay + 1) || !isWall(ax, ay - 1);
            if (edge) fill(ax, ay, OUTLINE);
            else copy(ax, ay, face, lx, ly);
          } else if (cell.kind === "floor") {
            copy(ax, ay, ground, lx, ly);
          } else {
            fill(ax, ay, OUTLINE);
          }
        }
      }
    }
  }
  return out;
}

/** What you can't walk through: every wall tile, and a little in front of a wall at your side. */
export function wallSolids(shell: ShellMap): Array<[number, number, number, number]> {
  const [w, h] = shell.size;
  const grid = cells(shell);
  const floor = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && grid[y * w + x].kind === "floor";
  return grid.flatMap((cell, i): Array<[number, number, number, number]> => {
    if (cell.kind !== "wall") return [];
    const x = i % w, y = Math.floor(i / w);
    // Beside a wall running down the room you stop short of it, not with half of you on it.
    const left = floor(x - 1, y) ? SIDE_GAP : 0;
    const right = floor(x + 1, y) ? SIDE_GAP : 0;
    return [[x * TILE - left, y * TILE, TILE + left + right, TILE]];
  });
}

/** Fills a rectangle of tiles with one legend character: how the lab's editor paints walls and floors. */
export function paint(shell: ShellMap, x0: number, y0: number, x1: number, y1: number, char: string): void {
  const [w, h] = shell.size;
  const [ax, bx] = [Math.max(0, Math.min(x0, x1)), Math.min(w - 1, Math.max(x0, x1))];
  const [ay, by] = [Math.max(0, Math.min(y0, y1)), Math.min(h - 1, Math.max(y0, y1))];
  shell.rows = shell.rows.map((row, y) => {
    if (y < ay || y > by) return row;
    const chars = row.padEnd(w, " ").split("");
    for (let x = ax; x <= bx; x++) chars[x] = char;
    return chars.join("");
  });
}
