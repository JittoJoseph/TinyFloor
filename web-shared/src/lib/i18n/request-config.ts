import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

type Dict = { [key: string]: unknown };

/**
 * Per-request i18n config for one site. Its messages are the ones both sites
 * use (web-shared/messages) and its own (`own`: the app's or the marketing
 * site's messages/<locale>.json), so each worker carries only what its pages
 * say. Each locale is deep-merged over English, so a partly translated locale
 * shows the English string for a missing key instead of a blank.
 */
export function siteRequestConfig(own: (locale: string) => Promise<Dict>) {
  return getRequestConfig(async ({ requestLocale }) => {
    const requested = await requestLocale;
    const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
    const messagesFor = async (code: string): Promise<Dict> => ({
      ...((await import(`../../../messages/${code}.json`)).default as Dict),
      ...(await own(code)),
    });

    const base = await messagesFor(routing.defaultLocale);
    const messages = locale === routing.defaultLocale ? base : deepMerge(base, await messagesFor(locale));
    return { locale, messages };
  });
}

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
