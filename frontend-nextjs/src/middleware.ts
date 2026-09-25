import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/lib/i18n/routing";
import { LANDINGS } from "@/lib/landings";
import { SITE_URL } from "@/lib/site";

const handleI18nRouting = createMiddleware(routing);
const SITE = new URL(SITE_URL);

/**
 * What bots scan every site for: server-side scripts and configs (`.php`,
 * `.env`, `.git`), WordPress, CGI and admin tools, and paths we don't serve
 * at all (`/api`, the filesystem). None of it exists here.
 */
const PROBE =
  /(^|\/)\.(?!well-known\/)[^/]|\.(php\d?|phtml|asp|aspx|jsp|cgi|pl|env|ini|cfg|conf|bak|old|swp|sql|sqlite|db|log|ya?ml|toml|sh|py|rb)(\/|$)|^\/(wp-[^/]*|wordpress|cgi-bin|vendor|phpmyadmin|pma|api|var|etc|proc|boaform|actuator|autodiscover|owa|ecp|remote|solr|console|_ignition|telescope)(\/|$)/i;

/** A file under a locale prefix: `/sv/credits.txt`. */
const LOCALE_FILE = new RegExp(`^/(?:${routing.locales.join("|")})/([^/]+\\.[a-z0-9]+)$`, "i");

/**
 * Every address the site has a page for, after its locale prefix. Anything
 * else is sent to the 404 page built ahead of time (app/[locale]/missing), so
 * a stray address costs a file read, not a render. Keep in step with app/[locale].
 */
const PAGES = [
  "",
  ...LANDINGS.map((page) => page.slug),
  "about|people|privacy|terms|rooms|account|admin|auth|create|dashboard|map-render|og-render|video-demo",
  "lobby(/(chat(/[^/]+)?|people|settings|your-office))?",
  "join",
  "invite/[^/]+",
  "office/[^/]+(/(chat(/[^/]+)?|people|settings))?",
];
const PAGE = new RegExp(`^(?:/(${routing.locales.join("|")}))?(?:/(?:${PAGES.filter(Boolean).join("|")}))?/?$`);

function notFound() {
  return new NextResponse("Not found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600", "X-Robots-Tag": "noindex" },
  });
}

// Kept as `middleware.ts` rather than Next 16's `proxy.ts`: OpenNext on
// Cloudflare Workers does not run the Node.js proxy yet.
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // One address for the whole site. The bare domain, the old subdomain and the
  // workers.dev URL all move there for good, path and query intact.
  const host = (request.headers.get("host") ?? "").replace(/:\d+$/, "");
  if (process.env.NODE_ENV === "production" && host !== SITE.hostname) {
    return NextResponse.redirect(new URL(`${pathname}${search}`, SITE), 301);
  }

  // Scanners probing for WordPress, PHP, dotfiles and the like: a plain 404,
  // without rendering a page, since there is nothing here for them.
  if (PROBE.test(pathname)) return notFound();

  // Files carry no locale: `/sv/credits.txt` is `/credits.txt`.
  const prefixed = pathname.match(LOCALE_FILE);
  if (prefixed) return NextResponse.redirect(new URL(`/${prefixed[1]}${search}`, request.url), 308);

  // Files (sitemap.xml, robots.txt, sprites, music) carry no locale.
  if (/\.[^/]+$/.test(pathname)) return NextResponse.next();

  // An address with no page: the prebuilt 404 in the reader's language (the
  // prefix, else the one they picked before), with a 404 status.
  if (!PAGE.test(pathname)) {
    const prefix = pathname.split("/")[1];
    const picked = request.cookies.get("NEXT_LOCALE")?.value;
    const locale = [prefix, picked].find((one) => one && (routing.locales as readonly string[]).includes(one)) ?? routing.defaultLocale;
    return NextResponse.rewrite(new URL(`/${locale}/missing${search}`, request.url), { status: 404 });
  }

  // Detect the locale (cookie → Accept-Language → default) and redirect or
  // rewrite `/path` to its locale.
  const response = handleI18nRouting(request);

  // Surface Cloudflare's edge-resolved country as a readable cookie so the
  // language switcher can use it as a low-priority ordering hint. Only a
  // 2-letter code; absent in local dev, where the switcher skips this signal.
  // XX (unknown) and T1 (Tor) carry no useful hint.
  const country = request.headers.get("cf-ipcountry");
  if (country && /^[A-Z]{2}$/.test(country) && country !== "XX" && country !== "T1") {
    response.cookies.set("country", country, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return response;
}

export const config = {
  // Everything but Next's own build output, so even files on an old host redirect.
  matcher: ["/((?!_next).*)"],
};
