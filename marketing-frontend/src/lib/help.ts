import { cache } from "react";
import { localeCodes, type Locale } from "web-shared/lib/i18n/routing";
import en from "../../messages/help/en.json";
import { HELP_PAGES, type HelpPlace, type HelpTopic } from "@/lib/help-pages";

export type { HelpTopic };

/**
 * Answers to the questions people ask about TinyFloor itself, one page each:
 * an assistant asked "is TinyFloor free?" or "does TinyFloor record calls?"
 * finds the page whose title is the question, and quotes its first line
 * (docs/search.md). The answer comes first, in a sentence or two; the details
 * follow. The order, topics and links between questions are here; the words
 * are in messages/help/<locale>.json, written for each language. Every answer
 * is the product's as it is: keep them in step with the pricing page,
 * lib/facts.ts and the app. Links are written `[words](/path)`.
 */

export const HELP_PATH = "/help";
/** The day these answers were last checked (YYYY-MM-DD). */
export const HELP_UPDATED = "2026-11-28";

const TOPICS: HelpTopic[] = ["plans", "start", "calls", "privacy"];

/** One question's words. */
export interface HelpAnswer {
  /** The question, as people ask it: the page's title. */
  q: string;
  /** The answer in a sentence or two, first on the page and in its FAQ markup. */
  answer: string;
  paragraphs?: string[];
  items?: string[];
}

export interface HelpCopy {
  title: string;
  description: string;
  intro: string;
  topics: Record<HelpTopic, string>;
  details: string;
  related: string;
  all: string;
  articles: Record<string, HelpAnswer>;
}

export interface HelpArticle extends HelpAnswer, HelpPlace {}


/** The help center in English, for llms.txt and as the fallback. */
export const HELP_EN: HelpCopy = en;
export const HELP_TITLE = HELP_EN.title;
export const HELP_DESCRIPTION = HELP_EN.description;
export const HELP_INTRO = HELP_EN.intro;
export const HELP_TOPICS = HELP_EN.topics;
export const HELP_TOPIC_ORDER = TOPICS;

/** The languages the help center is written in; anywhere else the English shows, marked as English. */
export const HELP_LOCALES: readonly Locale[] = localeCodes;

const articlesIn = (copy: HelpCopy): HelpArticle[] => HELP_PAGES.map((one) => ({ ...one, ...copy.articles[one.slug] }));

/** Every question in English, in order. */
export const HELP: HelpArticle[] = articlesIn(HELP_EN);

export const helpCopy = cache(async (locale: string): Promise<HelpCopy> => {
  if (locale === "en" || !HELP_LOCALES.includes(locale as Locale)) return HELP_EN;
  return (await import(`../../messages/help/${locale}.json`)).default as HelpCopy;
});

/** Every question in a language, in order. */
export const helpIn = async (locale: string) => articlesIn(await helpCopy(locale));

export const helpPath = (article: Pick<HelpArticle, "slug">) => `${HELP_PATH}/${article.slug}`;
export const helpBySlug = (slug: string) => HELP_PAGES.find((article) => article.slug === slug);
