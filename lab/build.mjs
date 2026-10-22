// Bakes the catalog for the floor: every item that is drawn (not bundles or
// clusters, which are only their parts; a cluster is drawn from the office
// sheet the floor already loads) cut from the packs, layered and mirrored as the
// catalog says, and packed into one atlas. Run after changing items:
// `pnpm --dir lab build`. It needs the packs in assets-pack/.
//
// - the atlas goes to private-assets/catalog/items.png (licensed art: never in git);
// - where each item is on it goes to shared-protocol/src/catalog/atlas.json;
// - the atlas's size and hash go in web-shared/assets.manifest.json, so every
//   build pulls it from R2 and checks it like the rest of the art.
//
// Then upload the atlas with the command it prints, as with any changed art (ASSETS.md).
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pngjs from "pngjs";
import { check, isComposite, isGroup, spriteSize } from "./pages/catalog.js";

const { PNG } = pngjs;
const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const PACKS = join(ROOT, "assets-pack");
const CATALOG = join(ROOT, "shared-protocol", "src", "catalog");
const KEY = "catalog/items.png";
const OUT = join(ROOT, "private-assets", KEY);
const MANIFEST = join(ROOT, "web-shared", "assets.manifest.json");
const WIDTH = 1024;
const GAP = 2;

const catalog = JSON.parse(await readFile(join(CATALOG, "items.json"), "utf8"));
const problems = check(catalog);
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
  for (const layer of layers) blit(await source(layer.src), layer.rect, image, layer.at[0], layer.at[1]);
  if (!item.sprite.flip) return image;
  const flipped = new PNG({ width: w, height: h });
  blit(image, [0, 0, w, h], flipped, 0, 0, true, w);
  return flipped;
}

// Shelves, tallest first: simple, and tight enough for things this size.
const drawn = await Promise.all(catalog.items.filter((item) => !isGroup(item)).map(async (item) => ({ item, image: await render(item) })));
drawn.sort((a, b) => b.image.height - a.image.height || b.image.width - a.image.width);
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

const png = PNG.sync.write(atlas, { colorType: 6 });
await mkdir(join(ROOT, "private-assets", "catalog"), { recursive: true });
await writeFile(OUT, png);
const sorted = Object.fromEntries(Object.entries(frames).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(join(CATALOG, "atlas.json"), JSON.stringify({ image: KEY, width: atlas.width, height: atlas.height, frames: sorted }, null, 1) + "\n");

const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
const entry = { key: KEY, sha256: createHash("sha256").update(png).digest("hex"), bytes: png.length };
const known = manifest.files.findIndex((file) => file.key === KEY);
const changed = known < 0 || manifest.files[known].sha256 !== entry.sha256;
if (known < 0) manifest.files.push(entry);
else manifest.files[known] = entry;
await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");

console.log(`${drawn.length} items on a ${atlas.width}×${atlas.height} atlas, ${(png.length / 1024).toFixed(1)} KB`);
if (changed) console.log(`Changed. Upload it: wrangler r2 object put ${manifest.bucket}/${KEY} --file=private-assets/${KEY} --remote`);
else console.log("Same as before: nothing to upload.");
