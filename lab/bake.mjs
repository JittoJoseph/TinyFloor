// Bakes a layout into its template from the command line, as the layout
// editor's Bake template does: a new version only when something changed.
//
//   node lab/bake.mjs campus

import { readFile, writeFile } from "node:fs/promises";
import { bake, checkTemplate } from "./pages/floor.js";

const id = process.argv[2];
const data = (kind, name) => new URL(`../shared-protocol/src/catalog/${kind}/${name}.json`, import.meta.url);
const read = async (url) => JSON.parse(await readFile(url, "utf8"));
const catalog = await read(new URL("../shared-protocol/src/catalog/items.json", import.meta.url));
const byId = new Map(catalog.items.map((item) => [item.id, item]));
const layout = await read(data("layouts", id));
const shell = await read(data("shells", layout.shell));
const old = await read(data("templates", id)).catch(() => null);
const template = bake(byId, shell, layout, { version: old?.version ?? 1, theme: old?.theme ?? "startup" });
const same = old && JSON.stringify({ ...old, version: 0 }) === JSON.stringify({ ...template, version: 0 });
if (old && !same) template.version = old.version + 1;
const problems = checkTemplate(byId, template);
if (problems.length) {
  console.error(`Not baked:\n${problems.join("\n")}`);
  process.exit(1);
}
if (!same) await writeFile(data("templates", id), JSON.stringify(template) + "\n");
console.log(`${same ? "unchanged" : "baked"} ${template.id}@${template.version}: ${template.pieces.length} pieces, ${template.seats.length} seats`);
