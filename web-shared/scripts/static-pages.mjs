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
//
// It also writes /page-fingerprints.json: a hash of what a search engine reads
// on each page (title, meta tags, links, structured data, text), so the deploy
// can tell IndexNow about the pages whose words changed (scripts/indexnow.mjs).
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

// Run from the frontend being built: `node ../web-shared/scripts/static-pages.mjs`,
// with `--app` for the app (its pages are served at NEXT_PUBLIC_APP_URL).
const root = process.cwd();
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
/** Each page's public address (`/about`, `/de/about`) and the hash of what a search engine reads there. */
const fingerprints = {};
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
  fingerprints[publicPath(route)] = fingerprint(html.toString("utf8"));
}

const site = process.argv.includes("--app")
  ? new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://app.tinyfloor.com")
  : new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.tinyfloor.com");
const paths = Object.keys(pages).sort();
const locales = [...new Set(paths.map((path) => path.split("/")[1]))];
await writeFile(join(root, ".open-next/static-pages.json"), `${JSON.stringify({ host: site.hostname, locales, pages })}\n`);
console.log(`static pages: ${paths.length} built pages served as files, for ${site.hostname}`);

// OpenNext also keeps every built page as a cache entry (the HTML, payload and
// segments again, in one file under a folder named for the build), so each
// page went up twice on every deploy. The pages served as files never reach
// that cache; only those still answered by Next (a built redirect or 404) keep
// theirs. Should a request for one of these pages ever reach Next after all,
// it renders it instead of reading it.
const buildId = (await readFile(join(root, ".next/BUILD_ID"), "utf8")).trim();
const cache = join(root, ".open-next/assets/cdn-cgi/_next_cache", buildId);
let dropped = 0;
for (const route of paths) {
  const entry = join(cache, `${route}.cache`);
  if (!(await stat(entry).catch(() => null))) continue;
  await rm(entry);
  dropped++;
}
console.log(`static pages: ${dropped} of their ${paths.length} cache entries left out of the upload`);
if (paths.length && !dropped) console.warn(`static pages: no cache entries found under ${cache}; has OpenNext moved them?`);

await writeFile(
  join(root, ".open-next/assets/page-fingerprints.json"),
  `${JSON.stringify({ site: site.origin, pages: Object.fromEntries(Object.entries(fingerprints).sort()) })}\n`,
);

/** `/en/about` is served at `/about`, and `/en` at `/`. */
function publicPath(route) {
  if (route === "/en") return "/";
  return route.startsWith("/en/") ? route.slice(3) : route;
}

/**
 * What a crawler reads on a page, hashed: the title, meta tags, canonical and
 * language links (Next may stream these into the body, so the whole page is
 * searched), the structured data, and the body's text, links and image
 * descriptions. Scripts, styles and asset names change on every build without
 * the page changing, so they are left out.
 */
function fingerprint(html) {
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html;
  const read = [
    ...html.matchAll(/<title[^>]*>[\s\S]*?<\/title>|<meta\s[^>]*(?:name|property)=[^>]*>|<link\s[^>]*rel="(?:canonical|alternate)"[^>]*>/gi),
  ].map(([tag]) => tag);
  const structured = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map(([, json]) => json);
  const visible = body.replace(/<(script|style|template|noscript)[^>]*>[\s\S]*?<\/\1>/gi, " ");
  const links = [...visible.matchAll(/<a\s[^>]*href="([^"]*)"/gi)].map(([, href]) => href);
  const alts = [...visible.matchAll(/\salt="([^"]*)"/gi)].map(([, alt]) => alt);
  const text = visible.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return createHash("sha1").update(JSON.stringify([read, structured, links, alts, text])).digest("base64url").slice(0, 16);
}
