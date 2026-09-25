// The worker's entry (wrangler.jsonc `main`): OpenNext's worker, with the
// pages built ahead of time handed out as plain files first.
//
// Next serves a built page by reading its cache entry (the page and its RSC
// payload together, over 1MB for the home page), parsing and hashing it on
// every request: 15 to 60ms of CPU. scripts/static-pages.mjs copies each
// built page's HTML where only this worker can read it, and a visit that Next
// would answer with that same file gets it straight from the assets instead.
//
// Everything else still goes to Next, unchanged: the app's own requests for a
// page's data (RSC, as it navigates), other methods, the old addresses (which
// redirect), an unprefixed address a reader of another language would be sent
// on from, and every page that is rendered per request.
import manifest from "./.open-next/static-pages.json";
import next from "./.open-next/worker.js";

export { BucketCachePurge, DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";

/** Each built page's address (`/de/about`) and its ETag. */
const PAGES = new Map(Object.entries(manifest.pages));
const LOCALES = new Set(manifest.locales);
const DEFAULT_LOCALE = "en";
/** Languages the browser may name another way than we do. */
const ALIASES = { nb: "no", nn: "no", iw: "he" };
/** The request headers Next's pages vary on, so a cache never mixes a page with its data. */
const VARY = "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch";

const worker = {
  async fetch(request, env, ctx) {
    const route = builtPage(request);
    if (route) {
      const etag = PAGES.get(route);
      const headers = new Headers({
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=0, must-revalidate",
        etag,
        vary: VARY,
        "x-served-by": "static-page",
      });
      setCountry(request, headers);
      // The browser has this page already: say so, without reading it.
      if (request.headers.get("if-none-match")?.split(/\s*,\s*/).includes(etag)) {
        return new Response(null, { status: 304, headers });
      }
      const file = await env.ASSETS.fetch(new URL(`/cdn-cgi/_pages${route}.html`, request.url), { method: request.method });
      if (file.ok) return new Response(file.body, { status: 200, headers });
      await file.body?.cancel();
    }
    return next.fetch(request, env, ctx);
  },
};

export default worker;

/** The built page this request asks for, as Next would serve it (`/en/about`), or null. */
function builtPage(request) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url);
  // Only the site's own address: the others are redirected there by the middleware.
  if (url.hostname !== manifest.host) return null;
  // The app fetching a page's data as it navigates, not the page itself.
  if (request.headers.has("rsc") || url.searchParams.has("_rsc")) return null;
  const path = url.pathname;
  if (path !== "/" && path.endsWith("/")) return null;

  const [first] = path.split("/").slice(1);
  if (LOCALES.has(first)) {
    // `/en/...` redirects to the unprefixed address, so English is never prefixed.
    if (first === DEFAULT_LOCALE) return null;
    return PAGES.has(path) ? path : null;
  }
  // Unprefixed is English, unless this reader would be sent to their own language.
  if (wantedLocale(request) !== DEFAULT_LOCALE) return null;
  const route = path === "/" ? `/${DEFAULT_LOCALE}` : `/${DEFAULT_LOCALE}${path}`;
  return PAGES.has(route) ? route : null;
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
