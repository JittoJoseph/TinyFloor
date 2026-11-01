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
// - generated: what the office fills in by itself: the things on every desk
//   and a bank's end plants, from its seed, and what stands along its walls,
//   from a seed every office shares. Each generator draws its randomness from
//   a seed and the piece's own key (a wall's is its place and length), so
//   adding a desk never changes another desk, and every device works out the
//   same office;
// - overrides: what people changed, stored by key and applied last: hidden,
//   moved, swapped for another item, or a desk's own list of things.
//
// So an untouched office stores its seed and its layout; a changed one, a few
// small overrides more.
import { DESK_STEP, clusterSize, deskStep, depthOf, expand, isCluster, random, spriteSize } from "./catalog.js";
import { GROUNDS, TILE, cells, planShell, roomAt, wallProblems, wallSolids } from "./shell.js";

/** Ground outside the building (grass, paving): walls facing it are the building's outside. */
const isGround = (cell) => cell.kind === "floor" && GROUNDS.includes(cell.material);

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
  const sitting = sittingAreas(byId, shell, placed);
  const outside = patioThings(byId, shell);
  const dressing = dressWalls(byId, shell, [...placed, ...sitting], layout.anchors);
  const all = [...dressing, ...sitting, ...outside, ...placed].flatMap((piece) => applyOverride(byId, piece, overrides[piece.key]));
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
 * What stands against the walls and hangs on them, worked out from the walls
 * themselves, so nobody places it: move a wall and its things move with it,
 * take a room away and the hall's wall where its doorway was is dressed like
 * any other.
 *
 * Each wall draws its randomness from one seed every office shares and from
 * the wall's own place and length ("wall:15,2,9"): the same wall in the same
 * place is dressed the same in every office, and a wall moved or resized a
 * tile is dressed afresh. A person's changes to these things are kept by the
 * same keys (a layout's overrides, an office's changes).
 *
 * Along each room's top wall, windows first if it's an outside wall, evenly,
 * as a building has them (some with their blinds part way down), every other
 * one left out. Then things in groups, the way an office fills up, then some
 * bare wall, then another group, mixed so no kind of thing takes over: a
 * kind is never picked twice running, and gets less likely each time it's
 * used. Which kinds, and how much of each, is the room's: a meeting room's
 * walls are boards and pictures, a library's shelves, a café's its kitchen
 * and pictures, the hall a bit of everything. Only the office's own things:
 * an item has to be one of the office theme's to go up. A wall has two plants at most,
 * never side by side (one on a short wall), one water cooler, and nothing
 * twice in a row. Nothing covers a window, and nothing stands over anything
 * else. Along the side walls, a plant or a cooler here and there (one plant a
 * wall), kept clear of the corners and doorways; a room's lamp stands in a top
 * corner. Whatever stands by a side wall leaves a tile to walk between it and
 * the furniture. Nothing goes where someone has put furniture, or where the
 * floor keeps a spot of its own (the whiteboard's).
 *
 * A shell without a plan (drawn tile by tile, like Startup's) has no rooms:
 * its walls are dressed as the hall's, with the kitchen along the longest.
 */
const DRESS_SEED = "walls";
/** The theme whose things go up: the office's (Startup's). */
const THEME = "office";
const KINDS = {
  // Standing against the wall: the kitchen's shelf, the water cooler. (Not the side desk, wall-cabinet: it's drawn to
  // stand against a wall on its right, and along a top wall it reads as a desk on end.)
  storage: ["wall-shelf-cooler", "wall-cooler", "wall-shelf"],
  // Hung on it: pictures, and the things a team pins up.
  art: ["wall-poster", "picture-hills", "wall-art", "picture-forest", "art-abstract", "wall-cert", "wall-trophy"],
  work: ["board-chart", "wall-charts", "board-blank", "wall-notice", "notice-board", "art-cork"],
};
const HUNG = new Set([...KINDS.art, ...KINDS.work]);
const PLANTS = ["wall-plant", "wall-plant2"];
/** How much of each kind a room's top walls get, and what stands along its side walls. */
const ROOMS = {
  open: { storage: 2, art: 3, work: 2, side: ["ours-bush-clay", "water-cooler", "ours-bush-white"] },
  meeting: { storage: 1, art: 3, work: 4, side: ["ours-bush-slate", "ours-bush-small-white"] },
  kitchen: { storage: 1, art: 4, work: 0, side: ["ours-bush-sage", "water-cooler"] },
  lounge: { storage: 2, art: 4, work: 0, side: ["ours-bush-lilac", "ours-bush-small-clay"] },
  library: { storage: 5, art: 2, work: 0, side: ["ours-bush-clay"] },
  quiet: { storage: 1, art: 4, work: 0, side: ["ours-bush-white", "ours-bush-small-white"] },
};
/**
 * A room's lamp, in a top corner: red, the warm one. The hall's are always
 * red, one in each top corner; only the rooms furthest out from the middle
 * of the building, about one in five and at least one, get the blue, so it
 * turns up at the edges of the office and never takes over.
 */
const LAMP = "lamp-red";
const LAMP_OUTER = "lamp-blue";
const OUTER_LAMPS = 1 / 5;
const WINDOW = { 2: ["window-office-2", "window-blinds-2"], 3: ["window-office-3", "window-blinds-3"] };
// The side desk is drawn from its left: it only stands flush against a wall on its right.
const SIDE_RIGHT = ["wall-cabinet"];

function dressWalls(byId, shell, placed, anchors = {}) {
  const blocked = placed.map(({ item, x, y }) => {
    const [w, h] = spriteSize(item.sprite);
    return [x, y, w, h];
  });
  const furniture = [...blocked];
  for (const spot of [anchors.whiteboard].filter(Boolean)) blocked.push([spot.x, spot.y, spot.width, spot.height]);
  const clear = (list, x, y, w, h) => list.every(([bx, by, bw, bh]) => x + w <= bx || x >= bx + bw || y + h <= by || y >= by + bh);
  const free = (x, y, w, h) => clear(blocked, x, y, w, h);
  const tiles = (id) => Math.ceil(spriteSize(byId.get(id).sprite)[0] / TILE);
  const out = [];
  const [sw, sh] = shell.size;
  const grid = cells(shell);
  const cell = (x, y) => (x < 0 || y < 0 || x >= sw || y >= sh ? { kind: "void" } : grid[y * sw + x]);
  const plan = shell.plan;
  const kindAt = (x, y) => (plan ? (roomAt(plan, x, y)?.kind ?? "open") : "open");
  // An outside wall: nothing of the building beyond its top. A facade: the building's outside, seen from the grounds, which gets windows and nothing else.
  const runs = topWalls(shell).map((run) => {
    const beyond = cell(run.x, run.y - 3);
    return { ...run, kind: kindAt(run.x, run.y), outside: beyond.kind === "void" || isGround(beyond), facade: isGround(cell(run.x, run.y)) };
  });
  // The kitchen goes along a kitchen's longest wall; with no rooms to say, along the longest wall of all (rooms joined by
  // doorways are one floor, so wall length says which room is the main one).
  // If someone has put a kitchen in already (a break room's own), it still gets its vending machines.
  const hasKitchen = placed.some(({ item }) => item.id === "wall-vending");
  const longest = (list) => list.reduce((best, run) => (!best || run.length > best.length ? run : best), null);
  const indoors = runs.filter((run) => !run.facade);
  const kitchenWall = plan ? longest(indoors.filter((run) => run.kind === "kitchen" && run.length >= 8)) : longest(indoors);

  for (const run of runs) {
    const key = `wall:${run.x},${run.y},${run.length}`;
    const rand = random(`${DRESS_SEED}|${key}`);
    const pick = (list) => {
      const options = list.filter((id) => byId.get(id)?.themes.includes(THEME));
      return options[Math.floor(rand() * options.length)] ?? null;
    };
    const top = (run.y - 2) * TILE;
    const end = run.x + run.length;
    let n = 0;
    const windows = [];
    let plants = 0, lastEnd = -1, lastPlant = false, lastId = null, coolers = 0;
    const onWindow = (tx, width) => windows.some(([a, b]) => tx < b && tx + width > a);
    /** Puts a thing at tile tx along the wall; its width in tiles, or 0 when it can't go there. */
    const put = (id, tx) => {
      const item = id && byId.get(id);
      if (!item) return 0;
      const [w, h] = spriteSize(item.sprite);
      const width = Math.ceil(w / TILE);
      if (tx + width > end || onWindow(tx, width)) return 0;
      // A picture or a board hangs a tile in from the wall's end, not up against a corner or a doorway.
      if (HUNG.has(id) && (tx < run.x + 1 || tx + width > end - 1)) return 0;
      const plant = id.includes("plant");
      if (plant && (plants >= (run.length >= 9 ? 2 : 1) || (lastPlant && lastEnd === tx))) return 0;
      const cooler = id.includes("cooler");
      if ((id === lastId && lastEnd === tx) || (cooler && coolers >= 1 && !kitchenSet.includes(id))) return 0;
      if (kitchenAt >= 0 && !kitchenSet.includes(id) && tx < kitchenEnd && tx + width > kitchenAt) return 0;
      // Things cut from a wall fill it from its top edge; the packs' own pictures and windows hang in the middle of it.
      const y = top + (item.mount === "wall" && !id.startsWith("wall-") ? Math.max(0, Math.round((2 * TILE - h) / 2)) : 0);
      // Only where nothing placed is: on the floor in front, or on the wall's face (a lift, a board).
      if (!free(tx * TILE, y, w, h)) return 0;
      out.push({ key: `${key}/${n++}`, item, x: tx * TILE, y, generated: "wall" });
      blocked.push([tx * TILE, y, w, h]);
      if (plant) plants++;
      if (cooler) coolers++;
      [lastEnd, lastPlant, lastId] = [tx + width, plant, id];
      return width;
    };
    const kitchenSet = hasKitchen ? ["wall-vending", pick(["wall-cooler", "wall-shelf", "wall-shelf-cooler"])] : ["wall-vending", "wall-coffee-table", pick(["wall-shelf-cooler", "wall-cooler"])];
    let kitchen = run === kitchenWall ? run.x + 2 + Math.floor(rand() * Math.max(1, run.length - 14)) : -1;
    const kitchenAt = kitchen;
    const kitchenEnd = kitchen + kitchenSet.reduce((sum, id) => sum + tiles(id), 0);
    // Windows: one size and spacing along a wall, centred on it, clear of the kitchen and of anything placed against the wall;
    // every other one left out, so the wall is windows and things in turn, not all glass.
    if ((run.outside || run.facade) && run.length >= 5 && (run.facade || rand() < 0.85)) {
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
        blocked.push([wx * TILE, top, size * TILE, 2 * TILE]);
        windows.push([wx, wx + size]);
      }
    }
    if (run.facade) continue;
    // Which kind of thing comes next: by the room's mix, less likely each time it's been used, never the same twice running.
    const mix = ROOMS[run.kind] ?? ROOMS.open;
    const used = { storage: 0, art: 0, work: 0 };
    // A wall starts with what the room is mostly about: something hung, so even a short wall between doorways gets a
    // picture or a board, unless it's a room of shelves.
    let lastKind = mix.storage > mix.art + mix.work ? "art" : "storage";
    const nextKind = () => {
      const weights = Object.keys(used).map((kind) => [kind, kind === lastKind ? 0 : mix[kind] / (1 + used[kind] * 1.5)]);
      const total = weights.reduce((sum, [, w]) => sum + w, 0);
      let roll = rand() * total;
      const kind = total > 0 ? weights.find(([, w]) => (roll -= w) < 0)?.[0] ?? weights.findLast(([, w]) => w > 0)[0] : lastKind;
      used[kind]++;
      return (lastKind = kind);
    };
    let tx = run.x + (rand() < 0.25 ? put(pick(PLANTS), run.x) : 0);
    tx += Math.floor(rand() * 3);
    while (tx < end - 1) {
      if (kitchen >= 0 && tx >= kitchen) {
        tx = kitchen;
        for (const id of kitchenSet) tx += put(id, tx) || 0;
        kitchen = -1;
      } else {
        // A group: one to three things side by side.
        const size = 1 + Math.floor(rand() * 2.6);
        for (let i = 0; i < size && tx < end - 1; i++) tx += put(pick(KINDS[nextKind()]), tx) || 1;
      }
      // Bare wall before the next group: sometimes a step, mostly a stretch.
      tx += rand() < 0.5 ? 1 : 2 + Math.floor(rand() * 2);
    }
    if (rand() < 0.25) put(pick(PLANTS), end - 1);
  }

  const sides = sideWalls(shell).filter((run) => !isGround(cell(run.x, run.y)));
  const counts = new Map();
  /** Stands it by a side wall with its foot on row ty, when there's room and still a tile to walk past it; how many rows it takes. */
  const stand = (run, item, ty) => {
    const key = `side:${run.side}:${run.x},${run.y},${run.length}`;
    const [w, h] = spriteSize(item.sprite);
    const x = run.side === "left" ? run.x * TILE : (run.x + 1) * TILE - w;
    const y = (ty + 1) * TILE - h;
    const lane = run.side === "left" ? x : x - TILE;
    if (!free(x, y, w, h) || !clear(furniture, lane, y, w + TILE, h)) return 0;
    const n = counts.get(key) ?? 0;
    counts.set(key, n + 1);
    out.push({ key: `${key}/${n}`, item, x, y, generated: "wall" });
    blocked.push([x, y, w, h]);
    return Math.ceil(h / TILE);
  };

  // A room's lamp, in a corner under its top wall: the side its seed says, or the other when there's no room there;
  // the hall gets one each side. (A shell without rooms gives each wall its own.)
  const lit = new Map();
  const outer = new Set();
  if (plan) {
    const rooms = plan.rooms.filter((room) => room.kind !== "open");
    const [ax, ay, bx, by] = plan.rooms.reduce(([a, b, c, d], { rect }) => [Math.min(a, rect[0]), Math.min(b, rect[1]), Math.max(c, rect[2]), Math.max(d, rect[3])], [Infinity, Infinity, -Infinity, -Infinity]);
    const away = ({ rect }) => Math.hypot((rect[0] + rect[2]) / 2 - (ax + bx) / 2, (rect[1] + rect[3]) / 2 - (ay + by) / 2);
    rooms.sort((a, b) => away(b) - away(a)).slice(0, Math.max(1, Math.round(rooms.length * OUTER_LAMPS))).forEach((room) => outer.add(`room:${room.rect}`));
  }
  for (const first of [true, false]) {
    for (const run of sides) {
      const room = plan ? roomAt(plan, run.x, run.y + 1) : null;
      const which = room ? `room:${room.rect}` : `side:${run.side}:${run.x},${run.y}`;
      const hall = (room?.kind ?? "open") === "open";
      const sidesLit = lit.get(which) ?? new Set();
      if (sidesLit.has(run.side) || sidesLit.size >= (hall ? 2 : 1)) continue;
      const rand = random(`${DRESS_SEED}|lamp|${which}`);
      const preferred = rand() < 0.5 ? "left" : "right";
      if (!hall && (run.side === preferred) !== first) continue;
      const lamp = byId.get(outer.has(which) ? LAMP_OUTER : LAMP);
      // A room's stands in its corner; the hall's, as near its corner as there's a way past it.
      const rows = hall ? Array.from({ length: Math.max(0, run.length - 2) }, (_, n) => run.y + 1 + n) : [run.y + 1];
      if (rows.some((ty) => stand(run, lamp, ty))) lit.set(which, sidesLit.add(run.side));
    }
  }

  // Along the rest of each, clear of the corner at the top (the top wall's things are there) and of the run's ends,
  // where doorways are.
  for (const run of sides) {
    const rand = random(`${DRESS_SEED}|side:${run.side}:${run.x},${run.y},${run.length}`);
    const kinds = (ROOMS[kindAt(run.x, run.y + 1)] ?? ROOMS.open).side;
    let last = null, coolers = 0, plants = 0;
    for (let ty = run.y + 3; ty < run.y + run.length - 1; ) {
      if (rand() < 0.5) {
        const options = [...kinds, ...(run.side === "right" ? SIDE_RIGHT : [])].filter((id) => byId.get(id)?.themes.includes(THEME) && !id.startsWith("lamp-") && id !== last && !(coolers && id.includes("cooler")) && !(plants && id.includes("plant")));
        const item = byId.get(options[Math.floor(rand() * options.length)]);
        const tall = item ? stand(run, item, ty) : 0;
        if (tall) {
          ty += tall;
          last = item.id;
          if (item.id.includes("cooler")) coolers++;
          if (item.id.includes("plant")) plants++;
        }
      }
      ty += 3 + Math.floor(rand() * 5);
    }
  }
  return out;
}

// ---------- rooms: a place to sit in the middle ----------

/**
 * Rooms for sitting in (the hall, a lounge, a library) get a sitting area,
 * worked out like the walls' things, from the room's place and size and the
 * seed every office shares ("room:58,13,65,29"): a rug, a low table on the
 * middle of it and a chair either side, lined up with each other on the rug;
 * a lounge's is a corner of egg chairs, one of each colour round a low table,
 * two facing you and two with their backs to you.
 * It goes as near the middle of the room as it fits: on the room's own floor,
 * off a carpet and a tile clear of every doorway, with a tile round it clear
 * of anything placed and of carpets (walls are fine). A room with no such
 * place goes without.
 */
const SITTING = {
  open: ["egg-chair-coral", "egg-chair-mustard", "egg-chair-teal", "egg-chair-lilac"],
  library: ["armchair"],
};
/** A lounge's is a corner of egg chairs instead: one of each colour round a low table, two facing you and two facing it. */
const EGG_CHAIRS = ["egg-chair-coral", "egg-chair-mustard", "egg-chair-teal", "egg-chair-lilac"];
/** The corner, in tiles: a tile taller than a sitting area, for the chairs either side of the table. */
const CORNER = [4, 4];
const RUGS = ["ours-rug-sunset", "ours-rug-lagoon", "ours-rug-plum"];
/** The area, in tiles: a four by three rug. */
const AREA = [4, 3];

function sittingAreas(byId, shell, placed) {
  const plan = shell.plan;
  if (!plan) return [];
  const { doors } = planShell(plan);
  const [sw, sh] = shell.size;
  const grid = cells(shell);
  const cell = (x, y) => (x < 0 || y < 0 || x >= sw || y >= sh ? { kind: "void" } : grid[y * sw + x]);
  const taken = placed.map(({ item, x, y }) => [x, y, ...spriteSize(item.sprite)]);
  const nearDoor = (x, y) => doors.some(([x0, y0, x1, y1]) => x >= x0 - 1 && x <= x1 + 1 && y >= y0 - 1 && y <= y1 + 1);
  const out = [];
  for (const room of plan.rooms) {
    const corner = room.kind === "lounge";
    const chairs = SITTING[room.kind];
    if (!chairs && !corner) continue;
    const [x0, y0, x1, y1] = room.rect;
    const [w, h] = corner ? CORNER : AREA;
    const own = (x, y) => cell(x, y).kind === "floor" && cell(x, y).material === room.floor;
    const fits = (gx, gy) => {
      for (let y = gy - 1; y <= gy + h; y++) {
        for (let x = gx - 1; x <= gx + w; x++) {
          const inside = x >= gx && x < gx + w && y >= gy && y < gy + h;
          if (inside ? !own(x, y) || nearDoor(x, y) : cell(x, y).kind !== "wall" && !own(x, y)) return false;
        }
      }
      const [px, py, pw, ph] = [(gx - 1) * TILE, (gy - 1) * TILE, (w + 2) * TILE, (h + 2) * TILE];
      return taken.every(([bx, by, bw, bh]) => px + pw <= bx || px >= bx + bw || py + ph <= by || py >= by + bh);
    };
    // As near the middle of the room's floor as it fits.
    const [cx, cy] = [(x0 + x1 + 1) / 2, (y0 + 2 + y1 - 1) / 2];
    let best = null;
    for (let gy = y0 + 2; gy + h <= y1 - 1; gy++) {
      for (let gx = x0 + 1; gx + w <= x1; gx++) {
        const d = (gx + w / 2 - cx) ** 2 + (gy + h / 2 - cy) ** 2;
        if ((!best || d < best.d) && fits(gx, gy)) best = { gx, gy, d };
      }
    }
    if (!best) continue;
    const key = `room:${x0},${y0},${x1},${y1}`;
    const rand = random(`${DRESS_SEED}|${key}`);
    const pick = (list) => {
      const options = list.filter((id) => byId.get(id)?.themes.includes(THEME));
      return options[Math.floor(rand() * options.length)] ?? list[0];
    };
    const [rx, ry] = [best.gx * TILE, best.gy * TILE];
    if (corner) {
      const order = [...EGG_CHAIRS];
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      // The rug in the middle of the corner, the table on it; two chairs behind it facing you, two in front with their backs to you.
      const table = byId.get("coffee-table");
      out.push(
        { key: `${key}/rug`, item: byId.get(pick(RUGS)), x: rx, y: ry + TILE / 2, generated: "room" },
        { key: `${key}/table`, item: table, x: rx + TILE, y: ry + TILE + TILE / 4, generated: "room" },
      );
      order.forEach((id, i) => {
        const facing = i < 2 ? id : `${id}-back`;
        const x = rx + TILE / 2 + (i % 2) * 2 * TILE;
        const y = i < 2 ? ry : ry + 2.5 * TILE;
        out.push({ key: `${key}/chair-${i}`, item: byId.get(facing), x, y, generated: "room" });
      });
      continue;
    }
    // The table on the rug's middle, its foot a tile and a half down; the chairs either side, their feet on the same line.
    const table = byId.get("coffee-table");
    const foot = ry + TILE + spriteSize(table.sprite)[1];
    const first = pick(chairs);
    const second = chairs.length > 1 ? pick(chairs.filter((id) => id !== first)) : first;
    const at = (id, x) => ({ item: byId.get(id), x, y: foot - spriteSize(byId.get(id).sprite)[1] });
    out.push(
      { key: `${key}/rug`, item: byId.get(pick(RUGS)), x: rx, y: ry, generated: "room" },
      { key: `${key}/table`, item: table, x: rx + TILE, y: ry + TILE, generated: "room" },
      { key: `${key}/chair-0`, ...at(first, rx), generated: "room" },
      { key: `${key}/chair-1`, ...at(second, rx + 3 * TILE), generated: "room" },
    );
  }
  return out;
}

// ---------- outside: what stands on the paving off a door ----------

/**
 * Every door out opens onto paving (plan.ts), and the paving gets its
 * benches, worked out from where it is ("patio:66,16,72,25"), the same on
 * every side: a tile in from its edges and clear of the way out of the door.
 * A patio off a wall down gets two pairs, a tile and four tiles out from the
 * wall, near either end, and a small tree between them; a plaza off a wall
 * across, a bench either side of the door. A left patio is the right one
 * mirrored.
 */
function patioThings(byId, shell) {
  if (!shell.plan) return [];
  const bench = byId.get("bench-pale");
  const tree = byId.get("tree-small");
  const out = [];
  for (const { rect, side } of planShell(shell.plan).patios) {
    const [x0, y0, x1, y1] = rect;
    const key = `patio:${rect.join(",")}`;
    const put = (n, item, x, y) => out.push({ key: `${key}/${n}`, item, x: x * TILE, y: y * TILE, generated: "patio" });
    if (side === "top" || side === "bottom") {
      if (x1 - x0 + 1 < 8 || y1 - y0 + 1 < 3) continue;
      // A row from the wall: right under it below a room, two up from the room's wall above it.
      const row = side === "bottom" ? y0 + 1 : y1 - 2;
      put(0, bench, x0 + 1, row);
      put(1, bench, x1 - 2, row);
      continue;
    }
    const [deep, long] = [x1 - x0 + 1, y1 - y0 + 1];
    if (deep < 6 || long < 8) continue;
    // u tiles out from the wall, w wide: the patio's tile column, either side.
    const column = (u, w) => (side === "right" ? x0 + u : x1 - u - (w - 1));
    let n = 0;
    for (const u of [1, 4]) for (const along of [y0 + 1, y1 - 3]) put(n++, bench, column(u, 2), along);
    if (tree && deep >= 7 && long >= 9) put(n++, tree, column(3, 2), y0 + 3);
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
      // In tiles, to the half: a single desk's chair is at its very middle.
      if (c < cols) desks[desk] = Math.round(((piece.x - (entry.x + c * deskStep(item))) / TILE) * 2) / 2;
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
  const walkable = walkableTiles(template, floor);
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
 * Which tiles someone can walk to, as the app's floor works it out
 * (app-frontend lib/Navigation.ts): floor short of the map's edge tiles,
 * whose middle nothing solid covers.
 */
function walkableTiles(template, floor) {
  const solids = [...wallSolids(template.shell), ...solidsOf(floor)];
  const [w, h] = template.shell.size;
  const grid = cells(template.shell);
  return (tx, ty) => {
    if (tx < 1 || ty < 1 || tx >= w - 1 || ty >= h - 1 || grid[ty * w + tx].kind !== "floor") return false;
    const [px, py] = [tx * TILE + TILE / 2, ty * TILE + TILE / 2];
    return !solids.some(([x, y, sw, sh]) => px > x && px < x + sw && py > y && py < y + sh);
  };
}

/** The tiles reachable on foot from one, stepping up, down and across. */
function reachable(walkable, [sx, sy], [w, h]) {
  const seen = new Set([sy * w + sx]);
  const queue = [[sx, sy]];
  while (queue.length) {
    const [x, y] = queue.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const [nx, ny] = [x + dx, y + dy];
      if (seen.has(ny * w + nx) || !walkable(nx, ny)) continue;
      seen.add(ny * w + nx);
      queue.push([nx, ny]);
    }
  }
  return seen;
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
  // Startup's 48×32 at the least; a seat's id is its tile, so the whole floor numbers under 10,000 (what the room accepts).
  if (!(w >= 48 && h >= 32 && w * h < 10000)) say(`is ${w}×${h}; an office is at least 48×32 and under 10,000 tiles`);
  if (!template.anchors?.zones?.some((zone) => zone.name === "meeting")) say("has no meeting room");
  if (!template.anchors?.whiteboard) say("has no spot for the whiteboard");
  if (!Number.isInteger(template.version) || template.version < 1) say("has no version");
  if (!template.theme) say("has no theme");
  for (const problem of wallProblems(template.shell)) say(problem);
  const keys = new Set();
  for (const piece of template.pieces) {
    if (keys.has(piece.key)) say(`has two pieces keyed ${piece.key}`);
    keys.add(piece.key);
    const item = byId.get(piece.item);
    if (!item) say(`${piece.key} is ${piece.item}, which isn't in the catalog`);
    else if (item.cluster && FINISH_BANNED.includes(item.cluster.finish)) say(`${piece.key} is a ${item.cluster.finish} bank; desks are wood or white, never dark grey`);
    // Banks and placed things are on the 16px grid; what stands on a desk or by a bank is nudged to fit, by whole pixels.
    if (!Number.isInteger(piece.x) || !Number.isInteger(piece.y) || (piece.size && (piece.x % 16 || piece.y % 16))) say(`${piece.key} is at ${piece.x},${piece.y}, off the grid`);
    // And on whole tiles: everything placed stands on the tile grid, what the office puts on its desks and walls aside.
    // (Startup was laid out before, on half tiles too; its desks are claimed by where they are, so it stays.)
    else if (template.id !== "startup" && !piece.host && !/^(wall|side|room):/.test(piece.key) && (piece.x % TILE || piece.y % TILE)) say(`${piece.key} is at ${piece.x},${piece.y}, off the tile grid`);
  }
  const desks = template.seats.filter((seat) => seat.desk);
  if (!desks.length) say("has no desks");
  for (const seat of desks) if (!seat.arrival) say(`desk ${seat.desk} has nowhere to arrive`);
  // Everyone can walk to every desk and into the meeting room, from any of them.
  const start = desks.find((seat) => seat.arrival)?.arrival;
  if (start && template.shell?.size) {
    const [sw] = template.shell.size;
    const walkable = walkableTiles(template, officeFloor(byId, template));
    const near = reachable(walkable, start, template.shell.size);
    for (const seat of desks) if (seat.arrival && !near.has(seat.arrival[1] * sw + seat.arrival[0])) say(`desk ${seat.desk} can't be walked to from desk ${desks.find((one) => one.arrival).desk}`);
    const meeting = template.anchors?.zones?.find((zone) => zone.name === "meeting");
    if (meeting) {
      let inside = false;
      for (let ty = Math.floor(meeting.y / TILE); ty < (meeting.y + meeting.height) / TILE && !inside; ty++) {
        for (let tx = Math.floor(meeting.x / TILE); tx < (meeting.x + meeting.width) / TILE; tx++) if (near.has(ty * sw + tx)) inside = true;
      }
      if (!inside) say("the meeting room can't be walked into");
    }
    // Nor is any other part of it shut off: a few tiles boxed in by chairs are fine, a room isn't.
    const [, sh] = template.shell.size;
    const counted = new Set(near);
    for (let ty = 0; ty < sh; ty++) {
      for (let tx = 0; tx < sw; tx++) {
        if (counted.has(ty * sw + tx) || !walkable(tx, ty)) continue;
        const pocket = reachable(walkable, [tx, ty], template.shell.size);
        for (const tile of pocket) counted.add(tile);
        if (pocket.size > 4) say(`the ${pocket.size} tiles from ${tx},${ty} can't be walked to`);
      }
    }
  }
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
