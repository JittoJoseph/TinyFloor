import { defineRouting } from "next-intl/routing";

/**
 * Supported locales. `en` is the source/base; every other dictionary falls back
 * to it for missing keys (see `i18n/request.ts`).
 *
 * `label` is the autonym (each language in its own script) so it reads the same
 * whatever the active locale is. `enName` is only used to make the switcher
 * search forgiving (typing "japanese" finds "日本語"); it is never displayed.
 * `dir` drives `<html dir>` (Arabic and Hebrew are RTL).
 */
export const locales = [
  { code: "en", label: "English", enName: "English", flag: "🇺🇸", dir: "ltr" },
  { code: "de", label: "Deutsch", enName: "German", flag: "🇩🇪", dir: "ltr" },
  { code: "fr", label: "Français", enName: "French", flag: "🇫🇷", dir: "ltr" },
  { code: "es", label: "Español", enName: "Spanish", flag: "🇪🇸", dir: "ltr" },
  { code: "it", label: "Italiano", enName: "Italian", flag: "🇮🇹", dir: "ltr" },
  { code: "nl", label: "Nederlands", enName: "Dutch", flag: "🇳🇱", dir: "ltr" },
  { code: "sv", label: "Svenska", enName: "Swedish", flag: "🇸🇪", dir: "ltr" },
  { code: "da", label: "Dansk", enName: "Danish", flag: "🇩🇰", dir: "ltr" },
  { code: "no", label: "Norsk", enName: "Norwegian", flag: "🇳🇴", dir: "ltr" },
  { code: "fi", label: "Suomi", enName: "Finnish", flag: "🇫🇮", dir: "ltr" },
  { code: "pt", label: "Português", enName: "Portuguese", flag: "🇧🇷", dir: "ltr" },
  { code: "pl", label: "Polski", enName: "Polish", flag: "🇵🇱", dir: "ltr" },
  { code: "ja", label: "日本語", enName: "Japanese", flag: "🇯🇵", dir: "ltr" },
  { code: "ko", label: "한국어", enName: "Korean", flag: "🇰🇷", dir: "ltr" },
  { code: "zh", label: "中文", enName: "Chinese", flag: "🇨🇳", dir: "ltr" },
  { code: "ru", label: "Русский", enName: "Russian", flag: "🇷🇺", dir: "ltr" },
  { code: "he", label: "עברית", enName: "Hebrew", flag: "🇮🇱", dir: "rtl" },
  { code: "ar", label: "العربية", enName: "Arabic", flag: "🇸🇦", dir: "rtl" },
] as const;

export type Locale = (typeof locales)[number]["code"];

export const localeCodes = locales.map((l) => l.code) as [Locale, ...Locale[]];

export const defaultLocale: Locale = "en";

export function localeDirection(locale: string): "ltr" | "rtl" {
  return locales.find((l) => l.code === locale)?.dir ?? "ltr";
}

export const routing = defineRouting({
  locales: localeCodes,
  defaultLocale,
  // English is served unprefixed (`/rooms`); every other locale keeps its
  // prefix (`/de/rooms`). `/en/...` redirects to the unprefixed path, so there
  // is no duplicate content.
  localePrefix: "as-needed",
  // The address alone says the language: nobody is ever redirected to another
  // one by their browser's language or a remembered pick. A page's links keep
  // its language (on both sites), and the language menu is how to change it.
  localeDetection: false,
  localeCookie: false,
});
