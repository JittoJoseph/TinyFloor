import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/lib/i18n/routing";
import { APP_PATH, APP_URL, SITE_URL } from "@/lib/site";
import { screen, unprefixed, withCountry } from "@/lib/edge";

const handleI18nRouting = createMiddleware(routing);
const APP = new URL(APP_URL);

// Kept as `middleware.ts` rather than Next 16's `proxy.ts`: OpenNext on
// Cloudflare Workers does not run the Node.js proxy yet.
export function middleware(request: NextRequest) {
  const screened = screen(request, APP);
  if (screened === "file") return NextResponse.next();
  if (screened) return screened;
  const { pathname, search } = request.nextUrl;
  const path = unprefixed(pathname);

  // The marketing site's pages, and anything else that isn't the app's, are
  // the marketing site's to serve (or to 404).
  if (path !== "/" && !APP_PATH.test(path)) {
    return NextResponse.redirect(new URL(`${pathname}${search}`, SITE_URL), 308);
  }

  // `/path` is English and `/de/path` German: the address alone says the
  // language (routing.ts), so nobody is redirected to another one.
  const response = withCountry(request, handleI18nRouting(request));
  // The lobby is open to everyone and worth finding; the rest is behind a sign-in.
  if (path !== "/lobby") response.headers.set("X-Robots-Tag", "noindex");
  return response;
}

export const config = {
  // Everything but Next's own build output, so even files on an old host redirect.
  matcher: ["/((?!_next).*)"],
};
