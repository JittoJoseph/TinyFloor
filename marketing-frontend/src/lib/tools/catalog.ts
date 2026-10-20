import { localeCodes, type Locale } from "@/lib/i18n/routing";

/**
 * Every free tool (docs/search.md), and the languages it's written in. The
 * first three are in all eighteen; the newer ones only where they're written
 * properly, English, Portuguese and Spanish (where most visitors come from),
 * rather than eighteen thin copies. A page asked for in another language is
 * not found, and nothing links there: not the sitemap, the language versions
 * in its head, or the language menu.
 */
export const TOOLS_PATH = "/tools";

// The paths only, so the middleware can import this without every tool's words.
// (lib/tools/icebreakers, office-costs and time-zones export the same three.)
const ICEBREAKERS_PATH = "/tools/icebreaker-questions";
const OFFICE_COSTS_PATH = "/tools/virtual-office-cost-calculator";
const TIME_ZONES_PATH = "/tools/time-zone-meeting-planner";

export const WOULD_YOU_RATHER_PATH = "/tools/would-you-rather-questions";
export const TWO_TRUTHS_PATH = "/tools/two-truths-and-a-lie";
export const STANDUP_PATH = "/tools/daily-standup-template";
export const OUT_OF_OFFICE_PATH = "/tools/out-of-office-message";

/** The languages the newer tools are written in. */
export const FEW: readonly Locale[] = ["en", "pt", "es"];

export interface ToolEntry {
  path: string;
  locales: readonly Locale[];
}

/** In the order the index lists them: the ones a team lead reaches for most first. */
export const TOOLS: ToolEntry[] = [
  { path: STANDUP_PATH, locales: FEW },
  { path: ICEBREAKERS_PATH, locales: localeCodes },
  { path: WOULD_YOU_RATHER_PATH, locales: FEW },
  { path: TWO_TRUTHS_PATH, locales: FEW },
  { path: TIME_ZONES_PATH, locales: localeCodes },
  { path: OUT_OF_OFFICE_PATH, locales: FEW },
  { path: OFFICE_COSTS_PATH, locales: localeCodes },
];

/** The tools written in this language. */
export const toolsIn = (locale: string) => TOOLS.filter((tool) => tool.locales.includes(locale as Locale));

/**
 * The languages a page exists in: a tool's own, or every language for any
 * other page.
 */
export function pageLocales(path: string): readonly Locale[] {
  return TOOLS.find((tool) => tool.path === path)?.locales ?? localeCodes;
}

/** Whether this page is written in this language. */
export const hasPage = (path: string, locale: string) => pageLocales(path).includes(locale as Locale);
