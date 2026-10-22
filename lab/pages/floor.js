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
 * What stands against each room's top wall and hangs on it, picked from the
 * seed: along the longest wall, once, a kitchen (vending machines, water, coffee);
 * then shelves, cabinets and plants along the wall, pictures and boards above,
 * with gaps so it reads as an office and not a store. Nothing goes where
 * someone has put furniture.
 */
const KITCHEN = ["wall-vending", "wall-cooler", "wall-coffee", "wall-counter"];
const STANDING = ["wall-bookcase", "wall-shelf", "wall-plant", "wall-plant2", "wall-cooler"];
const HUNG = ["wall-painting", "wall-notice", "wall-poster", "wall-charts", "wall-cert", "wall-art", "wall-trophy", "board-blank", "board-chart", "window-wide", "picture-forest", "picture-hills"];

function dressWalls(byId, shell, seed, placed) {
  const runs = topWalls(shell);
  // The kitchen goes along the longest wall: rooms joined by doorways are one floor, so wall length says which room is the main one.
  const biggest = runs.reduce((best, run) => (!best || run.length > best.length ? run : best), null);
  const blocked = placed.map(({ item, x, y }) => {
    const [w, h] = spriteSize(item.sprite);
    return [x, y, w, h];
  });
  const free = (x, y, w, h) => blocked.every(([bx, by, bw, bh]) => x + w <= bx || x >= bx + bw || y + h <= by || y >= by + bh);
  const out = [];
  for (const run of runs) {
    const key = `wall:${run.x},${run.y}`;
    const rand = random(`${seed}|${key}`);
    const pick = (list) => {
      const options = list.filter((id) => byId.has(id));
      return options[Math.floor(rand() * options.length)] ?? null;
    };
    const top = (run.y - 2) * TILE;
    let n = 0;
    const put = (id, tx, dy = 0) => {
      const item = byId.get(id);
      if (!item) return 0;
      const [w, h] = spriteSize(item.sprite);
      const x = tx * TILE, y = top + dy;
      // Standing things only where the floor in front of the wall is free; hung ones anywhere on it.
      if (item.mount !== "wall" && !free(x, top + 2 * TILE, w, h - 2 * TILE)) return 0;
      out.push({ key: `${key}/${n++}`, item, x, y, generated: "wall" });
      return Math.ceil(w / TILE);
    };
    const end = run.x + run.length;
    let tx = run.x;
    // The kitchen, once, somewhere along the biggest room's wall.
    let kitchenAt = run === biggest ? run.x + 2 + Math.floor(rand() * Math.max(1, run.length - 12)) : -1;
    if (rand() < 0.6) tx += put(pick(["wall-plant", "wall-plant2"]), tx) || 0;
    while (tx < end - 1) {
      if (tx >= kitchenAt && kitchenAt >= 0) {
        for (const id of ["wall-vending", "wall-cooler", pick(["wall-coffee", "wall-counter"])]) {
          const w = Math.ceil(spriteSize(byId.get(id)?.sprite ?? { rect: [0, 0, 32, 0] })[0] / TILE);
          if (tx + w > end) break;
          tx += put(id, tx) || w;
        }
        kitchenAt = -1;
        tx += 1;
        continue;
      }
      const roll = rand();
      if (roll < 0.42) {
        const id = pick(STANDING);
        const w = Math.ceil(spriteSize(byId.get(id).sprite)[0] / TILE);
        if (tx + w <= end) tx += put(id, tx) || w;
        else tx++;
      } else if (roll < 0.72) {
        const id = pick(HUNG);
        const item = byId.get(id);
        const [w, h] = spriteSize(item.sprite);
        const tiles = Math.ceil(w / TILE);
        // Things cut from a wall start on its top edge; the packs' own pictures and windows sit lower on the face.
        if (tx + tiles <= end) tx += put(id, tx, id.startsWith("wall-") || h > TILE ? 0 : 16) || tiles;
        else tx++;
      }
      tx += 1 + Math.floor(rand() * 2);
    }
    if (rand() < 0.6 && end - 1 > run.x) put(pick(["wall-plant", "wall-plant2"]), end - 1);
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
