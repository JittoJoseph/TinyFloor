// The catalog's rules and the logic every part of the lab shares, with no DOM,
// so the pages and the Node scripts (check.mjs, build.mjs) use the same code.
//
// An item is one thing on the floor. Its sprite is a rectangle cut from a pack
// image ({ src, rect, flip }), or layers cut from several places and drawn in
// order ({ size, layers: [{ src, rect, at }] }) for things the packs draw in
// pieces, like a wide desk. A bundle is several items placed together and
// moved as one: a desk is a bundle of the desk and its chair, the chair in a
// slot that can be swapped for another chair but never left empty.

export const GRID = 16;

/**
 * The house rules, decided by how the floor looks:
 * - nobody sits sideways: a seat faces up (back to us, at a desk) or down;
 * - a desk is used from the front only, so its chair faces up, towards it;
 * - a desk always comes with a chair.
 */
export const SEAT_DIRECTIONS = ["up", "down"];
export const DESK_SEAT = "up";

export const isBundle = (item) => Array.isArray(item?.parts);
export const isComposite = (sprite) => Array.isArray(sprite?.layers);

/** The sprite's size in pixels. */
export function spriteSize(sprite) {
  return isComposite(sprite) ? sprite.size : [sprite.rect[2], sprite.rect[3]];
}

/** Every pack image a sprite reads. */
export function spriteSources(sprite) {
  return isComposite(sprite) ? [...new Set(sprite.layers.map((layer) => layer.src))] : [sprite.src];
}

/**
 * A placed bundle or item as the things that are drawn: [{ item, x, y }].
 * `choose` picks what fills each slot, otherwise its default.
 */
export function expand(byId, id, x, y, choose = {}) {
  const item = byId.get(id);
  if (!item) return [];
  if (!isBundle(item)) return [{ item, x, y }];
  return item.parts.flatMap((part) => {
    if (!part.slot) return expand(byId, part.item, x + part.at[0], y + part.at[1]);
    const chosen = part.options.includes(choose[part.slot]) ? choose[part.slot] : part.default;
    // A slot is placed for its default; another choice lines up by its seat, so a
    // shorter or taller chair still has you sitting in the same spot at the desk.
    const want = byId.get(part.default)?.seats?.[0];
    const have = byId.get(chosen)?.seats?.[0];
    const [dx, dy] = want && have ? [want.x - have.x, want.y - have.y] : [0, 0];
    return expand(byId, chosen, x + part.at[0] + dx, y + part.at[1] + dy);
  });
}

/** A bundle's outline: the box round all its parts. */
export function bounds(byId, id, choose) {
  const parts = expand(byId, id, 0, 0, choose);
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
  for (const item of catalog.items) {
    const say = (text) => problems.push(`${item.id}: ${text}`);
    if (isBundle(item)) {
      if (!item.parts.length) say("a bundle needs parts");
      for (const part of item.parts) {
        if (!onGrid(...part.at)) say(`part at ${part.at} is off the ${GRID}px grid`);
        const ids = part.slot ? part.options : [part.item];
        for (const id of ids) {
          const inner = byId.get(id);
          if (!inner) say(`part ${id} isn't in the catalog`);
          else if (isBundle(inner)) say(`part ${id} is itself a bundle`);
        }
        if (part.slot && !part.options.includes(part.default)) say(`slot ${part.slot}'s default isn't one of its options`);
      }
      if (item.category === "desks") {
        const chair = item.parts.find((part) => part.slot === "chair");
        if (!chair) say("a desk comes with a chair: it needs a chair slot");
        for (const id of chair?.options ?? []) {
          const seats = byId.get(id)?.seats ?? [];
          if (seats.length !== 1 || seats[0].dir !== DESK_SEAT) say(`${id} can't be a desk's chair: it needs one seat facing ${DESK_SEAT}, towards the desk`);
        }
      }
      continue;
    }
    if (item.category === "desks" && !item.part) say("a desk on its own has no chair: make it a part of a desk bundle");
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
    if ((item.mount === "wall" || item.mount === "surface") && item.colliders.length) say(`${item.mount} items don't block the floor`);
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
