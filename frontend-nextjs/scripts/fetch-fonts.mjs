// The site's three faces, hosted with the site instead of fetched from Google
// Fonts at build time (next/font/google did that, and a build failed when one
// answer came back malformed). Run it again to change a face or a weight:
//
//   node scripts/fetch-fonts.mjs
//
// It asks Google for each family's stylesheet the way a current Chrome would,
// saves every font file to public/fonts/ (named by family, version and
// subset, so a new version is a new file and the old one can stay cached),
// and writes src/app/fonts.css with the same @font-face rules pointing at
// them: one file per script, loaded only when a page uses that script.

import { mkdir, readdir, rm, writeFile } from "node:fs/promises";

const FAMILIES = [
  // The app's face and the site's.
  { name: "Geist", query: "Geist:wght@100..900" },
  // The default body face: the 404 page and the share images.
  { name: "Nunito", query: "Nunito:wght@400;600;700;800" },
  // The nameplates on the floor.
  { name: "VT323", query: "VT323" },
];

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const OUT = new URL("../public/fonts/", import.meta.url);
const CSS = new URL("../src/app/fonts.css", import.meta.url);

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

let css = `/* The site's faces, self-hosted. Written by scripts/fetch-fonts.mjs; don't edit by hand. */\n`;
const saved = new Map();

for (const family of FAMILIES) {
  const url = `https://fonts.googleapis.com/css2?family=${family.query}&display=swap`;
  const response = await fetch(url, { headers: { "user-agent": UA } });
  if (!response.ok) throw new Error(`${family.name}: ${response.status}`);
  const sheet = await response.text();

  // Each rule is preceded by a comment naming its subset: /* latin-ext */ @font-face {...}
  for (const [, subset, rule] of sheet.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]+\})/g)) {
    const source = /url\((https:[^)]+)\)/.exec(rule)?.[1];
    if (!source) throw new Error(`${family.name} ${subset}: no font file`);
    const version = /\/(v\d+)\//.exec(source)?.[1] ?? "v0";
    const file = `${family.name.toLowerCase()}-${version}-${subset}.woff2`;

    // Weights of one variable font share a file: fetch it once.
    if (!saved.has(file)) {
      const font = await fetch(source, { headers: { "user-agent": UA } });
      if (!font.ok) throw new Error(`${file}: ${font.status}`);
      await writeFile(new URL(file, OUT), Buffer.from(await font.arrayBuffer()));
      saved.set(file, source);
    }
    css += `/* ${family.name}, ${subset} */\n${rule.replace(source, `/fonts/${file}`)}\n`;
  }
}

await writeFile(CSS, css);
const files = await readdir(OUT);
console.log(`${files.length} font files in public/fonts, and src/app/fonts.css`);
