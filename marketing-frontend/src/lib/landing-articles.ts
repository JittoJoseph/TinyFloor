import { cache } from "react";
import type { GuideSection } from "@/lib/guides";
import type { LandingGroup, LandingKey } from "@/lib/landings";

/** Each page's own text, and under `hubs` the short text each index page carries below its list. */
type Articles = Partial<Record<LandingKey, GuideSection[]>> & { hubs?: Partial<Record<LandingGroup, GuideSection[]>> };

/**
 * A page written for a search can carry its own long text, read like a guide
 * (docs/search.md). It lives in messages/landing-articles/<locale>.json, not
 * the main message files, because those fall back to English key by key: an
 * untranslated article would otherwise appear in English under a translated
 * headline. A language without one keeps the page's short layout.
 */
const articles = cache(
  async (locale: string): Promise<Articles> => (await import(`../../messages/landing-articles/${locale}.json`)).default,
);

export const landingArticle = async (locale: string, key: LandingKey): Promise<GuideSection[] | undefined> =>
  (await articles(locale))[key];

export const hubArticle = async (locale: string, group: LandingGroup): Promise<GuideSection[] | undefined> =>
  (await articles(locale)).hubs?.[group];
