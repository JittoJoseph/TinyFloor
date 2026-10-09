import { defaultLocale } from "@/lib/i18n/routing";

/** The marketing site: the home page, pricing, guides, the legal pages. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.tinyfloor.com";

/** The app: the lobby, offices, invitations, signing in. A Worker of its own (docs/21). */
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://app.tinyfloor.com";

/**
 * The app's addresses, after any locale prefix. The marketing site sends them
 * on to the app, path and query intact, so links shared before the split
 * (invitations, offices, the lobby) still work; the app sends everything else back.
 */
export const APP_PATH = /^\/(account|admin|auth|create|dashboard|join|lobby|invite|office|map-render|video-demo)(\/|$)/;

/**
 * A path on the other site in a locale, addressed the way that site serves it:
 * English unprefixed, every other language with its prefix. The address alone
 * picks the language, so a reader on a /es page lands on /es pages over there.
 */
export function crossHref(base: string, locale: string, path: string): string {
  const [route, rest = ""] = path.split(/(?=[?#])/, 2);
  if (locale === defaultLocale) return `${base}${route}${rest}`;
  return `${base}/${locale}${route === "/" ? "" : route}${rest}`;
}
export const appHref = (locale: string, path: string) => crossHref(APP_URL, locale, path);
export const siteHref = (locale: string, path: string) => crossHref(SITE_URL, locale, path);

/** TinyFloor's own pages elsewhere: the footer links them, and search engines read them as the same company. */
export const SOCIALS = {
  linkedin: "https://www.linkedin.com/company/tinyfloor",
  x: "https://x.com/tinyflooroffice",
  github: "https://github.com/JittoJoseph/TinyFloor",
} as const;

/** Who writes the guides; the byline links to LinkedIn. */
export const AUTHOR = {
  name: "Jitto Joseph",
  url: "https://www.jittojoseph.xyz",
  linkedin: "https://www.linkedin.com/in/jittojoseph17/",
  github: "https://github.com/JittoJoseph",
} as const;

/** Where people write to us: support, privacy, billing and refunds alike. */
export const SUPPORT_EMAIL = "support@tinyfloor.com";

/** The company's handle on X, for link cards there. */
export const X_HANDLE = "@tinyflooroffice";
