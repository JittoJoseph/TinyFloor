import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "@/lib/i18n/routing";

const handleI18nRouting = createMiddleware(routing);

// Kept as `middleware.ts` rather than Next 16's `proxy.ts`: OpenNext on
// Cloudflare Workers does not run the Node.js proxy yet.
export function middleware(request: NextRequest) {
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
  // Skip the backend rewrite (`/api`), Next internals and any file with an
  // extension (sprites, maps, music, sitemap.xml, robots.txt).
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
