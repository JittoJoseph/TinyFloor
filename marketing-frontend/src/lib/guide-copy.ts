import { cache } from "react";
import type { GuideCopy, GuideKey } from "@/lib/guides";
import en from "../../../web-shared/messages/guides/en.json";

/** Every guide in English, checked against GuideCopy here; the translations follow the same shape. */
const ENGLISH: Record<GuideKey, GuideCopy> = en;

/**
 * Every guide's words in one language (docs/18). They live in
 * messages/guides/<locale>.json rather than the main message files, so only
 * the guide pages, their social cards and llms.txt load them, and every other
 * page's messages stay small. A guide not yet translated reads in English.
 */
export const guideCopies = cache(async (locale: string): Promise<Record<GuideKey, GuideCopy>> => {
  if (locale === "en") return ENGLISH;
  const translated = (await import(`../../../web-shared/messages/guides/${locale}.json`)).default as Partial<Record<GuideKey, GuideCopy>>;
  return { ...ENGLISH, ...translated };
});

export const guideCopy = async (locale: string, key: GuideKey) => (await guideCopies(locale))[key];
