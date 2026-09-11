import type { Metadata } from "next";
import { defaultLocale, localeCodes, type Locale } from "@/lib/i18n/routing";

const SITE_NAME = "SpatialMeet";

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

/** hreflang alternates for every locale plus x-default. */
export function languageAlternates(path: string) {
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
}: PageMetadataInput): Metadata {
  const canonical = localePath(locale, path);
  const fullTitle = title ? `${title} | ${SITE_NAME}` : socialTitle;

  return {
    ...(title ? { title } : {}),
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
      images: [{ url: "/office.png", width: 1200, height: 800 }],
    },
    twitter: {
      card: "summary_large_image",
      ...(fullTitle ? { title: fullTitle } : {}),
      ...(description ? { description } : {}),
      images: ["/office.png"],
    },
  };
}
