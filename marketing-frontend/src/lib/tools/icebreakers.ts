import type { GuideSection } from "@/lib/guides";
import type { Locale } from "@/lib/i18n/routing";
import ar from "@/lib/tools/icebreaker-lists/ar";
import da from "@/lib/tools/icebreaker-lists/da";
import de from "@/lib/tools/icebreaker-lists/de";
import en from "@/lib/tools/icebreaker-lists/en";
import es from "@/lib/tools/icebreaker-lists/es";
import fi from "@/lib/tools/icebreaker-lists/fi";
import fr from "@/lib/tools/icebreaker-lists/fr";
import he from "@/lib/tools/icebreaker-lists/he";
import it from "@/lib/tools/icebreaker-lists/it";
import ja from "@/lib/tools/icebreaker-lists/ja";
import ko from "@/lib/tools/icebreaker-lists/ko";
import nl from "@/lib/tools/icebreaker-lists/nl";
import no from "@/lib/tools/icebreaker-lists/no";
import pl from "@/lib/tools/icebreaker-lists/pl";
import pt from "@/lib/tools/icebreaker-lists/pt";
import ru from "@/lib/tools/icebreaker-lists/ru";
import sv from "@/lib/tools/icebreaker-lists/sv";
import zh from "@/lib/tools/icebreaker-lists/zh";

/**
 * Icebreaker questions for work (docs/search.md): a free tool for whoever runs
 * a remote team's meetings, written in every language (lib/tools/icebreaker-lists,
 * adapted rather than translated word for word). Every question can be answered in a
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

const LISTS: Record<Locale, IcebreakersContent> = { en, pt, es, it, ja, de, fr, nl, pl, sv, da, no, fi, ru, ko, zh, he, ar };

export const icebreakersIn = (locale: Locale): IcebreakersContent => LISTS[locale];
