// An office, from what's stored to what's drawn: the one place that turns a
// shell, a layout, a seed and people's changes into the pieces on the floor.
//
//   stored:  shell (walls and floors), layout { seed, items, overrides }
//   drawn:   pieces [{ key, item, x, y, depth, seat?, entry? }]
//
// Every piece has a key that stays the same from one load to the next:
// "wall:15,2/3" is the third thing along the wall that starts at tile 15,2;
// "k3x9/front-1/things/0" the first thing on the near desk of bank k3x9's
// second desk. Pieces come from three places:
//
// - placed: what someone put down (an item, a bundle, a desk bank);
// - generated: what the office fills in by itself, from its seed: the things
//   on every desk, a bank's end plants, and what stands along each room's top
//   wall. Each generator draws its randomness from the seed and the piece's own
//   key, so adding a desk never changes another desk, and every device works
//   out the same office;
// - overrides: what people changed, stored by key and applied last: hidden,
//   moved, swapped for another item, or a desk's own list of things.
//
// So an untouched office stores its seed and its layout; a changed one, a few
// small overrides more.
import { DESK_STEP, clusterSize, depthOf, expand, isCluster, random, spriteSize } from "./catalog.js";
import { TILE, cells } from "./shell.js";

/** All the pieces of an office, in draw order. */
export function buildFloor(byId, shell, layout) {
  const seed = layout.seed ?? 0;
  const overrides = layout.overrides ?? {};
  const placed = [];
  for (const entry of layout.items) {
    const pieces = isCluster(byId.get(entry.item))
      ? expand(byId, entry.item, entry.x, entry.y, entry.choose, { size: entry.size, seed, key: entry.id, salt: entry.salt, overrides })
      : expand(byId, entry.item, entry.x, entry.y, entry.choose).map((piece, n) => ({ ...piece, key: n ? `${entry.id}/${n}` : entry.id }));
    for (const piece of pieces) placed.push({ ...piece, entry });
  }
  const dressing = dressWalls(byId, shell, seed, placed);
  const all = [...dressing, ...placed].flatMap((piece) => applyOverride(byId, piece, overrides[piece.key]));
  for (const piece of all) piece.depth = depth(piece, all);
  return all.sort((a, b) => a.depth - b.depth);
}

/** A person's change to one piece: hidden, moved, or swapped for another item. */
function applyOverride(byId, piece, change) {
  if (!change) return [piece];
  if (change.hidden) return [];
  const item = (change.item && byId.get(change.item)) || piece.item;
  const [x, y] = change.at ?? [piece.x, piece.y];
  return [{ ...piece, item, x, y, changed: true }];
}

/**
 * Draw order, as the floor does it: by where each thing stands. A rug under
 * everything, things on a wall just over it, things on a desk just over that
 * desk.
 */
function depth(piece, all) {
  const { item } = piece;
  if (item.mount === "rug") return 1.5;
  if (item.mount === "wall") return 2;
  return depthOf(piece, all);
}

// ---------- walls: what stands along them ----------

/**
 * Each room's top wall, where floor meets a wall's face: [{ x, y, length }]
 * in tiles, y being the first floor row. A doorway in the wall splits it.
 */
export function topWalls(shell) {
  const [w, h] = shell.size;
  const grid = cells(shell);
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? { kind: "void" } : grid[y * w + x]);
  // Floor under a wall's face; not a doorway in a wall running down the room (walls either side), which only looks like one.
  const faced = (x, y) =>
    at(x, y).kind === "floor" && at(x, y - 1).kind === "wall" && at(x, y - 2).kind === "wall" && !(at(x - 1, y).kind === "wall" && at(x + 1, y).kind === "wall");
  const runs = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!faced(x, y) || faced(x - 1, y)) continue;
      let length = 1;
      while (faced(x + length, y)) length++;
      if (length >= 3) runs.push({ x, y, length });
    }
  }
  return runs;
}

/**
 * Each room's side walls, where floor runs down beside a wall: [{ x, y, length,
 * side }] in tiles, side being which side of the floor the wall is on.
 */
export function sideWalls(shell) {
  const [w, h] = shell.size;
  const grid = cells(shell);
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? { kind: "void" } : grid[y * w + x]);
  const runs = [];
  for (const [side, dx] of [["left", -1], ["right", 1]]) {
    const beside = (x, y) => at(x, y).kind === "floor" && at(x + dx, y).kind === "wall";
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        if (!beside(x, y) || beside(x, y - 1)) continue;
        let length = 1;
        while (beside(x, y + length)) length++;
        if (length >= 4) runs.push({ x, y, length, side });
      }
    }
  }
  return runs;
}

/**
 * What stands against the walls and hangs on them, picked from the seed.
 *
 * Along each room's top wall, things come in groups, the way an office fills
 * up: a shelf beside a cooler, a picture over the gap next to them, a plant
 * at the end; then some bare wall, then another group. The longest wall gets
 * the kitchen (vending machines, water, coffee) once. Along the side walls, a
 * plant, a cooler or a cabinet here and there, kept clear of the corners and
 * doorways. Nothing goes where someone has put furniture.
 */
const STANDING = ["wall-bookcase", "wall-shelf", "wall-plant", "wall-plant2", "wall-cooler", "wall-plant"];
const HUNG = ["wall-painting", "wall-notice", "wall-poster", "wall-charts", "wall-cert", "wall-art", "wall-trophy", "board-blank", "board-chart", "window-wide", "picture-forest", "picture-hills"];
const SIDE = ["plant-tall", "plant-snake", "water-cooler", "plant-tall", "plant-small"];
// The side desk is drawn from its left: it only stands flush against a wall on its right.
const SIDE_RIGHT = [...SIDE, "wall-cabinet"];

function dressWalls(byId, shell, seed, placed) {
  const blocked = placed.map(({ item, x, y }) => {
    const [w, h] = spriteSize(item.sprite);
    return [x, y, w, h];
  });
  const free = (x, y, w, h) => blocked.every(([bx, by, bw, bh]) => x + w <= bx || x >= bx + bw || y + h <= by || y >= by + bh);
  const tiles = (id) => Math.ceil(spriteSize(byId.get(id).sprite)[0] / TILE);
  const out = [];
  const runs = topWalls(shell);
  // The kitchen goes along the longest wall: rooms joined by doorways are one floor, so wall length says which room is the main one.
  const longest = runs.reduce((best, run) => (!best || run.length > best.length ? run : best), null);

  for (const run of runs) {
    const key = `wall:${run.x},${run.y}`;
    const rand = random(`${seed}|${key}`);
    const pick = (list) => {
      const options = list.filter((id) => byId.has(id));
      return options[Math.floor(rand() * options.length)] ?? null;
    };
    const top = (run.y - 2) * TILE;
    const end = run.x + run.length;
    let n = 0;
    /** Puts a thing at tile tx along the wall; its width in tiles, or 0 when it can't go there. */
    const put = (id, tx) => {
      const item = id && byId.get(id);
      if (!item) return 0;
      const [w, h] = spriteSize(item.sprite);
      const width = Math.ceil(w / TILE);
      if (tx + width > end) return 0;
      // Things cut from a wall start on its top edge; the packs' own pictures and windows sit lower on the face.
      const y = top + (item.mount === "wall" && !id.startsWith("wall-") && h <= TILE ? 16 : 0);
      // Standing things only where the floor in front of the wall is free; hung ones only where nothing placed stands up over the wall.
      if (item.mount !== "wall" ? !free(tx * TILE, top + 2 * TILE, w, h - 2 * TILE) : !free(tx * TILE, y, w, h)) return 0;
      out.push({ key: `${key}/${n++}`, item, x: tx * TILE, y, generated: "wall" });
      return width;
    };
    let kitchen = run === longest ? run.x + 2 + Math.floor(rand() * Math.max(1, run.length - 14)) : -1;
    let tx = run.x + (rand() < 0.55 ? put(pick(["wall-plant", "wall-plant2"]), run.x) : 0);
    tx += Math.floor(rand() * 3);
    while (tx < end - 1) {
      if (kitchen >= 0 && tx >= kitchen) {
        for (const id of ["wall-vending", "wall-coffee-table", pick(["wall-shelf-cooler", "wall-cooler"])]) tx += put(id, tx) || 0;
        kitchen = -1;
      } else {
        // A group: one to three things side by side, standing or hung.
        const size = 1 + Math.floor(rand() * rand() * 3.5);
        for (let i = 0; i < size && tx < end - 1; i++) {
          const id = rand() < 0.55 ? pick(STANDING) : pick(HUNG);
          tx += put(id, tx) || 1;
        }
      }
      // Bare wall before the next group: sometimes a step, mostly a stretch.
      tx += rand() < 0.25 ? 1 : 2 + Math.floor(rand() * 4);
    }
    if (rand() < 0.5) put(pick(["wall-plant", "wall-plant2"]), end - 1);
  }

  for (const run of sideWalls(shell)) {
    const key = `side:${run.side}:${run.x},${run.y}`;
    const rand = random(`${seed}|${key}`);
    let n = 0;
    // Clear of the corner at the top (the top wall's things are there) and of the run's ends, where doorways are.
    for (let ty = run.y + 3; ty < run.y + run.length - 1; ) {
      if (rand() < 0.5) {
        const options = (run.side === "right" ? SIDE_RIGHT : SIDE).filter((id) => byId.has(id));
        const item = byId.get(options[Math.floor(rand() * options.length)]);
        const [w, h] = spriteSize(item.sprite);
        const x = run.side === "left" ? run.x * TILE : (run.x + 1) * TILE - w;
        const y = (ty + 1) * TILE - h;
        if (free(x, (ty + 1) * TILE - 24, w, 24)) {
          out.push({ key: `${key}/${n++}`, item, x, y, generated: "wall" });
          ty += Math.ceil(h / TILE);
        }
      }
      ty += 3 + Math.floor(rand() * 5);
    }
  }
  return out;
}

/** Where everyone sits: [{ key, x, y, dir }] from every piece with a seat. */
export function seatsOf(pieces) {
  return pieces.flatMap((piece) => (piece.item.seats ?? []).map((seat, n) => ({ key: n ? `${piece.key}/${n}` : piece.key, x: piece.x + seat.x, y: piece.y + seat.y, dir: seat.dir })));
}

/** What you can't walk through: [x, y, w, h] from every piece's colliders. */
export function solidsOf(pieces) {
  return pieces.flatMap(({ item, x, y }) => item.colliders.map(([cx, cy, w, h]) => [x + cx, y + cy, w, h]));
}

export { DESK_STEP, clusterSize };
