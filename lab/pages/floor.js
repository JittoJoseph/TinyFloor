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
import { TILE, cells, wallSolids } from "./shell.js";

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
  const dressing = dressWalls(byId, shell, seed, placed, layout.anchors);
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
 * Along each room's top wall, windows first if it's an outside wall, evenly,
 * as a building has them (some with their blinds part way down), every other
 * one left out. Then things in groups, the way an office fills up: a shelf
 * beside a cooler, a picture over the gap next to them, a plant at the end;
 * then some bare wall, then another group. Nothing covers a window but a
 * plant. The longest wall gets the kitchen (vending machines, water, coffee)
 * once, or its vending machines when a break room has the kitchen. Along the
 * side walls, a plant, a cooler or a cabinet here and there, kept clear of the
 * corners and doorways. Nothing goes where someone has put furniture, or where
 * the floor keeps a spot of its own (the whiteboard's).
 */
const STANDING = ["wall-bookcase", "wall-shelf", "wall-plant", "wall-plant2", "wall-cooler", "wall-plant"];
const HUNG = ["wall-painting", "wall-notice", "wall-poster", "wall-charts", "wall-cert", "wall-art", "wall-trophy", "board-blank", "board-chart", "picture-forest", "picture-hills"];
const WINDOW = { 2: ["window-office-2", "window-blinds-2"], 3: ["window-office-3", "window-blinds-3"] };
const SIDE = ["plant-tall", "plant-snake", "water-cooler", "plant-tall", "plant-small"];
// The side desk is drawn from its left: it only stands flush against a wall on its right.
const SIDE_RIGHT = [...SIDE, "wall-cabinet"];

function dressWalls(byId, shell, seed, placed, anchors = {}) {
  const blocked = placed.map(({ item, x, y }) => {
    const [w, h] = spriteSize(item.sprite);
    return [x, y, w, h];
  });
  for (const spot of [anchors.whiteboard].filter(Boolean)) blocked.push([spot.x, spot.y, spot.width, spot.height]);
  const free = (x, y, w, h) => blocked.every(([bx, by, bw, bh]) => x + w <= bx || x >= bx + bw || y + h <= by || y >= by + bh);
  const tiles = (id) => Math.ceil(spriteSize(byId.get(id).sprite)[0] / TILE);
  const out = [];
  const [sw, sh] = shell.size;
  const grid = cells(shell);
  const cell = (x, y) => (x < 0 || y < 0 || x >= sw || y >= sh ? { kind: "void" } : grid[y * sw + x]);
  // An outside wall: nothing of the building beyond its top.
  const runs = topWalls(shell).map((run) => ({ ...run, outside: cell(run.x, run.y - 3).kind === "void" }));
  // The kitchen goes along the longest wall: rooms joined by doorways are one floor, so wall length says which room is the main one.
  // If someone has put a kitchen in already (a break room's own), the main wall still gets its vending machines.
  const hasKitchen = placed.some(({ item }) => item.id === "wall-vending");
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
    const windows = [];
    const onWindow = (tx, width) => windows.some(([a, b]) => tx < b && tx + width > a);
    /** Puts a thing at tile tx along the wall; its width in tiles, or 0 when it can't go there. */
    const put = (id, tx) => {
      const item = id && byId.get(id);
      if (!item) return 0;
      const [w, h] = spriteSize(item.sprite);
      const width = Math.ceil(w / TILE);
      if (tx + width > end || (onWindow(tx, width) && !id.includes("plant"))) return 0;
      if (kitchenAt >= 0 && !kitchenSet.includes(id) && tx < kitchenEnd && tx + width > kitchenAt) return 0;
      // Things cut from a wall start on its top edge; the packs' own pictures and windows sit lower on the face.
      const y = top + (item.mount === "wall" && !id.startsWith("wall-") && h <= TILE ? 16 : 0);
      // Only where nothing placed is: on the floor in front, or on the wall's face (a lift, a board).
      if (!free(tx * TILE, y, w, h)) return 0;
      out.push({ key: `${key}/${n++}`, item, x: tx * TILE, y, generated: "wall" });
      return width;
    };
    const kitchenSet = hasKitchen ? ["wall-vending", pick(["wall-cooler", "wall-shelf", "wall-bookcase"])] : ["wall-vending", "wall-coffee-table", pick(["wall-shelf-cooler", "wall-cooler"])];
    let kitchen = run === longest ? run.x + 2 + Math.floor(rand() * Math.max(1, run.length - 14)) : -1;
    const kitchenAt = kitchen;
    const kitchenEnd = kitchen + kitchenSet.reduce((sum, id) => sum + tiles(id), 0);
    // Windows: one size and spacing along a wall, centred on it, clear of the kitchen and of anything placed against the wall;
    // every other one left out, so the wall is windows and things in turn, not all glass.
    if (run.outside && run.length >= 5 && rand() < 0.85) {
      const size = rand() < 0.5 ? 2 : 3;
      const gap = 2 + Math.floor(rand() * 3);
      const count = Math.floor((run.length - 2 + gap) / (size + gap));
      const start = run.x + Math.floor((run.length - (count * size + (count - 1) * gap)) / 2);
      const skip = count > 2 ? Math.floor(rand() * 2) : -1;
      for (let i = 0; i < count; i++) {
        if (skip >= 0 && i % 2 === skip) continue;
        const wx = start + i * (size + gap);
        const id = WINDOW[size][rand() < 0.3 ? 1 : 0];
        if (kitchen >= 0 && wx < kitchenEnd && wx + size > kitchen) continue;
        if (!free(wx * TILE, top, size * TILE, 2 * TILE)) continue;
        out.push({ key: `${key}/window-${i}`, item: byId.get(id), x: wx * TILE, y: top, generated: "wall" });
        windows.push([wx, wx + size]);
      }
    }
    let tx = run.x + (rand() < 0.55 ? put(pick(["wall-plant", "wall-plant2"]), run.x) : 0);
    tx += Math.floor(rand() * 3);
    while (tx < end - 1) {
      if (kitchen >= 0 && tx >= kitchen) {
        tx = kitchen;
        for (const id of kitchenSet) tx += put(id, tx) || 0;
        kitchen = -1;
      } else {
        // A group: one to three things side by side, standing or hung.
        const size = 1 + Math.floor(rand() * rand() * 3.5);
        for (let i = 0; i < size && tx < end - 1; i++) {
          const id = rand() < 0.7 ? pick(STANDING) : pick(HUNG);
          tx += put(id, tx) || 1;
        }
      }
      // Bare wall before the next group: sometimes a step, mostly a stretch.
      tx += rand() < 0.35 ? 1 : 2 + Math.floor(rand() * 3);
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

// ---------- templates: an office frozen, nothing left to chance ----------

/**
 * A layout baked into a template: everything the seed and the generators put
 * there, written down as pieces of its own, so the floor never needs either.
 *
 *   { id, version, name, theme, shell, pieces, seats }
 *
 * A desk bank stays one piece (its rows and chairs are built from its size),
 * with each chair's spot fixed; its desk things and plants become pieces,
 * keyed as they were. Seats come with where you arrive for each: two tiles back
 * from it, or the nearest walkable tile to that.
 */
export function bake(byId, shell, layout, { version = 1, theme = "startup" } = {}) {
  const floor = buildFloor(byId, shell, layout);
  const pieces = [];
  for (const entry of layout.items) {
    const item = byId.get(entry.item);
    if (!isCluster(item)) continue;
    const { cols } = clusterSize(entry.size);
    const desks = {};
    for (const piece of floor) {
      const [bank, desk, part] = piece.key.split("/");
      if (bank !== entry.id || part !== "chair") continue;
      const c = Number(desk.split("-")[1]);
      if (c < cols) desks[desk] = Math.round((piece.x - (entry.x + c * DESK_STEP)) / TILE);
    }
    pieces.push({ key: entry.id, item: entry.item, x: entry.x, y: entry.y, size: clusterSize(entry.size), ...(entry.choose ? { choose: entry.choose } : {}), desks });
  }
  const banks = new Set(pieces.map((piece) => piece.key));
  for (const piece of floor) {
    const [bank, , part] = piece.key.split("/");
    // A bank's rows and chairs are the bank piece's own.
    if (banks.has(bank) && (part === "chair" || piece.key === `${bank}/front` || piece.key === `${bank}/back`)) continue;
    const desk = piece.desk && `${bank}/${piece.desk}`;
    pieces.push({ key: piece.key, item: piece.item.id, x: piece.x, y: piece.y, ...(piece.host ? { host: piece.host } : {}), ...(desk ? { desk } : {}) });
  }
  // Anchors: the spots the floor keeps for itself (the meeting room, its table, the whiteboard).
  const template = { id: layout.id, version, name: layout.name || layout.id, theme, shell: { size: shell.size, legend: shell.legend, rows: shell.rows }, anchors: layout.anchors ?? {}, pieces };
  template.seats = seatsWithArrivals(byId, template);
  return template;
}

/** Every seat of a template's floor, a desk's with where you arrive for it. */
function seatsWithArrivals(byId, template) {
  const floor = officeFloor(byId, template);
  const solids = [...wallSolids(template.shell), ...solidsOf(floor)];
  const [w, h] = template.shell.size;
  const grid = cells(template.shell);
  const walkable = (tx, ty) => {
    if (tx < 0 || ty < 0 || tx >= w || ty >= h || grid[ty * w + tx].kind !== "floor") return false;
    const [px, py] = [tx * TILE + TILE / 2, ty * TILE + TILE / 2];
    return !solids.some(([x, y, sw, sh]) => px >= x && px <= x + sw && py >= y && py <= y + sh);
  };
  return seatsOf(floor).map((seat) => {
    const chair = floor.find((piece) => piece.key === seat.key);
    const desk = chair?.seat && seat.key.endsWith("/chair") ? seat.key.slice(0, -"/chair".length) : null;
    const tx = Math.floor(seat.x / TILE), ty = Math.floor(seat.y / TILE);
    const back = seat.dir === "up" ? 1 : -1;
    // Straight back from the seat first, then a tile either side, then further.
    const tries = [[0, 2], [0, 3], [-1, 2], [1, 2], [-1, 3], [1, 3], [0, 4]].map(([dx, dy]) => [tx + dx, ty + back * dy]);
    const arrival = tries.find(([x, y]) => walkable(x, y)) ?? null;
    return { key: seat.key, x: seat.x, y: seat.y, dir: seat.dir, ...(desk ? { desk, arrival } : {}) };
  });
}

/**
 * An office from its template and its changes: the floor's pieces in draw
 * order. No seed, no generator: the same template and changes draw the same
 * office on every device. A change is kept by a piece's key; a key the
 * template doesn't have, with an item and a place, is a piece someone added.
 */
export function officeFloor(byId, template, changes = {}) {
  const pieces = [];
  for (const piece of template.pieces) {
    if (piece.size) {
      pieces.push(...expand(byId, piece.item, piece.x, piece.y, piece.choose ?? {}, { size: piece.size, key: piece.key, desks: piece.desks }));
      continue;
    }
    const item = byId.get(piece.item);
    if (item) pieces.push({ key: piece.key, item, x: piece.x, y: piece.y, ...(piece.host ? { host: piece.host } : {}), ...(piece.desk ? { desk: piece.desk } : {}) });
  }
  const known = new Set(pieces.map((piece) => piece.key));
  for (const [key, change] of Object.entries(changes)) {
    const item = change.item && byId.get(change.item);
    if (known.has(key) || !item || !change.at) continue;
    pieces.push({ key, item, x: change.at[0], y: change.at[1], ...(change.host ? { host: change.host } : {}), ...(change.desk ? { desk: change.desk } : {}), added: true });
  }
  const all = pieces.flatMap((piece) => (piece.added ? [piece] : applyOverride(byId, piece, changes[piece.key])));
  for (const piece of all) piece.depth = depth(piece, all);
  return all.sort((a, b) => a.depth - b.depth);
}

/** A template's problems, as sentences: what the floor relies on it to be. */
export function checkTemplate(byId, template) {
  const problems = [];
  const say = (text) => problems.push(`template ${template.id}: ${text}`);
  const [w, h] = template.shell?.size ?? [];
  if (w !== 48 || h !== 32) say(`is ${w}×${h}; every office is 48×32`);
  if (!template.anchors?.zones?.some((zone) => zone.name === "meeting")) say("has no meeting room");
  if (!template.anchors?.whiteboard) say("has no spot for the whiteboard");
  if (!Number.isInteger(template.version) || template.version < 1) say("has no version");
  if (!template.theme) say("has no theme");
  const keys = new Set();
  for (const piece of template.pieces) {
    if (keys.has(piece.key)) say(`has two pieces keyed ${piece.key}`);
    keys.add(piece.key);
    const item = byId.get(piece.item);
    if (!item) say(`${piece.key} is ${piece.item}, which isn't in the catalog`);
    else if (item.cluster && FINISH_BANNED.includes(item.cluster.finish)) say(`${piece.key} is a ${item.cluster.finish} bank; desks are wood or white, never dark grey`);
    // Banks and placed things are on the 16px grid; what stands on a desk or by a bank is nudged to fit, by whole pixels.
    if (!Number.isInteger(piece.x) || !Number.isInteger(piece.y) || (piece.size && (piece.x % 16 || piece.y % 16))) say(`${piece.key} is at ${piece.x},${piece.y}, off the grid`);
  }
  const desks = template.seats.filter((seat) => seat.desk);
  if (!desks.length) say("has no desks");
  for (const seat of desks) if (!seat.arrival) say(`desk ${seat.desk} has nowhere to arrive`);
  return problems;
}
const FINISH_BANNED = ["graphite"];

/** Where everyone sits: [{ key, x, y, dir }] from every piece with a seat. */
export function seatsOf(pieces) {
  return pieces.flatMap((piece) => (piece.item.seats ?? []).map((seat, n) => ({ key: n ? `${piece.key}/${n}` : piece.key, x: piece.x + seat.x, y: piece.y + seat.y, dir: seat.dir })));
}

/** What you can't walk through: [x, y, w, h] from every piece's colliders. */
export function solidsOf(pieces) {
  return pieces.flatMap(({ item, x, y }) => item.colliders.map(([cx, cy, w, h]) => [x + cx, y + cy, w, h]));
}

export { DESK_STEP, clusterSize };
