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
/**
 * A wall's face reaches this far down into the floor in front of it for
 * walking into: your feet stop a little short of its foot, not on it, as if
 * you'd walked up the wall. Short of a tile's middle, so where you can stand
 * is the same tiles.
 */
const FACE_GAP = 12;

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

/**
 * Lighter, warmer floors from the interiors pack's floor sheet, by the
 * column and row their tiles start at there. The lab copies them in below
 * the room builder's own (lab/build.mjs), four across and two rows each,
 * into the floor sheet the app paints from. Only their plain tile is drawn:
 * the walls' shadow on them is worked out, as it is on the grounds, so any
 * of the pack's floors can be one (some draw their edge tiles lighter).
 */
export const MORE_FLOORS: Record<string, [number, number]> = {
  oak: [0, 24],
  cream: [4, 2],
  sage: [12, 2],
  rose: [8, 6],
};
/** Where the nth of them goes on the floor sheet: [column, row], under the room builder's 14 rows. */
export const moreFloorAt = (n: number): [number, number] => [(n % 4) * 4, 14 + Math.floor(n / 4) * 2];
Object.keys(MORE_FLOORS).forEach((name, n) => {
  const [column, row] = moreFloorAt(n);
  FLOORS[name] = row * 16 + column;
});

/**
 * Grounds outside the walls, which the packs don't have: tiles of our own on
 * the floor sheet, under the floors (drawn with the rest of our art and baked
 * by the lab, like the atlas). Grass has `grass` tiles side by side, any of
 * which can sit by any other, and a tile's is picked from where it is, so it
 * never repeats in a way the eye catches; paving is a block `paving` tiles
 * square, after them, that repeats seamlessly.
 */
export const GROUNDS = ["grass", "paving"] as const;
export const GROUND_TILES = { row: 18, grass: 8, paving: 4 };

/** A whole number from a place, the same everywhere: which grass tile goes where. */
function hash(x: number, y: number, salt = 0): number {
  let h = (x * 374761393 + y * 668265263 + salt * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

/** A ground's tile on the floor sheet for the tile at x, y (1-based, as Tiled numbers them). */
function groundTile(material: string, x: number, y: number): number {
  const { row, grass, paving } = GROUND_TILES;
  if (material === "paving") return (row + (y % paving)) * 16 + grass + (x % paving) + 1;
  return row * 16 + (hash(x, y, 1) % grass) + 1;
}

/** How much a wall's shadow darkens the ground at its foot and beside it. */
const SHADOW = 0.86;

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

/**
 * How each wall tile draws. A wall with floor in front of it (below, on
 * screen) shows its face there, two tiles tall: the lower tile, and the upper
 * one with the top's edge; the rest of a wall is its top.
 */
function wallRoles(shell: ShellMap) {
  const [w, h] = shell.size;
  const grid = cells(shell);
  const at = (x: number, y: number): ShellCell => (x < 0 || y < 0 || x >= w || y >= h ? { kind: "void" } : grid[y * w + x]);
  const wall = (x: number, y: number) => at(x, y).kind === "wall";
  const floor = (x: number, y: number) => at(x, y).kind === "floor";
  const role = (x: number, y: number) => {
    if (!wall(x, y)) return null;
    if (floor(x, y + 1)) return "lower";
    if (wall(x, y + 1) && floor(x, y + 2)) return "upper";
    return "top";
  };
  return { at, wall, floor, role };
}

/**
 * Where a shell's walls won't draw right, one line each. A face has to line
 * up with the faces either side of it: the short wall above a door, beside a
 * room's wall, shows its face a tile lower, out of step with it. A face needs
 * wall above its lower tile, or it has no top. And a face is one material
 * along its length, or a seam shows.
 */
export function wallProblems(shell: ShellMap): string[] {
  const [w, h] = shell.size;
  const { at, wall, role } = wallRoles(shell);
  const problems: string[] = [];
  const face = (r: string | null) => r === "upper" || r === "lower";
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const r = role(x, y);
      if (!face(r)) continue;
      if (r === "lower" && !wall(x, y - 1)) problems.push(`the wall at ${x},${y} is one tile deep: its face has no top`);
      const right = role(x + 1, y);
      if (face(right) && right !== r) problems.push(`the walls at ${x},${y} and ${x + 1},${y} show their faces out of step`);
      if (face(right) && right === r && at(x + 1, y).material !== at(x, y).material) problems.push(`the wall's face changes material at ${x + 1},${y}`);
    }
  }
  return problems;
}

/** The shell's pixels, drawn from the room builder sheet's: the floor's walls and floors as one picture. */
export function paintShell(shell: ShellMap, sheet: Pixels): Pixels & { data: Uint8ClampedArray } {
  const [w, h] = shell.size;
  const { at, wall, floor, role } = wallRoles(shell);

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
  /** An art pixel of a floor sheet tile (1-based ids, as Tiled numbers them), copied; `dim` darkens it, for a shadow. */
  const copy = (ax: number, ay: number, tile: number, lx: number, ly: number, dim = 1) => {
    const i = tile - 1;
    const o = ((Math.floor(i / columns) * TILE + ly * ART) * sheet.width + (i % columns) * TILE + lx * ART) * 4;
    put(ax, ay, pixels[o] * dim, pixels[o + 1] * dim, pixels[o + 2] * dim, pixels[o + 3]);
  };

  // A tile at a time: what it is, and the tile its pattern comes from, are worked out once for all its art pixels.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cell = at(x, y);
      const face = cell.kind === "wall" ? (WALLS[cell.material ?? ""] ?? WALLS.lavender)[role(x, y) === "upper" ? "upper" : "lower"] : 0;
      const outdoor = cell.kind === "floor" && (GROUNDS as readonly string[]).includes(cell.material ?? "") ? cell.material! : null;
      const pack = cell.kind === "floor" && !outdoor && cell.material! in MORE_FLOORS;
      const ground = cell.kind === "floor" && !outdoor ? floorTile(FLOORS[cell.material ?? ""] ?? FLOORS.plank, !pack && wall(x, y - 1), !pack && wall(x - 1, y), !pack && wall(x - 1, y - 1)) : 0;
      const shaded = outdoor || pack;
      const shadeAbove = shaded && wall(x, y - 1), shadeLeft = shaded && wall(x - 1, y);
      const groundTileHere = outdoor ? groundTile(outdoor, x, y) : 0;
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
          } else if (outdoor) {
            // A wall's shadow on the ground: a band along its foot, and down its side.
            copy(ax, ay, groundTileHere, lx, ly, (shadeAbove && ly < 4) || (shadeLeft && lx < 3) ? SHADOW : 1);
          } else if (cell.kind === "floor") {
            copy(ax, ay, ground, lx, ly, pack && ((shadeAbove && ly < 4) || (shadeLeft && lx < 3)) ? SHADOW : 1);
          } else {
            fill(ax, ay, OUTLINE);
          }
        }
      }
    }
  }
  return out;
}

/** What you can't walk through: every wall tile, a little in front of a wall at your side, and a little below its face. */
export function wallSolids(shell: ShellMap): Array<[number, number, number, number]> {
  const [w, h] = shell.size;
  const grid = cells(shell);
  const floor = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && grid[y * w + x].kind === "floor";
  const wall = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && grid[y * w + x].kind === "wall";
  // Longer down than a wall across is deep (two tiles): the side of a doorway through one isn't a wall to keep off.
  const runsDown = (x: number, y: number) => {
    let n = 1;
    for (let k = y - 1; wall(x, k) && n < 3; k--) n++;
    for (let k = y + 1; wall(x, k) && n < 3; k++) n++;
    return n >= 3;
  };
  return grid.flatMap((cell, i): Array<[number, number, number, number]> => {
    if (cell.kind !== "wall") return [];
    const x = i % w, y = Math.floor(i / w);
    // Beside a wall running down the room you stop short of it, not with half of you on it.
    const down = runsDown(x, y);
    const left = down && floor(x - 1, y) ? SIDE_GAP : 0;
    const right = down && floor(x + 1, y) ? SIDE_GAP : 0;
    const below = floor(x, y + 1) ? FACE_GAP : 0;
    return [[x * TILE - left, y * TILE, TILE + left + right, TILE + below]];
  });
}

/** Fills a rectangle of tiles with one legend character: how the lab's editor paints walls and floors. */
export function paint(shell: ShellMap, x0: number, y0: number, x1: number, y1: number, char: string): void {
  const [w, h] = shell.size;
  const [ax, bx] = [Math.max(0, Math.min(x0, x1)), Math.min(w - 1, Math.max(x0, x1))];
  const [ay, by] = [Math.max(0, Math.min(y0, y1)), Math.min(h - 1, Math.max(y0, y1))];
  const grid = shell.rows.map((row) => row.padEnd(w, " ").split(""));
  const kind = (ch: string | undefined) => (ch === undefined ? "void" : (shell.legend[ch]?.kind ?? "void"));
  const isGround = (ch: string | undefined) => (GROUNDS as readonly string[]).includes(shell.legend[ch ?? ""]?.material ?? "");
  for (let x = ax; x <= bx; x++) {
    // A floor painted through a wall across is a doorway, and its floor is the room above's, running on through the gap.
    const above = grid[ay - 1]?.[x];
    const through = kind(char) === "floor" && !isGround(char) && kind(above) === "floor" && !isGround(above) ? above! : char;
    for (let y = ay; y <= by; y++) grid[y][x] = kind(grid[y][x]) === "wall" ? through : char;
  }
  shell.rows = grid.map((chars) => chars.join(""));
}
