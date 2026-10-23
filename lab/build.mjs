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
//   piece with its key, item and depth, what you can't walk through, the seats
//   (with ids, and where you arrive at each desk), the spots the floor keeps,
//   and what decorating a desk needs: each desk's surface, the things that can
//   stand on one and the chairs it can have. The app draws that and nothing
//   else; the room reads its desks and checks changes to them against it;
// - the atlas's size and hash go in web-shared/assets.manifest.json, so every
//   build pulls it from R2 and checks it like the rest of the art.
//
// Then upload what changed with the commands it prints (ASSETS.md).
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pngjs from "pngjs";
import { drawn as drawnArt } from "./pages/art.js";
import { DESK_STEP, check, clusterSize, isComposite, isGroup, spriteSize } from "./pages/catalog.js";
import { checkTemplate, officeFloor, seatsOf, solidsOf } from "./pages/floor.js";
import { TILE, wallSolids } from "./pages/shell.js";
import { record } from "./manifest.mjs";
import { png8 } from "./png8.mjs";

const { PNG } = pngjs;
const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const PACKS = join(ROOT, "assets-pack");
const CATALOG = join(ROOT, "shared-protocol", "src", "catalog");
// Named for this palette version: production builds keep pulling the full-colour one under its old name until they have this.
const ATLAS_KEY = "catalog/floor-items.png";
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

/** One item's picture, as the floor will draw it. */
async function render(item) {
  const [w, h] = spriteSize(item.sprite);
  const image = new PNG({ width: w, height: h });
  const layers = isComposite(item.sprite) ? item.sprite.layers : [{ src: item.sprite.src, rect: item.sprite.rect, at: [0, 0] }];
  for (const layer of layers) {
    const from = layer.draw ? drawnArt(layer.draw, layer.rect[0] + layer.rect[2], layer.rect[1] + layer.rect[3]) : await source(layer.src);
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
await writeFile(join(CATALOG, "atlas.json"), JSON.stringify({ image: ATLAS_KEY, width: atlas.width, height: atlas.height, frames: sorted }, null, 1) + "\n");
// Under 256 colours (the packs' art is), it's an 8-bit palette PNG: a third of the size, for every first visit.
const pictures = [{ key: ATLAS_KEY, png: png8(atlas) ?? PNG.sync.write(atlas, { colorType: 6 }) }];
console.log(`${drawn.length} items on a ${atlas.width}×${atlas.height} atlas, ${(pictures[0].png.length / 1024).toFixed(1)} KB`);

// ---------- each office: what the floor needs ----------

await mkdir(join(CATALOG, "floors"), { recursive: true });
for (const { template, floor } of offices) {
  // A seat's id is the tile it's on, row by row: what the room and the app call it.
  const seatIds = new Set();
  const desks = new Map(template.seats.filter((seat) => seat.desk).map((seat) => [seat.key, seat]));
  const inZone = (zone, px, py) => px >= zone.x && px < zone.x + zone.width && py >= zone.y && py < zone.y + zone.height;
  const seats = seatsOf(floor).map((seat) => {
    const id = Math.floor(seat.y / TILE) * template.shell.size[0] + Math.floor(seat.x / TILE);
    if (seatIds.has(id)) throw new Error(`${template.id}: two seats on tile ${id}`);
    seatIds.add(id);
    const desk = desks.get(seat.key);
    const zone = template.anchors.zones?.find((one) => inZone(one, seat.x, seat.y))?.name;
    return { id, key: seat.key, x: seat.x, y: seat.y, dir: seat.dir, ...(desk ? { desk: desk.desk, arrival: desk.arrival } : {}), ...(zone ? { zone } : {}) };
  });
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
    solids: [...wallSolids(template.shell), ...solidsOf(floor)],
    seats,
    desks: desksOf(template, floor, seats),
    things: Object.fromEntries(
      catalog.items
        .filter((item) => item.desk && item.facing)
        .map((item) => [item.id, { facing: item.facing, size: spriteSize(item.sprite), art: artOf.get(item.id), ...(item.shelf ? { shelf: item.shelf } : {}) }]),
    ),
    chairs: chairOptions(),
  };
  await writeFile(join(CATALOG, "floors", `${template.id}.json`), JSON.stringify(compiled, null, 1) + "\n");
  console.log(`${template.id}@${template.version}: ${compiled.pieces.length} pieces, ${seats.length} seats (${seats.filter((seat) => seat.desk).length} desks)`);
}

/** Which desk a piece belongs to: a thing on it, or its chair. */
function deskOfPiece(piece) {
  if (piece.desk) return piece.desk;
  return piece.seat && piece.key.endsWith("/chair") ? piece.key.slice(0, -"/chair".length) : null;
}

/**
 * Every desk, by its key: its seat, its side, where things on it stand (the
 * band the foot of their pixels may be in, and how far along), its chair, and
 * the depth its things are drawn at (just over the desk's row).
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
        const x = bank.x + c * DESK_STEP + 32;
        desks[key] = {
          seat: seat.id,
          side,
          // Things stand along the desk's six tiles, the foot of their pixels on its top: a near
          // desk's, from under the divider to its front edge; a far desk's strip behind the divider.
          along: [x, x + 192],
          feet: side === "front" ? [bank.y + 56, bank.y + 86] : [bank.y + 24, bank.y + 34],
          // On a near desk nothing rises over the divider's top onto the far side.
          ...(side === "front" ? { ceiling: bank.y + 30 } : {}),
          chair: { key: chair.key, item: chair.item.id, x: chair.x, y: chair.y },
          depth: Math.round((row.y + row.item.sortY + 0.5) * 100) / 100,
        };
      }
    }
  }
  return desks;
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
