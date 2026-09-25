import type { Metadata } from "next";
import { X_HANDLE } from "@/lib/site";
import type { Messages } from "next-intl";
import { getTranslations } from "next-intl/server";
import { defaultLocale, localeCodes, type Locale } from "@/lib/i18n/routing";
import { LANDINGS } from "@/lib/landings";

const SITE_NAME = "TinyFloor";

// Open Graph wants language_TERRITORY; our routing codes are only the language.
const OG_LOCALE: Record<Locale, string> = {
  en: "en_US",
  de: "de_DE",
  fr: "fr_FR",
  es: "es_ES",
  it: "it_IT",
  nl: "nl_NL",
  sv: "sv_SE",
  da: "da_DK",
  no: "nb_NO",
  fi: "fi_FI",
  pt: "pt_BR",
  pl: "pl_PL",
  ja: "ja_JP",
  ko: "ko_KR",
  zh: "zh_CN",
  ru: "ru_RU",
  he: "he_IL",
  ar: "ar_AR",
};

export function ogLocale(locale: string): string {
  return OG_LOCALE[locale as Locale] ?? OG_LOCALE.en;
}

/**
 * Prefix an unprefixed route path with a locale. Mirrors `localePrefix:
 * "as-needed"`: English stays unprefixed, so canonical, hreflang and sitemap
 * URLs match what is actually served.
 */
export function localePath(locale: string, path: string): string {
  if (locale === defaultLocale) return path;
  return `/${locale}${path === "/" ? "" : path}`;
}

/**
 * A page's social card (scripts/pictures.mjs draws them): the home page, the
 * lobby and invitations (and an office's own links) have one in every
 * language; the other marketing pages have an
 * English one, and a card without words stands in for them elsewhere.
 */
export function socialImage(locale: string, path: string): string {
  const code = localeCodes.includes(locale as Locale) ? locale : defaultLocale;
  if (path === "/lobby" || path.startsWith("/lobby/")) return `/og/lobby-${code}.jpg`;
  if (/^\/(invite|office)\//.test(path)) return `/og/invite-${code}.jpg`;
  const slug = path.slice(1);
  if (slug && LANDINGS.some((page) => page.slug === slug)) return code === "en" ? `/og/${slug}.jpg` : "/og/neutral.jpg";
  return `/og/home-${code}.jpg`;
}

/** hreflang alternates for every locale plus x-default. */
function languageAlternates(path: string) {
  return {
    ...Object.fromEntries(localeCodes.map((code) => [code, localePath(code, path)])),
    "x-default": localePath(defaultLocale, path),
  };
}

interface PageMetadataInput {
  /** Page title without the brand suffix. Omit for the home page. */
  title?: string;
  description?: string;
  /** Route path WITHOUT the locale prefix, e.g. "/rooms". */
  path: string;
  locale: string;
  /** Keep the page out of search indexes. */
  noindex?: boolean;
  /** OG/Twitter title for pages without a `title` (the home page). */
  socialTitle?: string;
  /** What the social card shows, for people who can't see it. */
  imageAlt?: string;
}

/**
 * Per-page metadata: a locale-specific canonical, hreflang alternates and full
 * OG/Twitter blocks. Next merges metadata shallowly, so setting `openGraph`
 * here replaces the root one entirely; the image is referenced again for that.
 */
export function pageMetadata({
  title,
  description,
  path,
  locale,
  noindex = false,
  socialTitle,
  imageAlt,
}: PageMetadataInput): Metadata {
  const canonical = localePath(locale, path);
  // A title that already names us (an invite's "Join Northwind on TinyFloor") isn't suffixed again.
  const branded = title?.includes(SITE_NAME);
  const fullTitle = title ? (branded ? title : `${title} | ${SITE_NAME}`) : socialTitle;
  const image = { url: socialImage(locale, path), width: 1200, height: 630, type: "image/jpeg", ...(imageAlt ? { alt: imageAlt } : {}) };

  return {
    ...(title ? { title: branded ? { absolute: title } : title } : {}),
    ...(description ? { description } : {}),
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
    alternates: { canonical, languages: languageAlternates(path) },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      url: canonical,
      ...(fullTitle ? { title: fullTitle } : {}),
      ...(description ? { description } : {}),
      locale: ogLocale(locale),
      alternateLocale: localeCodes
        .filter((code) => code !== locale)
        .map((code) => OG_LOCALE[code]),
      images: [image],
    },
    twitter: {
      site: X_HANDLE,
      card: "summary_large_image",
      ...(fullTitle ? { title: fullTitle } : {}),
      ...(description ? { description } : {}),
      images: [image],
    },
  };
}

type RouteParams = Record<string, string>;
type MetadataKey = keyof Messages["metadata"];

/**
 * A route's `generateMetadata`, built from keys under the `metadata` messages.
 * Each localized layout declares only what differs: path, copy and indexing.
 */
export function localizedMetadata({
  path,
  title,
  description,
  socialTitle,
  noindex,
}: {
  path: string | ((params: RouteParams) => string);
  title?: MetadataKey;
  description?: MetadataKey;
  socialTitle?: MetadataKey;
  noindex?: boolean;
}) {
  return async ({ params }: { params: Promise<RouteParams> }): Promise<Metadata> => {
    const resolved = await params;
    const t = await getTranslations({
      locale: resolved.locale as Locale,
      namespace: "metadata",
    });
    return pageMetadata({
      path: typeof path === "function" ? path(resolved) : path,
      locale: resolved.locale,
      title: title && t(title),
      description: description && t(description),
      socialTitle: socialTitle && t(socialTitle),
      imageAlt: t("ogAlt"),
      noindex,
    });
  };
}
