// Bakes what the floor draws, from the catalog and the templates. Run after
// changing items or baking a template: `pnpm --dir lab build`. It needs the
// packs in assets-pack/.
//
// - every drawn item (not bundles or clusters, which are only their parts),
//   and every desk row a template's banks need, cut from the packs, layered and
//   mirrored as the catalog says, packed into one atlas:
//   private-assets/catalog/floor-items.png, its frames in shared-protocol/src/catalog/atlas.json;
// - for each template, the office worked out into
//   shared-protocol/src/catalog/floors/<id>.json: its walls and floors (as the
//   plain map they're drawn from: the app draws them from the room builder
//   sheet it has anyway, which is far smaller than a picture of them), every
//   piece with its key, item and depth, what each thing can't be walked
//   through, the seats (with ids, and where you arrive at each desk), the
//   spots the floor keeps, and what decorating a desk needs: each desk's
//   surface, the things that can stand on one and the chairs it can have.
//   The app draws that and nothing
//   else; the room reads its desks and checks changes to them against it;
// - the atlas's size and hash go in web-shared/assets.manifest.json, so every
//   build pulls it from R2 and checks it like the rest of the art;
// - the floor sheet the app paints walls and floors from: the room builder's,
//   with the interiors pack's floors that shell.ts names (MORE_FLOORS) under it,
//   private-assets/catalog/floor-sheet.png, in the manifest the same way.
//
// Then upload what changed with the commands it prints (docs/customization.md, "Where the art lives").
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pngjs from "pngjs";
import { drawn as drawnArt, groundTiles } from "./pages/art.js";
import { SINGLE_FINISHES, check, clusterSize, cubicleRow, deskSpots, deskStep, isComposite, isGroup, spriteSize } from "./pages/catalog.js";
import { checkTemplate, officeFloor, seatsOf } from "./pages/floor.js";
import { GROUND_TILES, MORE_FLOORS, TILE, moreFloorAt } from "./pages/shell.js";
import { record } from "./manifest.mjs";
import { png8 } from "./png8.mjs";

const { PNG } = pngjs;
const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const PACKS = join(ROOT, "assets-pack");
const CATALOG = join(ROOT, "shared-protocol", "src", "catalog");
// Named for this palette version: production builds keep pulling the full-colour one under its old name until they have this.
const ATLAS_KEY = "catalog/floor-items.png";
const SHEET_KEY = "catalog/floor-sheet.png";
const WIDTH = 1024;
const GAP = 2;

const catalog = JSON.parse(await readFile(join(CATALOG, "items.json"), "utf8"));
const byId = new Map(catalog.items.map((item) => [item.id, item]));
const templates = await Promise.all(
  (await readdir(join(CATALOG, "templates")).catch(() => []))
    .filter((name) => name.endsWith(".json"))
    .map(async (name) => JSON.parse(await readFile(join(CATALOG, "templates", name), "utf8"))),
);
const problems = [...check(catalog), ...templates.flatMap((template) => checkTemplate(byId, template))];
if (problems.length) {
  for (const problem of problems) console.error(`✗ ${problem}`);
  console.error("Not built: fix the catalog first (pnpm --dir lab check).");
  process.exit(1);
}

const sources = new Map();
async function source(src) {
  if (!sources.has(src)) sources.set(src, PNG.sync.read(await readFile(join(PACKS, src))));
  return sources.get(src);
}

/** Copies a rectangle of one image onto another, drawing over what's there (alpha over). */
function blit(from, [sx, sy, sw, sh], to, dx, dy, flip = false, width = sw) {
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const i = ((sy + y) * from.width + sx + x) * 4;
      const a = from.data[i + 3] / 255;
      if (!a) continue;
      const tx = flip ? dx + width - 1 - x : dx + x;
      const o = ((dy + y) * to.width + tx) * 4;
      const below = to.data[o + 3] / 255;
      const out = a + below * (1 - a);
      for (let c = 0; c < 3; c++) to.data[o + c] = Math.round((from.data[i + c] * a + to.data[o + c] * below * (1 - a)) / out);
      to.data[o + 3] = Math.round(out * 255);
    }
  }
}

/** A copy of a picture with some of its colours swapped: { "#rrggbb": "#rrggbb" }. */
function recolored(picture, swaps) {
  const to = new Map(Object.entries(swaps).map(([a, b]) => [a.toLowerCase(), b]));
  const out = new PNG({ width: picture.width, height: picture.height });
  picture.data.copy(out.data);
  for (let i = 0; i < out.data.length; i += 4) {
    const hex = "#" + [0, 1, 2].map((n) => out.data[i + n].toString(16).padStart(2, "0")).join("");
    const swap = to.get(hex);
    if (swap) for (let n = 0; n < 3; n++) out.data[i + n] = parseInt(swap.slice(1 + n * 2, 3 + n * 2), 16);
  }
  return out;
}

/** One item's picture, as the floor will draw it. */
async function render(item) {
  const [w, h] = spriteSize(item.sprite);
  const image = new PNG({ width: w, height: h });
  const layers = isComposite(item.sprite) ? item.sprite.layers : [{ src: item.sprite.src, rect: item.sprite.rect, at: [0, 0] }];
  for (const layer of layers) {
    const cut = layer.draw ? drawnArt(layer.draw, layer.rect[0] + layer.rect[2], layer.rect[1] + layer.rect[3]) : await source(layer.src);
    const from = layer.recolor ? recolored(cut, layer.recolor) : cut;
    blit(from, layer.rect, image, layer.at[0], layer.at[1]);
  }
  if (!item.sprite.flip) return image;
  const flipped = new PNG({ width: w, height: h });
  blit(image, [0, 0, w, h], flipped, 0, 0, true, w);
  return flipped;
}

// ---------- the offices, worked out ----------

const offices = templates.map((template) => ({ template, floor: officeFloor(byId, template) }));
// A desk bank's rows are made for its size: each one the templates use goes on the atlas too.
const rows = new Map();
for (const { floor } of offices) for (const piece of floor) if (piece.item.generated) rows.set(piece.item.id, piece.item);
// A single desk can be had in any of its woods (whoever's desk it is picks), so each one used goes on the atlas in all of them.
for (const id of [...rows.keys()]) {
  const single = id.match(/^desks-single-[a-z]+-(\d+)-n(\d+)$/);
  if (single) for (const finish of SINGLE_FINISHES) rows.set(singleIn(id, finish), cubicleRow(finish, Number(single[1]), Number(single[2]) * 32));
}

// ---------- the atlas ----------

// Shelves, tallest first: simple, and tight enough for things this size.
const items = [...catalog.items.filter((item) => !isGroup(item)), ...rows.values()];
const drawn = await Promise.all(items.map(async (item) => ({ item, image: await render(item) })));
drawn.sort((a, b) => b.image.height - a.image.height || b.image.width - a.image.width || a.item.id.localeCompare(b.item.id));
const frames = {};
let x = 0, y = 0, shelf = 0;
for (const { item, image } of drawn) {
  if (x + image.width > WIDTH) {
    x = 0;
    y += shelf + GAP;
    shelf = 0;
  }
  frames[item.id] = [x, y, image.width, image.height];
  x += image.width + GAP;
  shelf = Math.max(shelf, image.height);
}
const atlas = new PNG({ width: WIDTH, height: y + shelf });
for (const { item, image } of drawn) blit(image, [0, 0, image.width, image.height], atlas, frames[item.id][0], frames[item.id][1]);
const sorted = Object.fromEntries(Object.entries(frames).sort(([a], [b]) => a.localeCompare(b)));
/** Where an item's pixels are in its frame, [left, top, right, bottom] (right and bottom past the last): frames carry margins. */
const artOf = new Map(
  drawn.map(({ item, image }) => {
    let [left, top, right, bottom] = [image.width, image.height, 0, 0];
    for (let py = 0; py < image.height; py++) {
      for (let px = 0; px < image.width; px++) {
        if (!image.data[(py * image.width + px) * 4 + 3]) continue;
        left = Math.min(left, px);
        top = Math.min(top, py);
        right = Math.max(right, px + 1);
        bottom = Math.max(bottom, py + 1);
      }
    }
    return [item.id, [left, top, right, bottom]];
  }),
);
// Under 256 colours (the packs' art is), it's an 8-bit palette PNG: a third of the size, for every first visit.
const pictures = [{ key: ATLAS_KEY, png: png8(atlas) ?? PNG.sync.write(atlas, { colorType: 6 }) }];
console.log(`${drawn.length} items on a ${atlas.width}×${atlas.height} atlas, ${(pictures[0].png.length / 1024).toFixed(1)} KB`);

// ---------- the floor sheet ----------

const builder = PNG.sync.read(await readFile(join(ROOT, "private-assets", "tilesets", "textures", "Room_Builder_Office_32x32.png")));
const interiors = await source("moderninteriors/1_Interiors/32x32/Room_Bulder_subfiles_32x32/Room_Builder_Floors_32x32.png");
const more = Object.values(MORE_FLOORS);
const sheet = new PNG({ width: builder.width, height: (GROUND_TILES.row + GROUND_TILES.paving) * TILE });
blit(builder, [0, 0, builder.width, builder.height], sheet, 0, 0);
more.forEach(([column, row], n) => {
  const [to, at] = moreFloorAt(n);
  blit(interiors, [column * TILE, row * TILE, 3 * TILE, 2 * TILE], sheet, to * TILE, at * TILE);
});
// And under them, the grounds' tiles: grass to pick from, a block of paving.
blit(groundTiles(GROUND_TILES), [0, 0, (GROUND_TILES.grass + GROUND_TILES.paving) * TILE, GROUND_TILES.paving * TILE], sheet, 0, GROUND_TILES.row * TILE);
pictures.push({ key: SHEET_KEY, png: png8(sheet) ?? PNG.sync.write(sheet, { colorType: 6 }) });

// The atlas's frames, and where the page gets both pictures: each address
// names its picture's hash, so a browser holding an older one (public/_headers
// lets it keep one a day) fetches the new one with the frames that go with it.
const versioned = (key) => `${key}?v=${createHash("sha256").update(pictures.find((one) => one.key === key).png).digest("hex").slice(0, 12)}`;
await writeFile(
  join(CATALOG, "atlas.json"),
  JSON.stringify({ image: versioned(ATLAS_KEY), sheet: versioned(SHEET_KEY), width: atlas.width, height: atlas.height, frames: sorted }, null, 1) + "\n",
);

// ---------- each office: what the floor needs ----------

await mkdir(join(CATALOG, "floors"), { recursive: true });
for (let { template, floor } of offices) {
  // A seat's id is the tile it's on, row by row: what the room and the app call it.
  const seatIds = new Set();
  const desks = new Map(template.seats.filter((seat) => seat.desk).map((seat) => [seat.key, seat]));
  const inZone = (zone, px, py) => px >= zone.x && px < zone.x + zone.width && py >= zone.y && py < zone.y + zone.height;
  // The outline of what you'd sit on, [x, y, w, h]: the art of its piece, shared out at the middles between its seats
  // (a bench's, a sofa's), so the floor can show it as you come near or point at it.
  const boxes = new Map();
  for (const piece of floor) {
    const spots = piece.item.seats ?? [];
    if (!spots.length) continue;
    const [left, top, right, bottom] = artOf.get(piece.item.id);
    const order = spots.map((spot, n) => ({ spot, n })).sort((a, b) => a.spot.x - b.spot.x);
    order.forEach(({ spot, n }, i) => {
      const from = i ? Math.round((order[i - 1].spot.x + spot.x) / 2) : left;
      const to = i < order.length - 1 ? Math.round((spot.x + order[i + 1].spot.x) / 2) : right;
      boxes.set(n ? `${piece.key}/${n}` : piece.key, [piece.x + from, piece.y + top, to - from, bottom - top]);
    });
  }
  const seats = seatsOf(floor).map((seat) => {
    const id = Math.floor(seat.y / TILE) * template.shell.size[0] + Math.floor(seat.x / TILE);
    if (seatIds.has(id)) throw new Error(`${template.id}: two seats on tile ${id}`);
    seatIds.add(id);
    const desk = desks.get(seat.key);
    const zone = template.anchors.zones?.find((one) => inZone(one, seat.x, seat.y))?.name;
    return { id, key: seat.key, x: seat.x, y: seat.y, dir: seat.dir, box: boxes.get(seat.key), ...(desk ? { desk: desk.desk, arrival: desk.arrival } : {}), ...(zone ? { zone } : {}) };
  });
  const deskSpecs = desksOf(template, floor, seats);
  floor = spotted(template.id, floor, deskSpecs);
  const missing = floor.filter((piece) => !frames[piece.item.id]);
  if (missing.length) throw new Error(`${template.id}: not on the atlas: ${missing.map((piece) => piece.item.id).join(", ")}`);
  const compiled = {
    id: template.id,
    version: template.version,
    shell: template.shell,
    anchors: template.anchors,
    pieces: floor.map((piece) => ({
      key: piece.key,
      item: piece.item.id,
      x: piece.x,
      y: piece.y,
      depth: Math.round(piece.depth * 100) / 100,
      // A desk's own pieces (its things, its chair), so who may change them is known.
      ...(deskOfPiece(piece) ? { desk: deskOfPiece(piece) } : {}),
    })),
    // What each thing that can stand here can't be walked through; the floor works out what's solid from these and its walls, as it is now.
    colliders: Object.fromEntries(
      [...catalog.items, ...rows.values()].filter((item) => item.colliders?.length).map((item) => [item.id, item.colliders]),
    ),
    seats,
    desks: deskSpecs,
    things: Object.fromEntries(
      catalog.items
        .filter((item) => item.desk && item.facing)
        .map((item) => [
          item.id,
          { facing: item.facing, size: spriteSize(item.sprite), art: artOf.get(item.id), ...(item.shelf ? { shelf: item.shelf } : {}), ...(item.id.startsWith("ours-") ? { set: "ours" } : {}) },
        ]),
    ),
    chairs: chairOptions(),
  };
  await writeFile(join(CATALOG, "floors", `${template.id}.json`), JSON.stringify(compiled, null, 1) + "\n");
  console.log(`${template.id}@${template.version}: ${compiled.pieces.length} pieces, ${seats.length} seats (${seats.filter((seat) => seat.desk).length} desks)`);
}

/**
 * Each thing on a desk in the spot it stands in: the one its key names (spot-n)
 * or, baked before desks had spots, the one its middle is over (the nearest,
 * if none); placed as the floor places one (office.ts placeIn). Two in one
 * spot, or one too wide for it, is the template's mistake.
 */
function spotted(id, floor, desks) {
  const taken = new Set();
  return floor.map((piece) => {
    const desk = desks[deskOfPiece(piece)];
    if (!desk || piece.key.endsWith("/chair")) return piece;
    const [left, , right, bottom] = artOf.get(piece.item.id);
    const middle = piece.x + (left + right) / 2;
    const named = piece.key.match(/\/(spot-\d+)$/)?.[1];
    const away = (spot) => Math.max(spot.x[0] - middle, middle - spot.x[1], 0);
    const spot = desk.spots.find((one) => one.id === named) ?? [...desk.spots].sort((a, b) => away(a) - away(b))[0];
    const key = `${deskOfPiece(piece)}/${spot.id}`;
    if (taken.has(key)) throw new Error(`${id}: ${piece.key} and another in ${key}`);
    if (right - left > spot.x[1] - spot.x[0]) throw new Error(`${id}: ${piece.item.id} too wide for ${key}`);
    taken.add(key);
    return { ...piece, key, x: Math.round(((spot.x[0] + spot.x[1]) / 2 - (left + right) / 2) / 2) * 2, y: spot.foot - bottom, depth: desk.depth + spot.foot / 10000 };
  });
}

/** Which desk a piece belongs to: a thing on it, or its chair. */
function deskOfPiece(piece) {
  if (piece.desk) return piece.desk;
  return piece.seat && piece.key.endsWith("/chair") ? piece.key.slice(0, -"/chair".length) : null;
}

/**
 * Every desk, by its key: its seat, its side, its spots (catalog.js
 * deskSpots), its chair, its wood when it's a single desk on its own, and the
 * depth its things are drawn at (just over the desk's row).
 */
function desksOf(template, floor, seats) {
  const desks = {};
  for (const bank of template.pieces.filter((piece) => piece.size)) {
    const { cols, sides } = clusterSize(bank.size);
    for (let c = 0; c < cols; c++) {
      for (const side of sides === 2 ? ["front", "back"] : ["front"]) {
        const key = `${bank.key}/${side}-${c}`;
        const seat = seats.find((one) => one.desk === key);
        const chair = floor.find((piece) => piece.key === `${key}/chair`);
        const row = floor.find((piece) => piece.key === `${bank.key}/${side}`);
        if (!seat || !chair || !row) continue;
        const item = byId.get(bank.item);
        const step = deskStep(item);
        const single = item?.cluster?.style === "cubicle";
        desks[key] = {
          seat: seat.id,
          side,
          spots: deskSpots(item, bank.x, bank.y, c, side, (chair.x - bank.x - c * step) / 32),
          // A single desk is drawn (art.js), so only things drawn to go with it stand on it.
          ...(single ? { set: "ours" } : {}),
          chair: { key: chair.key, item: chair.item.id, x: chair.x, y: chair.y },
          // A single desk on its own is a piece of its own, so its owner can have it in another wood.
          ...(single && cols === 1 ? { body: { key: row.key, item: row.item.id, options: SINGLE_FINISHES.map((finish) => singleIn(row.item.id, finish)) } } : {}),
          depth: Math.round((row.y + row.item.sortY + 0.5) * 100) / 100,
        };
      }
    }
  }
  return desks;
}

/** A single desk's row in another wood. */
function singleIn(id, finish) {
  return id.replace(/^desks-single-[a-z]+-/, `desks-single-${finish}-`);
}

/** The chairs a desk can have, each side's, lined up by their seat so you sit in the same spot whichever it is. */
function chairOptions() {
  const cluster = catalog.items.find((item) => item.cluster);
  return Object.fromEntries(
    Object.entries(cluster.cluster.chairs).map(([side, slot]) => {
      const want = byId.get(slot.default).seats[0];
      return [
        side,
        slot.options.map((id) => {
          const item = byId.get(id);
          const have = item.seats[0];
          return { item: id, dx: want.x - have.x, dy: want.y - have.y, sortY: item.sortY };
        }),
      ];
    }),
  );
}

// ---------- the manifest ----------

const { bucket, changed } = await record(pictures);
if (!changed.length) console.log("Same as before: nothing to upload.");
for (const key of changed) console.log(`Changed. Upload it: wrangler r2 object put ${bucket}/${key} --file=private-assets/${key} --remote`);
