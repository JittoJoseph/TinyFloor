// The office's walls and floors, drawn from a plain map of what each tile is
// (wall, a floor material, or nothing) instead of placed by hand, so any shape
// of wall comes out right: ends, corners, joins and door openings included.
//
// The packs draw walls in 3/4 view at two pixels per art pixel: a white top
// outlined in #3a3a50, and a face two tiles tall under any wall with floor in
// front of it. So each art pixel is sorted into wall top, wall face or floor,
// and the outline is wherever the top meets anything else, and wherever a face
// meets floor. Nothing is looked up; it is worked out, like a geometry rule.

export const TILE = 32;
const ART = 2;
const N = TILE / ART;
const OUTLINE = [0x3a, 0x3a, 0x50];
// One white for every wall top, the cap above a face included, so a wall meeting another reads as one surface.
const TOP = [0xf8, 0xf8, 0xf8];
/** How deep, in art pixels, a wall's top shows above its face: the cap band and the line under it. */
const CAP_ROWS = 6;

export const ROOM_BUILDER = "/app/tilesets/textures/Room_Builder_Office_32x32.png";

/** Wall faces, by the room builder tiles their pattern is taken from (the middle pieces, upper and lower). */
export const WALLS = {
  lavender: { upper: 178, lower: 194 },
  "lavender-pattern": { upper: 82, lower: 98 },
  grey: { upper: 114, lower: 130 },
  brick: { upper: 146, lower: 162 },
};

/**
 * Floors, by their first room builder tile: each is four tiles, plain and with
 * the shadow a wall casts from above, from the left, and from both.
 */
export const FLOORS = {
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
 * A floor tile with the shadow the walls cast on it: from a wall above, from
 * one on the left, from both, or, with neither, the small shadow of a wall's
 * corner up and to the left (where a wall ends beside a doorway, say).
 */
const floorTile = (base, above, left, corner) => base + (above && left ? 1 : above ? 2 : left ? 17 : corner ? 3 : 18);

/** A shell's rows as kinds: { kind: "wall" | "floor" | "void", material }. */
export function cells(shell) {
  const [w, h] = shell.size;
  const grid = [];
  for (let y = 0; y < h; y++) {
    const row = shell.rows[y] ?? "";
    for (let x = 0; x < w; x++) grid.push(shell.legend[row[x] ?? " "] ?? { kind: "void" });
  }
  return grid;
}

/** Draws the shell into a new canvas, the size of the floor. */
export async function renderShell(shell, loadImage) {
  const [w, h] = shell.size;
  const grid = cells(shell);
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? { kind: "void" } : grid[y * w + x]);
  const wall = (x, y) => at(x, y).kind === "wall";
  const floor = (x, y) => at(x, y).kind === "floor";

  // A wall with floor in front of it (below, on screen) shows its face there,
  // two tiles tall: the lower tile, and the upper one with the top's edge.
  const role = (x, y) => {
    if (!wall(x, y)) return null;
    if (floor(x, y + 1)) return "lower";
    if (wall(x, y + 1) && floor(x, y + 2)) return "upper";
    return "top";
  };

  const sheet = await loadImage(ROOM_BUILDER);
  const source = document.createElement("canvas");
  source.width = sheet.width;
  source.height = sheet.height;
  const sctx = source.getContext("2d", { willReadFrequently: true });
  sctx.drawImage(sheet, 0, 0);
  const pixels = sctx.getImageData(0, 0, sheet.width, sheet.height).data;
  const columns = sheet.width / TILE;
  /** An art pixel of a room builder tile (1-based ids, as Tiled numbers them). */
  const sample = (tile, ax, ay) => {
    const i = tile - 1;
    const px = (i % columns) * TILE + ax * ART;
    const py = Math.floor(i / columns) * TILE + ay * ART;
    const o = (py * sheet.width + px) * 4;
    return [pixels[o], pixels[o + 1], pixels[o + 2], pixels[o + 3]];
  };

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
  const isT = (ax, ay) => (ax < 0 || ay < 0 || ax >= AW || ay >= AH ? 0 : T[ay * AW + ax]);
  const isWall = (ax, ay) => (ax < 0 || ay < 0 || ax >= AW || ay >= AH ? 1 : T[ay * AW + ax] || F[ay * AW + ax]);

  const out = new ImageData(w * TILE, h * TILE);
  const put = (ax, ay, [r, g, b, a = 255]) => {
    for (let dy = 0; dy < ART; dy++) {
      for (let dx = 0; dx < ART; dx++) {
        const o = ((ay * ART + dy) * w * TILE + ax * ART + dx) * 4;
        out.data[o] = r;
        out.data[o + 1] = g;
        out.data[o + 2] = b;
        out.data[o + 3] = a;
      }
    }
  };

  for (let ay = 0; ay < AH; ay++) {
    for (let ax = 0; ax < AW; ax++) {
      const x = Math.floor(ax / N), y = Math.floor(ay / N), lx = ax % N, ly = ay % N;
      const i = ay * AW + ax;
      const cell = at(x, y);
      if (T[i]) {
        let edge = false;
        for (let dy = -1; dy <= 1 && !edge; dy++) for (let dx = -1; dx <= 1; dx++) if (!isT(ax + dx, ay + dy)) edge = true;
        put(ax, ay, edge ? OUTLINE : TOP);
      } else if (F[i]) {
        const edge = !isWall(ax - 1, ay) || !isWall(ax + 1, ay) || !isWall(ax, ay + 1) || !isWall(ax, ay - 1);
        const material = WALLS[cell.material] ?? WALLS.lavender;
        put(ax, ay, edge ? OUTLINE : sample(role(x, y) === "upper" ? material.upper : material.lower, lx, ly));
      } else if (cell.kind === "floor") {
        const base = FLOORS[cell.material] ?? FLOORS.plank;
        put(ax, ay, sample(floorTile(base, wall(x, y - 1), wall(x - 1, y), wall(x - 1, y - 1)), lx, ly));
      } else {
        put(ax, ay, OUTLINE);
      }
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = w * TILE;
  canvas.height = h * TILE;
  canvas.getContext("2d").putImageData(out, 0, 0);
  return canvas;
}

/** What you can't walk through: every wall tile, and a little in front of a wall at your side. */
export function wallSolids(shell) {
  const [w, h] = shell.size;
  const grid = cells(shell);
  const floor = (x, y) => x >= 0 && y >= 0 && x < w && y < h && grid[y * w + x].kind === "floor";
  return grid.flatMap((cell, i) => {
    if (cell.kind !== "wall") return [];
    const x = i % w, y = Math.floor(i / w);
    // Beside a wall running down the room you stop short of it, not with half of you on it.
    const left = floor(x - 1, y) ? SIDE_GAP : 0;
    const right = floor(x + 1, y) ? SIDE_GAP : 0;
    return [[x * TILE - left, y * TILE, TILE + left + right, TILE]];
  });
}

/** How far into the room a wall at your side keeps you: your feet are your middle, and you're about this wide either side of it. */
const SIDE_GAP = 16;

/** Fills a rectangle of tiles with one legend character: how the editor paints walls and floors. */
export function paint(shell, x0, y0, x1, y1, char) {
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
