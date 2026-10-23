// The characters people make, from the pack's character generator:
// `pnpm --dir lab looks`. Every part people can pick, cropped to the frames
// the floor uses, and the pack's premade characters worked out as recipes of
// those parts, into shared-protocol/src/catalog/looks.json. Takes a couple of
// minutes (the pack's sheets are big), so it's apart from the floor's build.
//
// A part sheet in the pack is 56 frames of 32×64 across many rows; the floor
// uses two: idle (row 1) and walk (row 2), six frames each for right, up, left
// and down. Each part becomes one strip of those 48 frames, 1536×64, at
// looks/<part>/<style>-<colour>.png (or looks/<part>/<n>.png for skins and
// eyes), in 8-bit colour: a kilobyte or two, fetched only when someone wears it.
//
// What's offered is chosen for an office: natural skins, everyday outfits, hair
// in every style and colour, and the accessories people wear to work (a beard,
// glasses, a cap, a backpack). The pack's fantasy skins and costumes stay out.
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pngjs from "pngjs";
import { record } from "./manifest.mjs";
import { png8 } from "./png8.mjs";

const { PNG } = pngjs;
const W = 32;
const H = 64;
const FRAMES = 48;
const ROWS = [1, 2];

/**
 * Each part: its folder, how its files are named, and what's offered. Drawn in
 * this order, body first: the pack's own order (CHARACTER_GENERATOR.txt), its
 * accessories split into slots so a beard and glasses can go together.
 */
export const PARTS = [
  { key: "body", dir: "Bodies", match: /^Body_32x32_(\d+)\.png$/, offer: (n) => [1, 2, 3, 4, 6, 7].includes(n), required: true },
  { key: "eyes", dir: "Eyes", match: /^Eyes_32x32_(\d+)\.png$/, offer: () => true, required: true },
  { key: "outfit", dir: "Outfits", match: /^Outfit_(\d+)_32x32_(\d+)\.png$/, offer: (n) => n < 30, required: true },
  { key: "hair", dir: "Hairstyles", match: /^Hairstyle_(\d+)_32x32_(\d+)\.png$/, offer: () => true },
  { key: "beard", dir: "Accessories", match: /^Accessory_(\d+)_\w+?_32x32_(\d+)\.png$/, offer: (n) => n === 12 || n === 13 },
  { key: "glasses", dir: "Accessories", match: /^Accessory_(\d+)_\w+?_32x32_(\d+)\.png$/, offer: (n) => n === 15 },
  { key: "hat", dir: "Accessories", match: /^Accessory_(\d+)_\w+?_32x32_(\d+)\.png$/, offer: (n) => n === 4 || n === 11 },
  { key: "bag", dir: "Accessories", match: /^Accessory_(\d+)_\w+?_32x32_(\d+)\.png$/, offer: (n) => n === 3 },
];

/** A part's id in a look: its number, or style-colour. */
const idOf = (match) => (match[2] ? `${+match[1]}-${+match[2]}` : `${+match[1]}`);

/** The 48 frames the floor uses, in one strip. */
function strip(sheet) {
  const out = new PNG({ width: W * FRAMES, height: H });
  ROWS.forEach((row, r) => {
    for (let col = 0; col < 24; col++) {
      for (let y = 0; y < H; y++) {
        const from = ((row * H + y) * sheet.width + col * W) * 4;
        const to = (y * out.width + (r * 24 + col) * W) * 4;
        sheet.data.copy(out.data, to, from, from + W * 4);
      }
    }
  });
  return out;
}

/** A swatch for a part's colour: its most used colour, outlines and skin aside, facing us. */
function swatch(png, skin) {
  const counts = new Map();
  const x0 = 18 * W;
  for (let y = 0; y < H; y++) {
    for (let x = x0; x < x0 + W; x++) {
      const i = (y * png.width + x) * 4;
      if (png.data[i + 3] < 255) continue;
      const [r, g, b] = png.data.subarray(i, i + 3);
      if (r + g + b < 200) continue;
      const hex = `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
      if (skin?.has(hex)) continue;
      counts.set(hex, (counts.get(hex) ?? 0) + 1);
    }
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "#888888";
}

/** The frames a premade is compared on: each direction standing, and mid-stride. */
const SAMPLES = [0, 6, 12, 18, 27, 33, 39, 45];

/**
 * A part's fully opaque pixels that differ from the premade's, and those that
 * agree, where nothing above touches them (hair shades the face under it, so
 * even a faint pixel above counts).
 */
function compare(part, premade, covered) {
  let wrong = 0;
  let right = 0;
  for (const frame of SAMPLES) {
    for (let y = 0; y < H; y++) {
      for (let x = frame * W; x < frame * W + W; x++) {
        const p = y * part.width + x;
        const i = p * 4;
        if (part.data[i + 3] !== 255 || covered[p]) continue;
        const same = part.data[i] === premade.data[i] && part.data[i + 1] === premade.data[i + 1] && part.data[i + 2] === premade.data[i + 2] && premade.data[i + 3] === 255;
        if (same) right++;
        else if (++wrong) return { wrong, right };
      }
    }
  }
  return { wrong, right };
}

/**
 * A premade as a recipe: from the top layer down, the part that agrees with
 * every pixel of it not covered by what's above, and covers the most.
 * Returns null when it needs a part that isn't offered.
 */
function recipeOf(premade, parts) {
  const covered = new Uint8Array(premade.width * premade.height);
  const look = {};
  for (const part of [...PARTS].reverse()) {
    let best = null;
    for (const [id, { png, offered }] of parts.get(part.key)) {
      const { wrong, right } = compare(png, premade, covered);
      if (wrong > 0 || right < 12) continue;
      if (!best || right > best.right) best = { id, png, right, offered };
    }
    if (!best) {
      if (part.required) return null;
      continue;
    }
    if (!best.offered) return null;
    look[part.key] = best.id;
    for (let i = 0; i < best.png.data.length; i += 4) if (best.png.data[i + 3]) covered[i >> 2] = 1;
  }
  return look;
}

/** The recipe as it's kept and sent: "body.1/eyes.3/outfit.7-3/hair.12-5". */
export const lookString = (look) => PARTS.filter((part) => look[part.key]).map((part) => `${part.key}.${look[part.key]}`).join("/");

export async function buildLooks(packs) {
  const G = join(packs, "moderninteriors", "2_Characters", "Character_Generator");
  const parts = new Map();
  const pictures = [];
  const catalog = { frame: [W, H], frames: FRAMES, parts: {} };
  let skin = null;
  for (const part of PARTS) {
    const options = new Map();
    const offered = [];
    for (const name of (await readdir(join(G, part.dir, "32x32"))).sort()) {
      const match = name.match(part.match);
      if (!match) continue;
      const png = strip(PNG.sync.read(await readFile(join(G, part.dir, "32x32", name))));
      const id = idOf(match);
      const isOffered = part.offer(+match[1]);
      // Every accessory is matched against in each slot, so a premade wearing one that isn't offered is left out.
      if (part.dir === "Accessories" && !isOffered && PARTS.some((other) => other !== part && other.dir === part.dir && other.offer(+match[1]))) continue;
      options.set(id, { png, offered: isOffered });
      if (!isOffered) continue;
      pictures.push({ key: `looks/${part.key}/${id}.png`, png: png8(png) ?? PNG.sync.write(png, { colorType: 6 }) });
      offered.push([id, swatch(png, part.key === "body" ? null : skin)]);
    }
    parts.set(part.key, options);
    if (part.key === "body") {
      // Skin colours, so other parts' swatches don't pick up a hand or face.
      skin = new Set();
      for (const { png } of options.values()) for (let i = 0; i < png.data.length; i += 4) if (png.data[i + 3] === 255) skin.add(`#${((1 << 24) | (png.data[i] << 16) | (png.data[i + 1] << 8) | png.data[i + 2]).toString(16).slice(1)}`);
    }
    catalog.parts[part.key] = { required: !!part.required, options: Object.fromEntries(offered) };
  }

  const premades = [];
  const dir = join(G, "0_Premade_Characters", "32x32");
  for (const name of (await readdir(dir)).sort()) {
    const look = recipeOf(strip(PNG.sync.read(await readFile(join(dir, name)))), parts);
    if (look) premades.push(lookString(look));
  }
  catalog.premades = premades;
  return { catalog, pictures };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
  const { catalog, pictures } = await buildLooks(join(ROOT, "assets-pack"));
  await writeFile(join(ROOT, "shared-protocol", "src", "catalog", "looks.json"), JSON.stringify(catalog, null, 1) + "\n");
  const bytes = pictures.reduce((sum, picture) => sum + picture.png.length, 0);
  console.log(`${pictures.length} parts, ${(bytes / 1024).toFixed(0)} KB; ${catalog.premades.length} premades`);
  const { bucket, changed } = await record(pictures, "looks/");
  if (!changed.length) console.log("Same as before: nothing to upload.");
  else console.log(`${changed.length} changed. Upload them: for each, wrangler r2 object put ${bucket}/<key> --file=private-assets/<key> --remote`);
}
