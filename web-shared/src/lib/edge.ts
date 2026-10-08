import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/lib/i18n/routing";

/** What both sites' middleware does before routing a request to a page. */

/**
 * What bots scan every site for: server-side scripts and configs (`.php`,
 * `.env`, `.git`), WordPress, CGI and admin tools, and paths we don't serve
 * at all (`/api`, the filesystem). None of it exists here.
 */
export const PROBE =
  /(^|\/)\.(?!well-known\/)[^/]|\.(php\d?|phtml|asp|aspx|jsp|cgi|pl|env|ini|cfg|conf|bak|old|swp|sql|sqlite|db|log|ya?ml|toml|sh|py|rb)(\/|$)|^\/(wp-[^/]*|wordpress|cgi-bin|vendor|phpmyadmin|pma|api|var|etc|proc|boaform|actuator|autodiscover|owa|ecp|remote|solr|console|_ignition|telescope)(\/|$)/i;

/** A file under a locale prefix: `/sv/credits.txt`. */
const LOCALE_FILE = new RegExp(`^/(?:${routing.locales.join("|")})/([^/]+\\.[a-z0-9]+)$`, "i");

const LOCALE_PREFIX = new RegExp(`^/(${routing.locales.join("|")})(?=/|$)`);

/** A path without its locale prefix: `/de/lobby` is `/lobby`, `/de` is `/`. */
export function unprefixed(pathname: string): string {
  return pathname.replace(LOCALE_PREFIX, "") || "/";
}

export function notFound() {
  return new NextResponse("Not found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600", "X-Robots-Tag": "noindex" },
  });
}

/**
 * The checks every request goes through first: one host per site (the bare
 * domain, old subdomains and the workers.dev URL move there for good, path and
 * query intact), scanners turned away, and files served without a locale.
 * Returns a response when that settles the request, or "file" for a file to serve.
 */
export function screen(request: NextRequest, home: URL): NextResponse | "file" | null {
  const { pathname, search } = request.nextUrl;
  const host = (request.headers.get("host") ?? "").replace(/:\d+$/, "");
  if (process.env.NODE_ENV === "production" && host !== home.hostname) {
    return NextResponse.redirect(new URL(`${pathname}${search}`, home), 301);
  }

  // Scanners probing for WordPress, PHP, dotfiles and the like: a plain 404,
  // without rendering a page, since there is nothing here for them.
  if (PROBE.test(pathname)) return notFound();

  // Files carry no locale: `/sv/credits.txt` is `/credits.txt`.
  const prefixed = pathname.match(LOCALE_FILE);
  if (prefixed) return NextResponse.redirect(new URL(`/${prefixed[1]}${search}`, request.url), 308);

  // Files (sitemap.xml, robots.txt, sprites, music) carry no locale.
  if (/\.[^/]+$/.test(pathname)) return "file";
  return null;
}

/** The reader's language for a page we route ourselves: the prefix, else the one they picked before. */
export function readerLocale(request: NextRequest): string {
  const prefix = request.nextUrl.pathname.split("/")[1];
  const picked = request.cookies.get("NEXT_LOCALE")?.value;
  return [prefix, picked].find((one) => one && (routing.locales as readonly string[]).includes(one)) ?? routing.defaultLocale;
}

/**
 * Surface Cloudflare's edge-resolved country as a readable cookie so the
 * language switcher can use it as a low-priority ordering hint. Only a
 * 2-letter code; absent in local dev, where the switcher skips this signal.
 * XX (unknown) and T1 (Tor) carry no useful hint.
 */
export function withCountry(request: NextRequest, response: NextResponse): NextResponse {
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
