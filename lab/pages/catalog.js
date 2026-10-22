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

/** Where on each desk things can go, by side: the near desk's top, and the far desk's strip. */
export const DESK_SURFACE = { front: { x: 36, w: 184, top: 34, bottom: 62 }, back: { x: 36, w: 184, top: 0, bottom: 26 } };

function cluster(byId, item, x, y, choose, place) {
  const { cols, sides } = clusterSize(place.size);
  const finish = item.cluster.finish;
  const front = frontRow(finish, cols);
  const back = sides === 2 ? backRow(finish, cols) : null;
  const pieces = [];
  if (back) pieces.push({ item: back, x, y });
  pieces.push({ item: front, x, y });
  for (let c = 0; c < cols; c++) {
    const dx = x + c * DESK_STEP;
    for (const side of back ? ["front", "back"] : ["front"]) {
      const key = `${side}-${c}`;
      const slot = item.cluster.chairs[side];
      const { item: chair, dx: sx, dy: sy } = slotted(byId, slot, choose[key] ?? choose[side]);
      if (chair) pieces.push({ item: chair, x: dx + slot.at[0] + sx, y: y + slot.at[1] + sy, seat: key });
      const host = side === "front" ? front : back;
      const area = DESK_SURFACE[side];
      const things = place.decor?.[key] ?? decorate(byId, side, `${place.seed ?? 0}|${place.key ?? `${x},${y}`}|${place.salt ?? 0}|${key}`);
      for (const thing of things) {
        const inner = byId.get(thing.item);
        if (inner) pieces.push({ item: inner, x: dx + area.x + thing.x, y: y + area.top + thing.y, host: host.id, desk: key });
      }
    }
  }
  return pieces;
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

/**
 * A desk's things, picked from the catalog's desk decor for its side: usually
 * a screen, set to one side on the near desk so the person's head doesn't hide
 * it, and a thing or two besides; now and then a clear desk. In the desk's
 * surface coordinates: [{ item, x, y }].
 */
export function decorate(byId, side, key) {
  const rand = random(key);
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const suits = (item) => item.facing === side || item.facing === "any";
  const all = [...byId.values()].filter((item) => item.facing && suits(item));
  const screens = all.filter((item) => /monitor|laptop/.test(item.id));
  const extras = all.filter((item) => !screens.includes(item));
  const area = DESK_SURFACE[side];
  const out = [];
  const taken = [];
  const fits = (x, w) => x >= 0 && x + w <= area.w && taken.every(([a, b]) => x + w <= a || x >= b);
  const put = (item, x) => {
    const [w, h] = spriteSize(item.sprite);
    out.push({ item: item.id, x: Math.round(x / 2) * 2, y: area.bottom - area.top - h - Math.floor(rand() * 3) * 2 });
    taken.push([x - 6, x + w + 6]);
  };
  if (rand() < 0.12) return out;
  // On the near side the person sits in the middle, in front of the desk: their head would hide a screen there.
  if (side === "front") taken.push([area.w / 2 - 30, area.w / 2 + 30]);
  const screen = pick(screens);
  if (screen) {
    const [w] = spriteSize(screen.sprite);
    const x = side === "back" ? area.w / 2 - w / 2 : rand() < 0.5 ? 16 + rand() * 36 : area.w - w - 16 - rand() * 36;
    put(screen, x);
  }
  const count = rand() < 0.35 ? 0 : rand() < 0.7 ? 1 : 2;
  for (let n = 0; n < count; n++) {
    const extra = pick(extras);
    if (!extra) break;
    const [w] = spriteSize(extra.sprite);
    for (let tries = 0; tries < 8; tries++) {
      const x = rand() * (area.w - w);
      if (fits(x, w)) {
        put(extra, x);
        break;
      }
    }
  }
  return out;
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
    const host = all.find((other) => other.item.id === piece.host && piece.x >= other.x && piece.x < other.x + spriteSize(other.item.sprite)[0]);
    if (host) return host.y + host.item.sortY + 0.5;
  }
  return piece.y + piece.item.sortY;
}
