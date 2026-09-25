// After `opennextjs-cloudflare build`: every page built ahead of time, as a
// plain HTML file the worker can hand out without starting Next (see
// cf-worker.mjs). Next serves a built page by reading its cache entry (the
// page and its RSC payload, 1MB and more), parsing and hashing it on every
// request; the file is streamed as is, so a visit costs a millisecond or so.
//
// Only pages Next answers with a 200 are copied; a built redirect or 404 keeps
// going through Next. The files go under /cdn-cgi, which only the worker can
// read, so they are never served at a second address.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const app = join(root, ".next/server/app");
const out = join(root, ".open-next/assets/cdn-cgi/_pages");

/** Pages reached only through the middleware, never at their own address. */
const SKIP = new Set(["missing"]);

const { routes } = JSON.parse(await readFile(join(root, ".next/prerender-manifest.json"), "utf8"));

/** Each page's address and a hash of it, which the worker sends as its ETag. */
const pages = {};
for (const [route, entry] of Object.entries(routes)) {
  // Pages under a locale (/de/about), not Next's internals or metadata files.
  const [, locale, ...rest] = route.split("/");
  if (!entry.dataRoute || !/^[a-z]{2}$/.test(locale)) continue;
  if (SKIP.has(rest[0])) continue;
  const meta = JSON.parse(await readFile(join(app, `${route}.meta`), "utf8").catch(() => "{}"));
  if (meta.status && meta.status !== 200) continue;
  const html = await readFile(join(app, `${route}.html`));
  const target = join(out, `${route}.html`);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, html);
  pages[route] = `"${createHash("sha1").update(html).digest("base64url").slice(0, 16)}"`;
}

const site = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.tinyfloor.com");
const paths = Object.keys(pages).sort();
const locales = [...new Set(paths.map((path) => path.split("/")[1]))];
await writeFile(join(root, ".open-next/static-pages.json"), `${JSON.stringify({ host: site.hostname, locales, pages })}\n`);
console.log(`static pages: ${paths.length} built pages served as files, for ${site.hostname}`);
