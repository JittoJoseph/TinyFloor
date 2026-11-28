import { cache } from "react";
import { localeCodes, type Locale } from "web-shared/lib/i18n/routing";
import type { HowItWorksSection } from "@/lib/how-it-works";
import en from "../../messages/facts/en.json";

/**
 * The facts about TinyFloor in one place, for anyone writing about it and for
 * the AI assistants that answer questions about it: what it is, who makes it,
 * what it costs, what's in it and what isn't. Assistants quote a page that
 * states a fact plainly and is dated (docs/search.md), so every line is one
 * fact, and the page says it's the reference. The words are in
 * messages/facts/<locale>.json; keep them in step with the pricing page,
 * lib/plans.ts and lib/how-it-works.ts (the release counts are written out, so
 * update them with How it works). Links are written `[words](/path)`.
 */

export const FACTS_PATH = "/facts";
/** The day these facts were last checked (YYYY-MM-DD). */
export const FACTS_UPDATED = "2026-11-28";

export interface FactsCopy {
  title: string;
  description: string;
  intro: string;
  sections: HowItWorksSection[];
}

/** The facts in English, for llms.txt and as the fallback. */
export const FACTS_EN: FactsCopy = en;
export const FACTS_TITLE = FACTS_EN.title;
export const FACTS_DESCRIPTION = FACTS_EN.description;
export const FACTS_INTRO = FACTS_EN.intro;
export const FACTS = FACTS_EN.sections;

/** The languages the facts are written in; anywhere else the English shows, marked as English. */
export const FACTS_LOCALES: readonly Locale[] = localeCodes;

export const factsCopy = cache(async (locale: string): Promise<FactsCopy> => {
  if (locale === "en" || !FACTS_LOCALES.includes(locale as Locale)) return FACTS_EN;
  return (await import(`../../messages/facts/${locale}.json`)).default as FactsCopy;
});
