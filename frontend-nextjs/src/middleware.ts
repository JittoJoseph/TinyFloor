import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/lib/i18n/routing";
import { SITE_URL } from "@/lib/site";

const handleI18nRouting = createMiddleware(routing);
const SITE = new URL(SITE_URL);

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

  // Files (sitemap.xml, robots.txt, sprites, music) carry no locale.
  if (/\.[^/]+$/.test(pathname)) return NextResponse.next();

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
