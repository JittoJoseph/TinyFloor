import { getCountryCode } from "@/lib/country";
import { locales } from "@/lib/i18n/routing";

// Likely language(s) per country, limited to locales we ship. Only a hint for
// ordering the switcher, ranked below browser preferences, so a wrong guess
// never overrides what the browser explicitly asked for.
const COUNTRY_LANGS: Record<string, readonly string[]> = {
  DE: ["de"], AT: ["de"], CH: ["de", "fr", "it"], LI: ["de"],
  FR: ["fr"], BE: ["nl", "fr"], LU: ["fr", "de"], MC: ["fr"],
  ES: ["es"], MX: ["es"], AR: ["es"], CO: ["es"], CL: ["es"], PE: ["es"],
  IT: ["it"], SM: ["it"], VA: ["it"],
  NL: ["nl"],
  SE: ["sv"], DK: ["da"], NO: ["no"], FI: ["fi"],
  PT: ["pt"], BR: ["pt"], AO: ["pt"],
  PL: ["pl"],
  JP: ["ja"], KR: ["ko"],
  CN: ["zh"], TW: ["zh"], HK: ["zh"], MO: ["zh"], SG: ["zh"],
  RU: ["ru"], BY: ["ru"], KZ: ["ru"],
  IL: ["he"],
  SA: ["ar"], AE: ["ar"], EG: ["ar"], QA: ["ar"], KW: ["ar"],
  BH: ["ar"], OM: ["ar"], JO: ["ar"], MA: ["ar"], DZ: ["ar"], TN: ["ar"],
};

/**
 * Order the list so likely languages sit near the top: English first, then the
 * browser's preferred languages in order, then languages inferred from the
 * visitor's country, then everything else. Each language appears once.
 */
export function orderLocales(preferred: readonly string[], country: string | null) {
  const supported = new Map<string, (typeof locales)[number]>(
    locales.map((l) => [l.code, l]),
  );
  const seen = new Set<string>();
  const ordered: (typeof locales)[number][] = [];

  const push = (code: string) => {
    const entry = supported.get(code);
    if (entry && !seen.has(code)) {
      seen.add(code);
      ordered.push(entry);
    }
  };

  push("en");
  for (const tag of preferred) push(tag.toLowerCase().split("-")[0]);
  if (country) for (const code of COUNTRY_LANGS[country.toUpperCase()] ?? []) push(code);
  for (const l of locales) push(l.code);

  return ordered;
}

// Browser preference snapshot for useSyncExternalStore. Reading `navigator`
// during render would not match the server order on hydration, so the server
// snapshot is empty and the client value is cached once for a stable reference.
export type BrowserPrefs = { preferred: readonly string[]; country: string | null };

const SERVER_PREFS: BrowserPrefs = { preferred: [], country: null };
let cachedPrefs: BrowserPrefs | null = null;

export const subscribePrefs = () => () => {};

export function getBrowserPrefs(): BrowserPrefs {
  if (!cachedPrefs) {
    cachedPrefs = {
      preferred: navigator.languages ?? [navigator.language],
      country: getCountryCode(),
    };
  }
  return cachedPrefs;
}

export function getServerPrefs(): BrowserPrefs {
  return SERVER_PREFS;
}
