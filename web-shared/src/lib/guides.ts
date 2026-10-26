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
  | "bodyDoubling"
  | "teamMeetingAgenda"
  | "discordVsSlack"
  | "checkInQuestions"
  | "thisOrThat"
  | "meetingMinutes"
  | "questionOfTheDay";

export interface Guide {
  slug: string;
  key: GuideKey;
  /** First published and last changed (YYYY-MM-DD): shown on the page and in its Article schema. */
  published: string;
  updated: string;
  /** Product pages the guide leads on to, after its own words; each of them lists the guide in turn. */
  pages: LandingKey[];
  /** The guides to read next, closest first; the ones after it in the list fill the rest. */
  related: GuideKey[];
  /**
   * The languages it's written in, when it isn't in all of them: a guide starts
   * where our readers are (docs/search.md) and is added to more languages
   * later. Anywhere else it's not found, and nothing links there (lib/tools/catalog).
   */
  locales?: readonly Locale[];
}

/** Guides for remote team leads (docs/search.md). Their words are in messages/guides/<locale>.json, keyed by `key` (lib/guide-copy). */
export const GUIDES: Guide[] = [
  { slug: "virtual-team-building-activities", key: "teamBuilding", published: "2026-10-04", updated: "2026-10-25", pages: ["watercooler", "whiteboard", "virtualOffice"], related: ["meetingGames", "happyHour", "remoteCulture"] },
  { slug: "games-for-virtual-meetings", key: "meetingGames", published: "2026-10-04", updated: "2026-10-25", pages: ["meetingRoom", "whiteboard", "standup"], related: ["teamBuilding", "happyHour", "retro"] },
  { slug: "virtual-happy-hour-ideas", key: "happyHour", published: "2026-10-24", updated: "2026-10-24", pages: ["watercooler", "proximityChat", "virtualOffice"], related: ["teamBuilding", "meetingGames", "remoteCulture"] },
  { slug: "how-to-build-remote-team-culture", key: "remoteCulture", published: "2026-10-04", updated: "2026-10-25", pages: ["presence", "onboarding", "watercooler"], related: ["manageRemote", "remoteCommunication", "onboardingChecklist"] },
  { slug: "remote-team-communication", key: "remoteCommunication", published: "2026-10-04", updated: "2026-10-24", pages: ["teamChat", "presence", "slackHuddles"], related: ["async", "remoteTools", "manageRemote"] },
  { slug: "async-communication", key: "async", published: "2026-10-24", updated: "2026-10-24", pages: ["teamChat", "presence", "standup"], related: ["remoteCommunication", "remoteTools", "manageRemote"] },
  { slug: "remote-work-tools", key: "remoteTools", published: "2026-10-24", updated: "2026-10-24", pages: ["virtualOffice", "teamChat", "presence"], related: ["bestVirtualOffice", "remoteCommunication", "async"] },
  { slug: "how-to-manage-a-remote-team", key: "manageRemote", published: "2026-10-24", updated: "2026-10-24", pages: ["presence", "standup", "onboarding"], related: ["oneOnOne", "remoteCulture", "async"] },
  { slug: "one-on-one-meeting-questions", key: "oneOnOne", published: "2026-10-24", updated: "2026-10-25", pages: ["meetingRoom", "presence", "onboarding"], related: ["manageRemote", "retro", "onboardingChecklist"] },
  { slug: "retrospective-ideas", key: "retro", published: "2026-10-24", updated: "2026-10-25", pages: ["whiteboard", "meetingRoom", "engineering"], related: ["meetingGames", "oneOnOne", "manageRemote"] },
  { slug: "remote-onboarding-checklist", key: "onboardingChecklist", published: "2026-10-24", updated: "2026-10-25", pages: ["onboarding", "presence", "virtualOffice"], related: ["remoteCulture", "manageRemote", "oneOnOne"] },
  { slug: "body-doubling", key: "bodyDoubling", published: "2026-10-24", updated: "2026-10-25", pages: ["virtualCoworking", "presence", "virtualOffice"], related: ["remoteCulture", "remoteTools", "bestVirtualOffice"] },
  { slug: "team-meeting-agenda", key: "teamMeetingAgenda", published: "2026-10-25", updated: "2026-10-25", pages: ["meetingRoom", "standup", "teamChat"], related: ["checkInQuestions", "oneOnOne", "meetingGames"] },
  { slug: "check-in-questions", key: "checkInQuestions", published: "2026-10-25", updated: "2026-10-25", pages: ["meetingRoom", "standup", "watercooler"], related: ["teamMeetingAgenda", "meetingGames", "oneOnOne"] },
  { slug: "meeting-minutes-template", key: "meetingMinutes", published: "2026-10-25", updated: "2026-10-25", pages: ["meetingRoom", "teamChat", "standup"], related: ["teamMeetingAgenda", "oneOnOne", "retro"] },
  { slug: "question-of-the-day-for-work", key: "questionOfTheDay", published: "2026-10-26", updated: "2026-10-26", pages: ["teamChat", "standup", "watercooler"], related: ["thisOrThat", "checkInQuestions", "meetingGames"] },
  { slug: "this-or-that-questions", key: "thisOrThat", published: "2026-10-25", updated: "2026-10-25", pages: ["meetingRoom", "watercooler", "standup"], related: ["checkInQuestions", "meetingGames", "teamBuilding"] },
  { slug: "discord-vs-slack", key: "discordVsSlack", published: "2026-10-25", updated: "2026-10-25", pages: ["discord", "slackHuddles", "virtualOffice"], related: ["remoteCommunication", "remoteTools", "async"] },
  { slug: "what-is-proximity-chat", key: "proximityChat", published: "2026-10-04", updated: "2026-10-26", pages: ["proximityChat", "virtualOffice", "gather"], related: ["bestVirtualOffice", "gatherPricing", "remoteTools"] },
  // Buyers comparing products and prices (docs/search.md). Competitors' prices are checked against their own pages; bump `updated` when they are.
  { slug: "best-virtual-office-software", key: "bestVirtualOffice", published: "2026-10-07", updated: "2026-10-25", pages: ["virtualOffice", "gather", "kumospace"], related: ["gatherPricing", "remoteTools", "proximityChat"] },
  { slug: "gather-pricing", key: "gatherPricing", published: "2026-10-07", updated: "2026-10-25", pages: ["gather", "gatherVsKumospace", "virtualOffice"], related: ["bestVirtualOffice", "proximityChat", "remoteTools"] },
];

/** The languages a guide is written in. */
export const guideLocales = (guide: Guide): readonly Locale[] => guide.locales ?? localeCodes;

/** The guides written in this language, in the order they're listed. */
export const guidesIn = (locale: string) => GUIDES.filter((guide) => guideLocales(guide).includes(locale as Locale));

/** The guides' index, and the folder every guide sits in. */
export const GUIDES_PATH = "/guides";

export const guidePath = (guide: Guide) => `${GUIDES_PATH}/${guide.slug}`;

export const guideBySlug = (slug: string) => GUIDES.find((guide) => guide.slug === slug);

/** The guides to read after this one: its `related` first, then the ones after it, round the list. */
export function guidesAfter(guide: Guide, locale: string, count: number): Guide[] {
  const list = guidesIn(locale);
  const at = list.findIndex((one) => one.key === guide.key);
  const after = list.map((_, index) => list[(at + 1 + index) % list.length]);
  const picked = [...guide.related.map((key) => list.find((one) => one.key === key)), ...after];
  return [...new Set(picked)].filter((one): one is Guide => !!one && one.key !== guide.key).slice(0, count);
}

/** The guides that lead on to a product page, for the page to list in turn; comparisons also get the software comparison. */
export function guidesFor(key: LandingKey, compare: boolean, locale: string): Guide[] {
  return guidesIn(locale).filter((guide) => guide.pages.includes(key) || (compare && guide.key === "bestVirtualOffice"));
}

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
    /** Short items without a body, like a list of questions: compact numbered rows, two to a line on wide screens. */
    list?: boolean;
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
