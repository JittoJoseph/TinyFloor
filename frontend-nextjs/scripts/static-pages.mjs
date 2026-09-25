// After `opennextjs-cloudflare build`: every page built ahead of time, as
// plain files the worker can hand out without starting Next (see
// cf-worker.mjs): the page's HTML, its RSC payload (what the app fetches to
// navigate to it) and the segments of that payload it prefetches. Next serves
// a built page by reading its cache entry (all of those together, 1MB and
// more), parsing and hashing it on every request; the files are streamed as
// they are, so a request costs a millisecond or so.
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

async function copy(from, to) {
  const content = await readFile(join(app, from));
  await mkdir(dirname(join(out, to)), { recursive: true });
  await writeFile(join(out, to), content);
  return content;
}

/**
 * Each page by address (`/de/about`): the ETag of its HTML, the headers Next
 * sends with it (how long the app may keep it, for one), and the segments of
 * its payload there are files for.
 */
const pages = {};
for (const [route, entry] of Object.entries(routes)) {
  // Pages under a locale (/de/about), not Next's internals or metadata files.
  const [, locale, ...rest] = route.split("/");
  if (!entry.dataRoute || !/^[a-z]{2}$/.test(locale)) continue;
  if (SKIP.has(rest[0])) continue;
  const meta = JSON.parse(await readFile(join(app, `${route}.meta`), "utf8").catch(() => "{}"));
  if (meta.status && meta.status !== 200) continue;

  const html = await copy(`${route}.html`, `${route}.html`);
  await copy(`${route}.rsc`, `${route}.rsc`);
  const segments = [];
  for (const segment of meta.segmentPaths ?? []) {
    await copy(`${route}.segments${segment}.segment.rsc`, `${route}.segments${segment}.segment.rsc`);
    segments.push(segment);
  }
  pages[route] = {
    etag: `"${createHash("sha1").update(html).digest("base64url").slice(0, 16)}"`,
    // Without the cache tags, which only Next's own cache reads.
    headers: Object.fromEntries(Object.entries(meta.headers ?? {}).filter(([name]) => name !== "x-next-cache-tags")),
    segments,
  };
}

const site = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.tinyfloor.com");
const paths = Object.keys(pages).sort();
const locales = [...new Set(paths.map((path) => path.split("/")[1]))];
await writeFile(join(root, ".open-next/static-pages.json"), `${JSON.stringify({ host: site.hostname, locales, pages })}\n`);
console.log(`static pages: ${paths.length} built pages served as files, for ${site.hostname}`);
