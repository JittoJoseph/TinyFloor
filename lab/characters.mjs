// The characters people walk in as, from the pack: `pnpm --dir lab characters`.
//
// - Presets: the pack's earlier characters, drawn at 32px (the floor used
//   their 16px drawings before; these are the same people with twice the
//   detail, the same size on the floor). Everyone starts as one.
// - Parts: the character generator's bodies, eyes, outfits, hair and
//   accessories, at the same 32px, which a look is put together from.
//
// Each becomes one strip of the 48 frames the floor uses, 32×64 each: idle,
// then walking, six a direction (right, up, left, down), in 8-bit colour, at
// characters/presets/<id>.png and characters/parts/<part>/<id>.png. A preset
// is one layer and a look a few, drawn the same way (shared-protocol
// character.ts).
//
// It also works out, into shared-protocol/src/catalog/characters.json:
// what's offered (each part's styles and colours, with a swatch each), the
// generator's own premade characters as looks (where the creator lets people
// start), and for each preset the look nearest it (where someone wearing a
// preset starts when they change a part). Takes a couple of minutes: the
// pack's sheets are big.
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pngjs from "pngjs";
import { record } from "./manifest.mjs";
import { png8 } from "./png8.mjs";

const { PNG } = pngjs;
const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const CHARACTERS = join(ROOT, "assets-pack", "moderninteriors", "2_Characters");
const G = join(CHARACTERS, "Character_Generator");
const LEGACY = join(CHARACTERS, "Old", "Single_Characters_Legacy", "32x32");
const W = 32;
const H = 64;
const FRAMES = 48;

/** The presets, as the pack names them and as we do: the eight the floor began with first. */
const PRESETS = [
  ["Adam"], ["Alex"], ["Amelia"], ["Ash"], ["Bob"], ["Dan"], ["Lucy"], ["Molly"],
  ["Bruce"], ["Samuel"], ["Edward"], ["Rob"], ["Roki"], ["Pier"], ["Old_man_Josh", "Josh"], ["Old_woman_Jenny", "Jenny"],
];

/**
 * The parts, in the order they're drawn: the pack's (CHARACTER_GENERATOR.txt),
 * its accessories in slots of their own so a beard, glasses and a hat can go
 * together.
 */
const ACCESSORY = /^Accessory_(\d+)_\w+?_32x32_(\d+)\.png$/;
const PARTS = [
  { key: "body", dir: "Bodies", match: /^Body_32x32_(\d+)\.png$/, required: true },
  { key: "eyes", dir: "Eyes", match: /^Eyes_32x32_(\d+)\.png$/, required: true },
  { key: "outfit", dir: "Outfits", match: /^Outfit_(\d+)_32x32_(\d+)\.png$/, required: true },
  { key: "hair", dir: "Hairstyles", match: /^Hairstyle_(\d+)_32x32_(\d+)\.png$/ },
  // Moustache, beard, balaclava, monocle, mask.
  { key: "face", dir: "Accessories", match: ACCESSORY, styles: [7, 12, 13, 16, 17] },
  { key: "glasses", dir: "Accessories", match: ACCESSORY, styles: [15] },
  // Antennae, caps, hats, a beanie, a brain, a bolt, a chef's hat, a party hat.
  { key: "hat", dir: "Accessories", match: ACCESSORY, styles: [1, 2, 4, 5, 6, 8, 9, 10, 11, 18, 19] },
  { key: "gloves", dir: "Accessories", match: ACCESSORY, styles: [14] },
  { key: "bag", dir: "Accessories", match: ACCESSORY, styles: [3] },
];

const idOf = (match) => (match[2] ? `${+match[1]}-${+match[2]}` : `${+match[1]}`);
const hex = (data, i) => `#${((1 << 24) | (data[i] << 16) | (data[i + 1] << 8) | data[i + 2]).toString(16).slice(1)}`;

/** Rows of a sheet, 24 frames each, into one strip of 48. */
function strip(sheets) {
  const out = new PNG({ width: W * FRAMES, height: H });
  sheets.forEach(({ png, y }, r) => {
    for (let col = 0; col < 24; col++) {
      for (let row = 0; row < H; row++) {
        const from = ((y + row) * png.width + col * W) * 4;
        png.data.copy(out.data, (row * out.width + (r * 24 + col) * W) * 4, from, from + W * 4);
      }
    }
  });
  return out;
}
const read = async (path) => PNG.sync.read(await readFile(path));
/** A generator sheet: idle is its second row, walking its third. */
const generatorStrip = (png) => strip([{ png, y: H }, { png, y: 2 * H }]);

/** A swatch for a part's colour: its most used colour, outlines and skin aside, facing us. */
function swatch(png, skin) {
  const counts = new Map();
  for (let y = 0; y < H; y++) {
    for (let x = 18 * W; x < 19 * W; x++) {
      const i = (y * png.width + x) * 4;
      if (png.data[i + 3] < 255 || png.data[i] + png.data[i + 1] + png.data[i + 2] < 160) continue;
      const colour = hex(png.data, i);
      if (!skin?.has(colour)) counts.set(colour, (counts.get(colour) ?? 0) + 1);
    }
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "#888888";
}

/** The frames a character is compared on: each direction standing, and mid-stride. */
const SAMPLES = [0, 6, 12, 18, 27, 33, 39, 45];
/** A part's opaque pixels that agree with a character's, and those that don't, where nothing above touches them. */
function compare(part, target, covered) {
  let wrong = 0;
  let right = 0;
  for (const frame of SAMPLES) {
    for (let y = 0; y < H; y++) {
      for (let x = frame * W; x < frame * W + W; x++) {
        const p = y * part.width + x;
        const i = p * 4;
        if (part.data[i + 3] !== 255 || covered[p]) continue;
        const same = part.data[i] === target.data[i] && part.data[i + 1] === target.data[i + 1] && part.data[i + 2] === target.data[i + 2] && target.data[i + 3] === 255;
        if (same) right++;
        else wrong++;
      }
    }
  }
  return { wrong, right };
}

/** Pixels that differ from the character's, or are missing from it, and how far: a colour distance. */
function distance(part, target, covered) {
  let sum = 0;
  let count = 0;
  for (const frame of SAMPLES) {
    for (let y = 0; y < H; y++) {
      for (let x = frame * W; x < frame * W + W; x++) {
        const p = y * part.width + x;
        const i = p * 4;
        if (part.data[i + 3] !== 255 || covered[p]) continue;
        count++;
        if (target.data[i + 3] !== 255) sum += 300;
        else sum += Math.abs(part.data[i] - target.data[i]) + Math.abs(part.data[i + 1] - target.data[i + 1]) + Math.abs(part.data[i + 2] - target.data[i + 2]);
      }
    }
  }
  return { sum, count };
}

/**
 * A character as a look, from the top layer down. Exactly: each part agrees
 * with every pixel of the character not covered by what's above (the
 * generator's premades are made this way). Nearest: for a drawing that isn't
 * made of parts, the closest part in colour where the slot can't be empty, an
 * accessory only where one fits exactly.
 */
function lookOf(target, parts, exact) {
  const covered = new Uint8Array(target.width * target.height);
  const look = {};
  for (const part of [...PARTS].reverse()) {
    let best = null;
    for (const [id, png] of parts.get(part.key)) {
      if (exact || !part.required && part.key !== "hair") {
        const { wrong, right } = compare(png, target, covered);
        if (wrong > 0 || right < 12) continue;
        if (!best || right > best.score) best = { id, png, score: right };
      } else {
        const { sum, count } = distance(png, target, covered);
        if (count < 12) continue;
        const score = -sum / count;
        if (!best || score > best.score) best = { id, png, score };
      }
    }
    if (!best) {
      if (part.required) return null;
      continue;
    }
    look[part.key] = best.id;
    for (let i = 0; i < best.png.data.length; i += 4) if (best.png.data[i + 3]) covered[i >> 2] = 1;
  }
  return look;
}

/** A look as it's kept and sent: "body.1/eyes.3/outfit.7-3/hair.12-5". */
const lookString = (look) => PARTS.filter((part) => look[part.key]).map((part) => `${part.key}.${look[part.key]}`).join("/");

export async function buildCharacters() {
  const pictures = [];
  const catalog = { frame: [W, H], frames: FRAMES, presets: {}, parts: {}, starts: [] };

  // The parts, and a strip of each.
  const parts = new Map();
  let skin = null;
  for (const part of PARTS) {
    const options = new Map();
    const offered = [];
    for (const name of (await readdir(join(G, part.dir, "32x32"))).sort()) {
      const match = name.match(part.match);
      if (!match || (part.styles && !part.styles.includes(+match[1]))) continue;
      const png = generatorStrip(await read(join(G, part.dir, "32x32", name)));
      const id = idOf(match);
      options.set(id, png);
      pictures.push({ key: `characters/parts/${part.key}/${id}.png`, png: png8(png) ?? PNG.sync.write(png, { colorType: 6 }) });
      offered.push([id, swatch(png, part.key === "body" ? null : skin)]);
    }
    parts.set(part.key, options);
    if (part.key === "body") {
      // Skin colours, so other parts' swatches don't pick up a hand or a face.
      skin = new Set();
      for (const png of options.values()) for (let i = 0; i < png.data.length; i += 4) if (png.data[i + 3] === 255) skin.add(hex(png.data, i));
    }
    catalog.parts[part.key] = { required: !!part.required, options: Object.fromEntries(offered) };
  }

  // The generator's premades, as looks: where making your own starts.
  const premades = join(G, "0_Premade_Characters", "32x32");
  for (const name of (await readdir(premades)).sort()) {
    const look = lookOf(generatorStrip(await read(join(premades, name))), parts, true);
    if (look) catalog.starts.push(lookString(look));
  }

  // The presets, and the look nearest each.
  for (const [file, id = file] of PRESETS) {
    const png = strip([
      { png: await read(join(LEGACY, `${file}_idle_anim_32x32.png`)), y: 0 },
      { png: await read(join(LEGACY, `${file}_run_32x32.png`)), y: 0 },
    ]);
    pictures.push({ key: `characters/presets/${id}.png`, png: png8(png) ?? PNG.sync.write(png, { colorType: 6 }) });
    catalog.presets[id] = { nearest: lookString(lookOf(png, parts, false) ?? {}) };
  }
  return { catalog, pictures };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { catalog, pictures } = await buildCharacters();
  await writeFile(join(ROOT, "shared-protocol", "src", "catalog", "characters.json"), JSON.stringify(catalog, null, 1) + "\n");
  const bytes = pictures.reduce((sum, picture) => sum + picture.png.length, 0);
  console.log(`${Object.keys(catalog.presets).length} presets, ${pictures.length} pictures, ${(bytes / 1024).toFixed(0)} KB; ${catalog.starts.length} premades as looks`);
  const { bucket, changed } = await record(pictures, "characters/");
  // Where the parts were before.
  await record([], "looks/");
  if (!changed.length) console.log("Same as before: nothing to upload.");
  else console.log(`${changed.length} changed. Upload them: for each, wrangler r2 object put ${bucket}/<key> --file=private-assets/<key> --remote`);
}
