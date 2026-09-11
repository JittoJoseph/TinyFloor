import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "@/lib/i18n/routing";

const handleI18nRouting = createMiddleware(routing);

export function proxy(request: NextRequest) {
  // Detect the locale (cookie → Accept-Language → default) and redirect or
  // rewrite `/path` to its locale.
  const response = handleI18nRouting(request);

  // Surface Vercel's edge-resolved country as a readable cookie so the language
  // switcher can use it as a low-priority ordering hint. Only a 2-letter code;
  // empty off Vercel, where the switcher skips this signal.
  const country = request.headers.get("x-vercel-ip-country");
  if (country) {
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
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
