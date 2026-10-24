import type { LandingKey } from "@/lib/landings";
import { localeCodes, type Locale } from "@/lib/i18n/routing";

export type GuideKey =
  | "teamBuilding"
  | "meetingGames"
  | "remoteCulture"
  | "remoteCommunication"
  | "proximityChat"
  | "bestVirtualOffice"
  | "gatherPricing"
  | "remoteTools"
  | "manageRemote"
  | "happyHour"
  | "oneOnOne"
  | "async"
  | "retro"
  | "onboardingChecklist"
  | "bodyDoubling";

export interface Guide {
  slug: string;
  key: GuideKey;
  /** First published and last changed (YYYY-MM-DD): shown on the page and in its Article schema. */
  published: string;
  updated: string;
  /** Product pages the guide leads on to, after its own words. */
  pages: LandingKey[];
  /**
   * The languages it's written in, when it isn't in all of them: a guide starts
   * where our readers are (docs/search.md) and is added to more languages
   * later. Anywhere else it's not found, and nothing links there (lib/tools/catalog).
   */
  locales?: readonly Locale[];
}

/** Guides for remote team leads (docs/search.md). Their words are in messages/guides/<locale>.json, keyed by `key` (lib/guide-copy). */
export const GUIDES: Guide[] = [
  { slug: "virtual-team-building-activities", key: "teamBuilding", published: "2026-10-04", updated: "2026-10-24", pages: ["watercooler", "whiteboard", "virtualOffice"] },
  { slug: "games-for-virtual-meetings", key: "meetingGames", published: "2026-10-04", updated: "2026-10-04", pages: ["meetingRoom", "whiteboard", "standup"] },
  { slug: "virtual-happy-hour-ideas", key: "happyHour", published: "2026-10-24", updated: "2026-10-24", pages: ["watercooler", "proximityChat", "virtualOffice"] },
  { slug: "how-to-build-remote-team-culture", key: "remoteCulture", published: "2026-10-04", updated: "2026-10-24", pages: ["presence", "onboarding", "watercooler"] },
  { slug: "remote-team-communication", key: "remoteCommunication", published: "2026-10-04", updated: "2026-10-24", pages: ["teamChat", "presence", "slackHuddles"] },
  { slug: "async-communication", key: "async", published: "2026-10-24", updated: "2026-10-24", pages: ["teamChat", "presence", "standup"] },
  { slug: "remote-work-tools", key: "remoteTools", published: "2026-10-24", updated: "2026-10-24", pages: ["virtualOffice", "teamChat", "presence"] },
  { slug: "how-to-manage-a-remote-team", key: "manageRemote", published: "2026-10-24", updated: "2026-10-24", pages: ["presence", "standup", "onboarding"] },
  { slug: "one-on-one-meeting-questions", key: "oneOnOne", published: "2026-10-24", updated: "2026-10-24", pages: ["meetingRoom", "presence", "onboarding"] },
  { slug: "retrospective-ideas", key: "retro", published: "2026-10-24", updated: "2026-10-24", pages: ["whiteboard", "meetingRoom", "engineering"] },
  { slug: "remote-onboarding-checklist", key: "onboardingChecklist", published: "2026-10-24", updated: "2026-10-24", pages: ["onboarding", "presence", "virtualOffice"] },
  { slug: "body-doubling", key: "bodyDoubling", published: "2026-10-24", updated: "2026-10-24", pages: ["virtualCoworking", "presence", "virtualOffice"] },
  { slug: "what-is-proximity-chat", key: "proximityChat", published: "2026-10-04", updated: "2026-10-04", pages: ["proximityChat", "virtualOffice", "gather"] },
  // Buyers comparing products and prices (docs/search.md). Competitors' prices are checked against their own pages; bump `updated` when they are.
  { slug: "best-virtual-office-software", key: "bestVirtualOffice", published: "2026-10-07", updated: "2026-10-24", pages: ["virtualOffice", "gather", "kumospace"] },
  { slug: "gather-pricing", key: "gatherPricing", published: "2026-10-07", updated: "2026-10-16", pages: ["gather", "gatherVsKumospace", "virtualOffice"] },
];

/** The languages a guide is written in. */
export const guideLocales = (guide: Guide): readonly Locale[] => guide.locales ?? localeCodes;

/** The guides written in this language, in the order they're listed. */
export const guidesIn = (locale: string) => GUIDES.filter((guide) => guideLocales(guide).includes(locale as Locale));

/** The guides' index, and the folder every guide sits in. */
export const GUIDES_PATH = "/guides";

export const guidePath = (guide: Guide) => `${GUIDES_PATH}/${guide.slug}`;

export const guideBySlug = (slug: string) => GUIDES.find((guide) => guide.slug === slug);

/** A guide's copy, as messages/guides/<locale>.json holds it. */
export interface GuideCopy {
  label: string;
  meta: { title: string; description: string };
  title: string;
  intro: string;
  sections: Array<{
    title: string;
    body?: string[];
    items?: Array<{ title: string; detail?: string; body: string }>;
    /** Number these items on with the rest, as items with a detail line are: questions, checklist steps. */
    numbered?: boolean;
    /** A comparison, like prices by team size: a header row, the rows, and where the numbers come from. */
    table?: { head: string[]; rows: string[][]; note?: string };
  }>;
  fit: { title: string; body: string };
  faq: Array<{ q: string; a: string }>;
}

/** One section of long text: a guide's, or a page written for a search that has its own (LandingPage). */
export type GuideSection = GuideCopy["sections"][number];

/** Minutes to read: about 230 words a minute, or 500 characters for languages written without spaces. */
export function readingMinutes(copy: GuideCopy, locale: string): number {
  const text = [
    copy.intro,
    ...copy.sections.flatMap((section) => [
      section.title,
      ...(section.body ?? []),
      ...(section.items ?? []).flatMap((item) => [item.title, item.body]),
      ...(section.table?.rows.flat() ?? []),
    ]),
    copy.fit.body,
    ...copy.faq.flatMap(({ q, a }) => [q, a]),
  ]
    .join(" ")
    .replace(/\]\(\/[^)]*\)/g, "]");
  const units = ["ja", "zh"].includes(locale) ? text.replace(/\s/g, "").length / 500 : text.split(/\s+/).length / 230;
  return Math.max(1, Math.round(units));
}
