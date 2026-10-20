import type { Locale } from "@/lib/i18n/routing";
import type { IcebreakersContent } from "@/lib/tools/icebreakers";
import en from "./en";
import es from "./es";
import pt from "./pt";

/**
 * Two truths and a lie ideas (docs/search.md: over 1,000 searches a month in
 * the US, easy), in English, Portuguese and Spanish (lib/tools/catalog). Each
 * could be true for someone; none asks anything private or assumes much money
 * or travel.
 */
export const TWO_TRUTHS_UPDATED = "2026-10-20";

const CONTENT: Partial<Record<Locale, IcebreakersContent>> = { en, pt, es };

export const twoTruthsIn = (locale: string): IcebreakersContent | undefined => CONTENT[locale as Locale];
