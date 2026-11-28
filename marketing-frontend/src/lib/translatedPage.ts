import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { localeDirection, type Locale } from "web-shared/lib/i18n/routing";
import { pageMetadata } from "web-shared/lib/seo";
import { englishOnlyMetadata } from "@/lib/englishOnlyMetadata";

/**
 * For the pages set like the legal ones but written in more than English (the
 * facts, the help center): in a language they're written in, the page says so
 * and lists its language versions; anywhere else it shows the English,
 * marked as English, and points search engines at it.
 */
export async function translatedPage(locale: string, locales: readonly Locale[], updated: string) {
  const translated = locales.includes(locale as Locale);
  const language = translated ? locale : "en";
  const tl = await getTranslations({ locale: locale as Locale, namespace: "legal" });
  const tg = await getTranslations({ locale: locale as Locale, namespace: "guides" });
  const date = new Intl.DateTimeFormat(language, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${updated}T00:00:00Z`));
  return {
    /** The language the words are in. */
    language,
    dir: translated ? localeDirection(locale) : ("ltr" as const),
    note: translated || locale === "en" ? undefined : tl("englishOnly"),
    updatedLine: translated && locale !== "en" ? tg("updated", { date }) : undefined,
    /** The date as LegalPage's English line shows it. */
    updated: date,
  };
}

export function translatedMetadata({ locale, locales, path, title, description }: { locale: string; locales: readonly Locale[]; path: string; title: string; description: string }): Metadata {
  if (locales.length > 1 && locales.includes(locale as Locale)) return pageMetadata({ locale, path, title, description, locales });
  return englishOnlyMetadata({ path, title, description });
}
