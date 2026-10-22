// The catalog's rules and the logic every part of the lab shares, with no DOM,
// so the pages and the Node scripts (check.mjs, build.mjs) use the same code.
//
// An item is one thing on the floor. Its sprite is a rectangle cut from a pack
// image ({ src, rect, flip }), or layers cut from several places and drawn in
// order ({ size, layers: [{ src, rect, at }] }) for things the packs draw in
// pieces. A bundle is several items placed together and moved as one, some in
// slots that can be swapped but never left empty (a chair). A cluster is a row
// of desks made to measure: placed with a size, it builds its own desks,
// divider, posts, chairs and the things on the desks (cluster() below).

export const GRID = 16;

/**
 * The house rules, decided by how the floor looks:
 * - nobody sits sideways: a seat faces up (back to us) or down (towards us);
 * - at a desk you face the desk: up on the near side, down on the far side;
 * - a desk always comes with a chair.
 */
export const SEAT_DIRECTIONS = ["up", "down"];
export const DESK_SEAT = { front: "up", back: "down" };

export const isBundle = (item) => Array.isArray(item?.parts);
export const isCluster = (item) => !!item?.cluster;
/** Things that are only ever placed, never drawn themselves: bundles and clusters are their parts. */
export const isGroup = (item) => isBundle(item) || isCluster(item);
export const isComposite = (sprite) => Array.isArray(sprite?.layers);

/** The sprite's size in pixels. */
export function spriteSize(sprite) {
  return isComposite(sprite) ? sprite.size : [sprite.rect[2], sprite.rect[3]];
}

/**
 * A placed item, bundle or cluster as the things that are drawn:
 * [{ item, x, y, seat?, host? }]. `choose` picks what fills each slot (or a
 * cluster's chair, by "front-0", "back-2"), otherwise its default. `place`
 * carries what only a placed cluster has: its size, the office's seed, its key,
 * and the desks someone has decorated themselves.
 */
export function expand(byId, id, x, y, choose = {}, place = {}) {
  const item = byId.get(id);
  if (!item) return [];
  if (isCluster(item)) return cluster(byId, item, x, y, choose ?? {}, place);
  if (!isBundle(item)) return [{ item, x, y }];
  return item.parts.flatMap((part) => {
    if (!part.slot) return expand(byId, part.item, x + part.at[0], y + part.at[1]);
    const { item: chosen, dx, dy } = slotted(byId, part, choose?.[part.slot]);
    return chosen ? expand(byId, chosen.id, x + part.at[0] + dx, y + part.at[1] + dy) : [];
  });
}

/**
 * What fills a slot, and how far to shift it: a slot is placed for its
 * default, and another choice lines up by its seat, so a shorter or taller
 * chair still has you sitting in the same spot.
 */
function slotted(byId, slot, wanted) {
  const id = slot.options.includes(wanted) ? wanted : slot.default;
  const want = byId.get(slot.default)?.seats?.[0];
  const have = byId.get(id)?.seats?.[0];
  return { item: byId.get(id), dx: want && have ? want.x - have.x : 0, dy: want && have ? want.y - have.y : 0 };
}

/** The box round everything a placed thing draws. */
export function bounds(byId, id, choose, place) {
  const parts = expand(byId, id, 0, 0, choose, place);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const { item, x, y } of parts) {
    const [w, h] = spriteSize(item.sprite);
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x + w);
    y1 = Math.max(y1, y + h);
  }
  return parts.length ? [x0, y0, x1 - x0, y1 - y0] : [0, 0, GRID, GRID];
}

// ---------- desk clusters ----------

/**
 * Desks in a row, one or two sides, sized like a widget: wider adds a desk
 * beside, deeper adds the row behind, and the divider, its posts and the
 * chairs follow. Drawn from the office sheet's desk bank the way the current
 * map draws it, so any size comes out as one piece of furniture.
 */
const OFFICE = "modernoffice/2_Modern_Office_Black_Shadow/Modern_Office_Black_Shadow_32x32.png";
export const DESK_FINISHES = { maple: [30, 7], oak: [28, 7], graphite: [28, 10], white: [30, 1], beech: [30, 4] };
export const DESK_STEP = 192;
export const CLUSTER_LIMITS = { cols: [1, 6], sides: [1, 2] };
const tile = (row, col, x, y) => ({ src: OFFICE, rect: [col * 32, row * 32, 32, 32], at: [x, y] });

export function clusterSize(size = {}) {
  const clamp = (v, [lo, hi]) => Math.max(lo, Math.min(hi, Math.round(v || lo)));
  return { cols: clamp(size.cols, CLUSTER_LIMITS.cols), sides: clamp(size.sides, CLUSTER_LIMITS.sides) };
}

const made = new Map();
/** A generated part, made once for each finish and width. */
function generated(key, build) {
  if (!made.has(key)) made.set(key, build());
  return made.get(key);
}

/** The divider, its posts and the near desks, for `cols` desks in a row. */
function frontRow(finish, cols) {
  return generated(`front:${finish}:${cols}`, () => {
    const [fr, fc] = DESK_FINISHES[finish] ?? DESK_FINISHES.maple;
    const width = cols * DESK_STEP + 32;
    const divider = [], desks = [], caps = [];
    for (let c = 0; c <= cols; c++) {
      const x = c * DESK_STEP;
      // An end post at each end, a joining post between neighbours.
      const post = c === 0 ? 0 : c === cols ? 6 : 3;
      divider.push(tile(27, post, x, 32), tile(28, post, x, 64));
      caps.push(tile(26, 0, x, 0));
      if (c === cols) continue;
      const odd = c % 2 === 1;
      divider.push(tile(26, odd ? 4 : 1, x + 32, 0), tile(27, odd ? 4 : 1, x + 32, 32), tile(28, odd ? 4 : 1, x + 32, 64));
      for (let i = 2; i <= 5; i++) divider.push(tile(27, odd ? 5 : 2, x + i * 32, 32), tile(28, odd ? 5 : 2, x + i * 32, 64));
      for (const dy of [0, 1]) {
        desks.push(tile(fr + dy, fc, x + 32, 32 + dy * 32));
        for (let i = 2; i <= 5; i++) desks.push(tile(fr + dy, fc + 1, x + i * 32, 32 + dy * 32));
        desks.push(tile(fr + dy, fc + 2, x + 192, 32 + dy * 32));
      }
    }
    return {
      id: `desks-front-${finish}-${cols}`,
      name: "Desks",
      category: "desks",
      generated: true,
      mount: "floor",
      sprite: { size: [width, 96], layers: [...divider, ...desks, ...caps] },
      sortY: 92,
      colliders: [[28, 40, width - 28, 52]],
      seats: [],
      surface: null,
    };
  });
}

/** The desks on the far side of the divider: only their tops show, a strip along it. */
function backRow(finish, cols) {
  return generated(`back:${finish}:${cols}`, () => {
    const [fr, fc] = DESK_FINISHES[finish] ?? DESK_FINISHES.maple;
    const layers = [];
    for (let c = 0; c < cols; c++) {
      const x = c * DESK_STEP;
      layers.push(tile(fr, fc, x + 32, 0));
      for (let i = 2; i <= 5; i++) layers.push(tile(fr, fc + 1, x + i * 32, 0));
      layers.push(tile(fr, fc + 2, x + 192, 0));
    }
    return {
      id: `desks-back-${finish}-${cols}`,
      name: "Desks, far side",
      category: "desks",
      generated: true,
      mount: "floor",
      sprite: { size: [cols * DESK_STEP + 32, 32], layers },
      sortY: 30,
      colliders: [[32, 4, cols * DESK_STEP, 28]],
      seats: [],
      surface: null,
    };
  });
}

/**
 * A bank's desks, chairs and what's on them. Everything is keyed by the
 * bank's id (place.key) and the desk ("front-1": the near side of the second
 * desk), and everything random comes from the office's seed and that key, so
 * a desk stays as it is when others are added, and anyone's device works out
 * the same desk.
 *
 * Laid out the way the current office's desks are: each desk is six tiles
 * wide; whoever sits there sits a tile left or right of its middle, with their
 * setup (screens, or a laptop, a lamp and a phone) on the other side, and a
 * plant, a phone or papers on theirs. On the far side, only the desk's strip
 * shows: two screens seen from behind in front of whoever sits there, and a
 * plant's top, papers or another screen along it. A desk's things can be
 * replaced by its own list (overrides["<key>/<desk>/things"]), which is how a
 * person's arrangement of their desk is kept.
 */
function cluster(byId, item, x, y, choose, place) {
  const { cols, sides } = clusterSize(place.size);
  const key = place.key ?? `${x},${y}`;
  const seed = place.seed ?? 0;
  const overrides = place.overrides ?? {};
  const finish = item.cluster.finish;
  const front = frontRow(finish, cols);
  const back = sides === 2 ? backRow(finish, cols) : null;
  const pieces = [];
  if (back) pieces.push({ key: `${key}/back`, item: back, x, y });
  pieces.push({ key: `${key}/front`, item: front, x, y });
  const things = [...byId.values()].filter((thing) => thing.desk);
  for (let c = 0; c < cols; c++) {
    const dx = x + c * DESK_STEP;
    for (const side of back ? ["front", "back"] : ["front"]) {
      const desk = `${side}-${c}`;
      const rand = random(`${seed}|${key}|${place.salt ?? 0}|${desk}`);
      // A tile left or right of the desk's middle: tile 3 or 4 of the six.
      const sitAt = rand() < 0.5 ? 3 : 4;
      const slot = item.cluster.chairs[side];
      const { item: chair, dy } = slotted(byId, slot, choose[desk] ?? choose[side]);
      if (chair) pieces.push({ key: `${key}/${desk}/chair`, item: chair, x: dx + sitAt * 32, y: y + slot.at[1] + dy, seat: desk });
      const list = overrides[`${key}/${desk}/things`]?.things ?? deskThings(things, side, sitAt, rand);
      list.forEach((thing, n) => {
        const inner = byId.get(thing.item);
        if (!inner) return;
        // Near desk things stand on its two rows (tiles 1 and 2 down); far ones on its strip (row 0).
        pieces.push({ key: `${key}/${desk}/things/${n}`, item: inner, x: dx + thing.col * 32, y: y + thing.row * 32 + (thing.dy ?? 0), host: `${key}/${side === "front" ? "front" : "back"}`, desk });
      });
    }
  }
  // Now and then a plant at a bank's end, standing by the desk.
  const ends = random(`${seed}|${key}|${place.salt ?? 0}|ends`);
  const plants = ["plant-tall", "plant-snake", "plant-small"].filter((id) => byId.has(id));
  for (const [end, ex] of [["left", x - 32], ["right", x + cols * DESK_STEP + 32]]) {
    if (ends() < 0.45 || !plants.length) continue;
    const plant = byId.get(plants[Math.floor(ends() * plants.length)]);
    const [, h] = spriteSize(plant.sprite);
    pieces.push({ key: `${key}/end-${end}`, item: plant, x: ex, y: y + 92 - h });
  }
  return pieces;
}

/**
 * One desk side's things, in tiles of the desk: [{ item, col, row, dy? }].
 * Kept calm: a working desk, not a cluttered one. Near side: usually one
 * setup (three tiles) beside the person, now and then a plant or a phone on
 * their other side, the tile behind their head left clear. Far side: the
 * screens in front of the person, nothing else. Things marked random: false
 * are only ever put there by hand.
 */
export function deskThings(things, side, sitAt, rand) {
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const of = (cols, rows) => things.filter((t) => t.facing === side && t.random !== false && t.desk.cols === cols && t.desk.rows === rows);
  const out = [];
  if (side === "front") {
    const setup = of(3, 2);
    const small = [...of(1, 2), ...of(1, 1)];
    const other = sitAt === 3 ? [1, 2] : [5, 6];
    if (setup.length && rand() < 0.78) out.push({ item: pick(setup).id, col: sitAt === 3 ? 4 : 1, row: 1 });
    else if (small.length && rand() < 0.6) out.push({ item: pick(small).id, col: sitAt === 3 ? 5 : 2, row: 1 });
    if (small.length && rand() < 0.3) out.push({ item: pick(small).id, col: other[Math.floor(rand() * 2)], row: 1 });
  } else {
    const screens = of(3, 1);
    const single = of(1, 1);
    // The screens' backs sit a little above the strip's top edge, as on the current office's far desks.
    if (screens.length && rand() < 0.65) out.push({ item: pick(screens).id, col: sitAt - 1, row: 0 });
    else if (single.length && rand() < 0.7) out.push({ item: pick(single).id, col: sitAt, row: 0, dy: -6 });
  }
  return out.filter((t) => t.item);
}

/** A small, fast, seeded random: the same seed gives the same desks, for everyone in the office. */
export function random(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}


// ---------- the rules ----------

const onGrid = (...values) => values.every((v) => Number.isInteger(v) && v % GRID === 0);

/** Everything wrong with the catalog and the layouts, as sentences. Empty when all is well. */
export function check(catalog, layouts = []) {
  const problems = [];
  const byId = new Map();
  for (const item of catalog.items) {
    if (byId.has(item.id)) problems.push(`${item.id}: the id is used twice`);
    byId.set(item.id, item);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(item.id)) problems.push(`${item.id}: ids are lowercase words joined by dashes`);
  }
  const chairFacing = (say, id, dir, where) => {
    const seats = byId.get(id)?.seats ?? [];
    if (seats.length !== 1 || seats[0].dir !== dir) say(`${id} can't be ${where}: it needs one seat facing ${dir}, towards the desk`);
  };
  for (const item of catalog.items) {
    const say = (text) => problems.push(`${item.id}: ${text}`);
    if (isCluster(item)) {
      if (!(item.cluster.finish in DESK_FINISHES)) say(`no desk finish called ${item.cluster.finish}`);
      for (const side of ["front", "back"]) {
        const slot = item.cluster.chairs?.[side];
        if (!slot) say(`a desk comes with a chair: it needs a ${side} chair slot`);
        else {
          if (!slot.options.includes(slot.default)) say(`the ${side} chair's default isn't one of its options`);
          for (const id of slot.options) chairFacing(say, id, DESK_SEAT[side], `a ${side} desk's chair`);
        }
      }
      continue;
    }
    if (isBundle(item)) {
      if (!item.parts.length) say("a bundle needs parts");
      for (const part of item.parts) {
        if (!onGrid(...part.at)) say(`part at ${part.at} is off the ${GRID}px grid`);
        for (const id of part.slot ? part.options : [part.item]) {
          const inner = byId.get(id);
          if (!inner) say(`part ${id} isn't in the catalog`);
          else if (isGroup(inner)) say(`part ${id} is itself a group`);
        }
        if (part.slot && !part.options.includes(part.default)) say(`slot ${part.slot}'s default isn't one of its options`);
      }
      if (item.category === "desks") {
        const chair = item.parts.find((part) => part.slot === "chair");
        if (!chair) say("a desk comes with a chair: it needs a chair slot");
        for (const id of chair?.options ?? []) chairFacing(say, id, DESK_SEAT.front, "a desk's chair");
      }
      continue;
    }
    if (item.category === "desks" && !item.part) say("a desk on its own has no chair: make it part of a desk bundle");
    const sprite = item.sprite;
    if (!sprite) {
      say("no sprite");
      continue;
    }
    const [w, h] = spriteSize(sprite);
    if (isComposite(sprite)) {
      if (!onGrid(w, h)) say(`size ${w}×${h} is off the ${GRID}px grid`);
    } else if (!onGrid(...sprite.rect)) say(`sprite rect ${sprite.rect} is off the ${GRID}px grid`);
    for (const [x, y, cw, ch] of item.colliders) {
      if (x < 0 || y < 0 || x + cw > w || y + ch > h) say(`collider ${[x, y, cw, ch]} reaches outside the sprite`);
    }
    if (item.sortY < 0 || item.sortY > h) say(`sort line ${item.sortY} is outside the sprite`);
    for (const seat of item.seats) {
      if (!SEAT_DIRECTIONS.includes(seat.dir)) say(`a seat faces ${seat.dir}: nobody sits sideways`);
      // Facing down you sit in front of the seat, so it is drawn behind you; facing up its back covers you.
      if (seat.dir === "down" && item.sortY >= seat.y - 0.5) say(`the seat faces down but would be drawn over whoever sits in it: sort line above ${seat.y - 0.5}`);
      if (seat.dir === "up" && item.sortY <= seat.y - 2) say(`the seat faces up but its back would be drawn behind whoever sits in it`);
      if (seat.x < 0 || seat.x > w || seat.y < 0 || seat.y > h) say(`a seat is outside the sprite`);
    }
    if (["wall", "surface", "rug"].includes(item.mount) && item.colliders.length) say(`${item.mount} items don't block the floor`);
    if (item.facing && !["front", "back", "any"].includes(item.facing)) say(`facing is front, back or any`);
  }
  for (const layout of layouts) {
    for (const entry of layout.items) {
      const item = byId.get(entry.item);
      const where = `layout ${layout.id}, ${entry.item} at ${entry.x},${entry.y}`;
      if (!item) problems.push(`${where}: not in the catalog`);
      else if (item.part) problems.push(`${where}: a part, only placed inside its bundle`);
      if (!onGrid(entry.x, entry.y)) problems.push(`${where}: off the ${GRID}px grid`);
    }
  }
  return problems;
}

/**
 * Draw order for expanded pieces, as the floor does it: by where each thing
 * stands, and a thing on a desk just above that desk.
 */
export function depthOf(piece, all) {
  if (piece.host) {
    const host = all.find((other) => other.key === piece.host);
    if (host) return host.y + host.item.sortY + 0.5;
  }
  return piece.y + piece.item.sortY;
}
