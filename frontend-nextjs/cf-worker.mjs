// The worker's entry (wrangler.jsonc `main`): OpenNext's worker, with the
// pages built ahead of time handed out as plain files first.
//
// Next serves a built page by reading its cache entry (the page's HTML and
// RSC payload together, over 1MB for the home page), parsing and hashing it on
// every request: 15 to 60ms of CPU. scripts/static-pages.mjs copies each built
// page's files where only this worker can read them, and whatever Next would
// answer with one of those files (the page, its payload as the app navigates
// to it, or a segment of that as it prefetches) comes straight from the
// assets instead, the same way OpenNext's cache would serve it.
//
// Everything else still goes to Next, unchanged: other methods, the old
// addresses (which redirect), an unprefixed address a reader of another
// language would be sent on from, and every page rendered per request.
import manifest from "./.open-next/static-pages.json";
import next from "./.open-next/worker.js";

export { BucketCachePurge, DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";

/** Each built page by address (`/de/about`): its HTML's ETag, Next's headers for it, and its segments. */
const PAGES = new Map(Object.entries(manifest.pages));
const LOCALES = new Set(manifest.locales);
const DEFAULT_LOCALE = "en";
/** Languages the browser may name another way than we do. */
const ALIASES = { nb: "no", nn: "no", iw: "he" };
/** The request headers Next's pages vary on, so a cache never mixes a page with its data. */
const VARY = "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch";

const worker = {
  async fetch(request, env, ctx) {
    const wanted = builtFile(request);
    const response = wanted && (await serve(wanted, request, env));
    return response ?? next.fetch(request, env, ctx);
  },
};

export default worker;

/**
 * The built file this request asks for, as Next would serve it: the page at
 * `/en/about`, its payload, or one of its segments. Null when Next should
 * answer.
 */
function builtFile(request) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url);
  // Only the site's own address: the others are redirected there by the middleware.
  if (url.hostname !== manifest.host) return null;
  const data = request.headers.get("rsc") === "1";
  if (!data && url.searchParams.has("_rsc")) return null;
  const path = url.pathname;
  if (path !== "/" && path.endsWith("/")) return null;

  let route;
  const [first] = path.split("/").slice(1);
  if (LOCALES.has(first)) {
    // `/en/...` redirects to the unprefixed address, so English is never prefixed.
    if (first === DEFAULT_LOCALE) return null;
    route = path;
  } else {
    // Unprefixed is English, unless this reader would be sent to their own language.
    if (wantedLocale(request) !== DEFAULT_LOCALE) return null;
    route = path === "/" ? `/${DEFAULT_LOCALE}` : `/${DEFAULT_LOCALE}${path}`;
  }
  const page = PAGES.get(route);
  if (!page) return null;
  if (!data) return { route, page, file: `${route}.html` };
  // A prefetch asks for one segment of the payload by name; any other data request gets all of it.
  const segment = request.headers.get("next-router-segment-prefetch");
  if (!segment) return { route, page, file: `${route}.rsc`, data };
  return page.segments.includes(segment) ? { route, page, file: `${route}.segments${segment}.segment.rsc`, data, segment } : null;
}

/** The file, with the headers Next would send; null if it isn't there after all. */
async function serve({ page, file, data, segment }, request, env) {
  const headers = new Headers({
    ...page.headers,
    "cache-control": "public, max-age=0, must-revalidate",
    vary: VARY,
    "x-served-by": "static-page",
  });
  if (data) {
    headers.set("content-type", "text/x-component");
    // As OpenNext marks a segment it serves from its cache.
    if (segment) headers.set("x-nextjs-postponed", "2");
  } else {
    headers.set("content-type", "text/html; charset=utf-8");
    headers.set("etag", page.etag);
    setCountry(request, headers);
    // The browser has this page already: say so, without reading it.
    if (request.headers.get("if-none-match")?.split(/\s*,\s*/).includes(page.etag)) {
      return new Response(null, { status: 304, headers });
    }
  }
  const found = await env.ASSETS.fetch(new URL(`/cdn-cgi/_pages${file}`, request.url), { method: request.method });
  if (found.ok) return new Response(found.body, { status: 200, headers });
  await found.body?.cancel();
  return null;
}

/**
 * The language next-intl's middleware would pick for an unprefixed address:
 * the one the reader chose before (its cookie), else the first their browser
 * asks for that the site has. Anything unsure counts as another language, so
 * Next decides.
 */
function wantedLocale(request) {
  const chosen = cookie(request, "NEXT_LOCALE");
  if (chosen) return chosen;
  const asked = (request.headers.get("accept-language") ?? "")
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const q = Number(params.find((param) => param.trim().startsWith("q="))?.trim().slice(2) ?? 1);
      return { base: tag.split("-")[0].toLowerCase(), q: Number.isNaN(q) ? 0 : q, index };
    })
    .filter((one) => one.base && one.base !== "*" && one.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  for (const { base } of asked) {
    const code = ALIASES[base] ?? base;
    if (LOCALES.has(code)) return code;
  }
  return DEFAULT_LOCALE;
}

function cookie(request, name) {
  const match = (request.headers.get("cookie") ?? "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** The reader's country as a cookie, as the middleware sets it: a hint for the language menu's order. */
function setCountry(request, headers) {
  const country = request.headers.get("cf-ipcountry");
  if (!country || !/^[A-Z]{2}$/.test(country) || country === "XX" || country === "T1") return;
  if (cookie(request, "country") === country) return;
  headers.append("set-cookie", `country=${country}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`);
}
