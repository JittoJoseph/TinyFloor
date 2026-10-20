import type { Locale } from "@/lib/i18n/routing";
import type { IcebreakersContent } from "@/lib/tools/icebreakers";
import en from "./en";
import es from "./es";
import pt from "./pt";

/**
 * Team building questions for work (docs/search.md: over 1,000 searches a
 * month in the US, easy), in English, Portuguese and Spanish
 * (lib/tools/catalog). Longer than the icebreakers: each says something about
 * how the team works. Same rules: nothing private, anyone can answer.
 */
export const TEAM_BUILDING_UPDATED = "2026-10-20";

const CONTENT: Partial<Record<Locale, IcebreakersContent>> = { en, pt, es };

export const teamBuildingIn = (locale: string): IcebreakersContent | undefined => CONTENT[locale as Locale];
