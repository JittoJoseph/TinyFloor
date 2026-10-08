import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

/**
 * Per-request i18n config. Resolves the active locale, loads its messages and
 * deep-merges them over the English base, so a partly translated locale shows
 * the English string for a missing key instead of a blank.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const base = (await import("../../../messages/en.json")).default;
  const messages =
    locale === routing.defaultLocale
      ? base
      : deepMerge(base, (await import(`../../../messages/${locale}.json`)).default);

  return { locale, messages };
});

type Dict = { [key: string]: unknown };

/** Overlay `override` onto `base`, keeping `base` values for absent keys. */
function deepMerge(base: Dict, override: Dict): Dict {
  const out: Dict = { ...base };
  for (const key of Object.keys(override)) {
    const o = override[key];
    const b = out[key];
    out[key] = isDict(b) && isDict(o) ? deepMerge(b, o) : o;
  }
  return out;
}

function isDict(value: unknown): value is Dict {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
