// Checks the catalog, every layout and every template against the house rules
// (pages/catalog.js, pages/floor.js): no sideways seats, every desk with a chair
// and a place to arrive, wooden desks, everything on the grid. Needs no art, so
// it can run anywhere: `pnpm --dir lab check`.
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { check } from "./pages/catalog.js";
import { checkTemplate } from "./pages/floor.js";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const CATALOG = join(ROOT, "shared-protocol", "src", "catalog");

const catalog = JSON.parse(await readFile(join(CATALOG, "items.json"), "utf8"));
const names = (await readdir(join(CATALOG, "layouts")).catch(() => [])).filter((name) => name.endsWith(".json"));
const layouts = await Promise.all(names.map(async (name) => JSON.parse(await readFile(join(CATALOG, "layouts", name), "utf8"))));

const templateNames = (await readdir(join(CATALOG, "templates")).catch(() => [])).filter((name) => name.endsWith(".json"));
const templates = await Promise.all(templateNames.map(async (name) => JSON.parse(await readFile(join(CATALOG, "templates", name), "utf8"))));
const byId = new Map(catalog.items.map((item) => [item.id, item]));

const problems = [...check(catalog, layouts), ...templates.flatMap((template) => checkTemplate(byId, template))];
for (const problem of problems) console.error(`✗ ${problem}`);
console.log(`${catalog.items.length} items, ${layouts.length} layouts, ${templates.length} templates: ${problems.length ? `${problems.length} problems` : "all good"}`);
process.exit(problems.length ? 1 : 0);
