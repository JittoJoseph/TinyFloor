import type { GuideSection } from "@/lib/guides";
import de from "@/lib/tools/icebreaker-lists/de";
import en from "@/lib/tools/icebreaker-lists/en";
import es from "@/lib/tools/icebreaker-lists/es";
import fr from "@/lib/tools/icebreaker-lists/fr";
import it from "@/lib/tools/icebreaker-lists/it";
import ja from "@/lib/tools/icebreaker-lists/ja";
import pt from "@/lib/tools/icebreaker-lists/pt";

/**
 * Icebreaker questions for work (docs/search.md): a free tool for whoever runs
 * a remote team's meetings. Each language with its own list (lib/tools/icebreaker-lists)
 * is a page of its own; every other language's copy points search engines at
 * the English one (like the legal pages). Every question can be answered in a
 * sentence, and none asks about family, health, money, politics or religion,
 * or assumes someone travels or drinks.
 */
export const ICEBREAKERS_PATH = "/tools/icebreaker-questions";
export const ICEBREAKERS_UPDATED = "2026-10-16";

export interface IcebreakerGroup {
  key: string;
  label: string;
  /** The section's heading in the full list, and when to use this kind of question. */
  title: string;
  when: string;
  questions: string[];
}

export interface IcebreakersContent {
  groups: IcebreakerGroup[];
  meta: { title: string; description: string };
  eyebrow: string;
  /** The word before the date the list was last updated. */
  updated: string;
  title: string;
  intro: string;
  picker: { all: string; another: string; copy: string; copied: string; of: string };
  howTo: GuideSection[];
  rules: GuideSection[];
  fit: { title: string; body: string; cta: string };
  faqTitle: string;
  faq: Array<{ q: string; a: string }>;
}

const LISTS: Record<string, IcebreakersContent> = { en, pt, es, it, ja, de, fr };

/** The languages the tool is written in, English first. */
export const ICEBREAKER_LOCALES = Object.keys(LISTS);

/** The list in this language, if it has one of its own. */
export const icebreakersIn = (locale: string): IcebreakersContent | undefined => LISTS[locale];
