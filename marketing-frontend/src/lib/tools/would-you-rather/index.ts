import type { Locale } from "@/lib/i18n/routing";
import type { IcebreakersContent } from "@/lib/tools/icebreakers";
import en from "./en";
import es from "./es";
import pt from "./pt";

/**
 * Would-you-rather and this-or-that questions for work (docs/search.md: over
 * 1,000 searches a month in the US, easy), in English, Portuguese and Spanish
 * (lib/tools/catalog). Same rules as the icebreakers: nothing private, both
 * options fine, nothing that assumes how someone lives.
 */
export const WOULD_YOU_RATHER_UPDATED = "2026-10-21";

const CONTENT: Partial<Record<Locale, IcebreakersContent>> = { en, pt, es };

export const wouldYouRatherIn = (locale: string): IcebreakersContent | undefined => CONTENT[locale as Locale];
