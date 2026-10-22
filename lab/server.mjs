// The lab (lab/README.md): a local page for turning the bought art
// into floor items, with their colliders, seats and sort lines checked against
// a character walking round them. Serves the page, Phaser, the packs from
// assets-pack/ and our characters from private-assets/, and reads and writes
// the item catalog. Local only; nothing here ships.
import { createServer } from "node:http";
import { stripTypeScriptTypes } from "node:module";
import { mkdir, readFile, writeFile, readdir, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = resolve(fileURLToPath(import.meta.url), "..");
const ROOT = resolve(HERE, "..");
const LAB = join(HERE, "pages");
const CATALOG = join(ROOT, "shared-protocol", "src", "catalog", "items.json");
const LAYOUTS = join(ROOT, "shared-protocol", "src", "catalog", "layouts");
const SHELLS = join(ROOT, "shared-protocol", "src", "catalog", "shells");
const TEMPLATES = join(ROOT, "shared-protocol", "src", "catalog", "templates");
const PORT = Number(process.env.PORT || 4400);

// Where each kind of file is served from: /<mount>/<path inside it>.
const MOUNTS = {
  lab: LAB,
  pack: join(ROOT, "assets-pack"),
  private: join(ROOT, "private-assets"),
  phaser: join(HERE, "node_modules", "phaser", "dist"),
  app: join(ROOT, "app-frontend", "public"),
  // What the lab and the app share (the walls' drawing): TypeScript, served with its types stripped.
  "shared-protocol": join(ROOT, "shared-protocol"),
};

// What the lab offers to cut items from: folders of single objects, and whole
// sheets to draw a rectangle on (whole desks, say, are only drawn on a sheet).
const SOURCES = [
  { label: "Office singles", dir: "modernoffice/4_Modern_Office_singles/32x32" },
  { label: "Office sheet", sheet: "modernoffice/2_Modern_Office_Black_Shadow/Modern_Office_Black_Shadow_32x32.png" },
];
const THEMES = "moderninteriors/1_Interiors/32x32/Theme_Sorter_Black_Shadow_Singles_32x32";
const THEME_SHEETS = "moderninteriors/1_Interiors/32x32/Theme_Sorter_Black_Shadow_32x32";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".gif": "image/gif",
};

const tidy = (name) => name.replace(/^\d+_/, "").replace(/(_Black_Shadow)?(_S[Ii]ngles)?_32x32(\.png)?$/, "").replace(/_/g, " ");
const number = (name) => Number(name.match(/(\d+)\.png$/)?.[1] ?? 0);

async function sources() {
  const themes = (await readdir(join(MOUNTS.pack, THEMES)).catch(() => []))
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map((name) => ({ label: `${tidy(name)} singles`, dir: `${THEMES}/${name}` }));
  const sheets = (await readdir(join(MOUNTS.pack, THEME_SHEETS)).catch(() => []))
    .filter((name) => name.endsWith(".png"))
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map((name) => ({ label: `${tidy(name)} sheet`, sheet: `${THEME_SHEETS}/${name}` }));
  return [...SOURCES, ...themes, ...sheets];
}

async function files(dir) {
  const full = inside(MOUNTS.pack, dir);
  const names = (await readdir(full)).filter((name) => name.endsWith(".png"));
  return names.sort((a, b) => number(a) - number(b) || a.localeCompare(b));
}

/** A path under base, or an error: requests never leave the folder they name. */
function inside(base, path) {
  const full = normalize(join(base, decodeURIComponent(path)));
  if (full !== base && !full.startsWith(base + sep)) throw Object.assign(new Error("outside"), { status: 403 });
  return full;
}

async function body(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function send(response, status, data, type = TYPES[".json"]) {
  response.writeHead(status, { "content-type": type, "cache-control": "no-store" });
  response.end(typeof data === "string" || Buffer.isBuffer(data) ? data : JSON.stringify(data));
}

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://lab");
    const path = url.pathname;
    if (path === "/") return response.writeHead(302, { location: "/lab/index.html" }).end();
    if (path === "/api/sources") return send(response, 200, await sources());
    if (path === "/api/files") return send(response, 200, await files(url.searchParams.get("dir") ?? ""));
    if (path === "/api/catalog" && request.method === "GET") {
      return send(response, 200, await readFile(CATALOG, "utf8").catch(() => '{"version":1,"items":[]}'));
    }
    if (path === "/api/catalog" && request.method === "PUT") {
      const catalog = JSON.parse(await body(request));
      await writeFile(CATALOG, JSON.stringify(catalog, null, 2) + "\n");
      return send(response, 200, { saved: catalog.items.length });
    }
    // Layouts, shells and templates: a folder of JSON files each, listed, read and written by id.
    const folder = path.match(/^\/api\/(layouts|shells|templates)(?:\/([a-z0-9-]+))?$/);
    if (folder) {
      const [, kind, id] = folder;
      const dir = { layouts: LAYOUTS, shells: SHELLS, templates: TEMPLATES }[kind];
      if (!id) {
        const names = (await readdir(dir).catch(() => [])).filter((name) => name.endsWith(".json"));
        return send(response, 200, names.map((name) => name.slice(0, -5)));
      }
      if (request.method === "GET") return send(response, 200, await readFile(join(dir, `${id}.json`), "utf8"));
      if (request.method === "PUT") {
        const data = JSON.parse(await body(request));
        await mkdir(dir, { recursive: true });
        await writeFile(join(dir, `${id}.json`), JSON.stringify(data, null, kind === "shells" ? 2 : 1) + "\n");
        return send(response, 200, { saved: id });
      }
    }
    const [, mount, ...rest] = path.split("/");
    const base = MOUNTS[mount];
    if (!base) return send(response, 404, "not found", "text/plain");
    const file = inside(base, rest.join("/"));
    if (!(await stat(file)).isFile()) return send(response, 404, "not found", "text/plain");
    if (extname(file) === ".ts") return send(response, 200, stripTypeScriptTypes(await readFile(file, "utf8")), TYPES[".js"]);
    return send(response, 200, await readFile(file), TYPES[extname(file)] ?? "application/octet-stream");
  } catch (error) {
    send(response, error.status ?? (error.code === "ENOENT" ? 404 : 500), String(error.message ?? error), "text/plain");
  }
}).listen(PORT, () => console.log(`item lab on http://localhost:${PORT}/lab/index.html`));
