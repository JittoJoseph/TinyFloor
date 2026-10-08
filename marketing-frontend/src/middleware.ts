import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/lib/i18n/routing";
import { GUIDES } from "@/lib/guides";
import { LANDINGS } from "@/lib/landings";
import { APP_PATH, APP_URL, SITE_URL } from "@/lib/site";
import { readerLocale, screen, unprefixed, withCountry } from "@/lib/edge";

const handleI18nRouting = createMiddleware(routing);
const SITE = new URL(SITE_URL);

/**
 * Every address the site has a page for, after its locale prefix. Anything
 * else is sent to the 404 page built ahead of time (app/[locale]/missing), so
 * a stray address costs a file read, not a render. Keep in step with app/[locale].
 */
const PAGES = [
  ...LANDINGS.map((page) => page.slug),
  `guides(/(${GUIDES.map((guide) => guide.slug).join("|")}))?`,
  "about|pricing|features|compare|use-cases|teams|people|privacy|terms|refunds|rooms|online-study-room|og-render",
];
const PAGE = new RegExp(`^(?:/(${routing.locales.join("|")}))?(?:/(?:${PAGES.join("|")}))?/?$`);

// Kept as `middleware.ts` rather than Next 16's `proxy.ts`: OpenNext on
// Cloudflare Workers does not run the Node.js proxy yet.
export function middleware(request: NextRequest) {
  const screened = screen(request, SITE);
  if (screened === "file") return NextResponse.next();
  if (screened) return screened;
  const { pathname, search } = request.nextUrl;

  // The app moved to its own address: the lobby, offices, invitations and
  // signing in, including every link shared before the move, go on there as
  // they are. Visitors to the site itself stay here.
  if (APP_PATH.test(unprefixed(pathname))) {
    return NextResponse.redirect(new URL(`${pathname}${search}`, APP_URL), 308);
  }

  // An address with no page: the prebuilt 404 in the reader's language, with a 404 status.
  if (!PAGE.test(pathname)) {
    return NextResponse.rewrite(new URL(`/${readerLocale(request)}/missing${search}`, request.url), { status: 404 });
  }

  // Detect the locale (cookie → Accept-Language → default) and redirect or
  // rewrite `/path` to its locale.
  return withCountry(request, handleI18nRouting(request));
}

export const config = {
  // Everything but Next's own build output, so even files on an old host redirect.
  matcher: ["/((?!_next).*)"],
};
