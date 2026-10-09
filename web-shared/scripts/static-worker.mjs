// Each frontend's worker entry (its cf-worker.mjs, wrangler.jsonc `main`):
// OpenNext's worker, with the pages built ahead of time handed out as plain
// files first.
//
// Next serves a built page by reading its cache entry (the page's HTML and
// RSC payload together, over 1MB for the home page), parsing and hashing it on
// every request: 15 to 60ms of CPU. static-pages.mjs copies each built page's
// files where only the worker can read them, and whatever Next would answer
// with one of those files (the page, its payload as the app navigates to it,
// or a segment of that as it prefetches) comes straight from the assets
// instead, the same way OpenNext's cache would serve it.
//
// Everything else still goes to Next, unchanged: other methods, the old
// addresses (which redirect), and every page rendered per request.

const DEFAULT_LOCALE = "en";
/** The request headers Next's pages vary on, so a cache never mixes a page with its data. */
const VARY = "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch";

/**
 * The worker: `next` is OpenNext's, `manifest` the built pages
 * (.open-next/static-pages.json). `sharedPages` maps addresses onto a page
 * built once for many ([pattern, replacement] on `/de/...`), and `noindex`
 * says which built pages search engines are told to skip.
 */
export function withStaticPages(next, manifest, { sharedPages = [], noindex = () => false } = {}) {
  /** Each built page by address (`/de/about`): its HTML's ETag, Next's headers for it, and its segments. */
  const PAGES = new Map(Object.entries(manifest.pages));
  const LOCALES = new Set(manifest.locales);

  return {
    async fetch(request, env, ctx) {
      const wanted = builtFile(request);
      const response = wanted && (await serve(wanted, request, env));
      return response ?? next.fetch(request, env, ctx);
    },
  };

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
      // Unprefixed is English: the address alone says the language.
      route = path === "/" ? `/${DEFAULT_LOCALE}` : `/${DEFAULT_LOCALE}${path}`;
    }
    const shared = sharedPages.find(([pattern]) => pattern.test(route));
    if (shared) route = route.replace(...shared);
    const page = PAGES.get(route);
    if (!page) return null;
    if (!data) return { route, page, file: `${route}.html` };
    // A prefetch asks for one segment of the payload by name; any other data request gets all of it.
    const segment = request.headers.get("next-router-segment-prefetch");
    if (!segment) return { route, page, file: `${route}.rsc`, data };
    return page.segments.includes(segment) ? { route, page, file: `${route}.segments${segment}.segment.rsc`, data, segment } : null;
  }

  /** The file, with the headers Next would send; null if it isn't there after all. */
  async function serve({ route, page, file, data, segment }, request, env) {
    const headers = new Headers({
      ...page.headers,
      "cache-control": "public, max-age=0, must-revalidate",
      vary: VARY,
      "x-served-by": "static-page",
    });
    if (noindex(route)) headers.set("x-robots-tag", "noindex");
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
