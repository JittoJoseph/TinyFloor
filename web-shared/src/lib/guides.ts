import type { LandingKey } from "@/lib/landings";

export type GuideKey =
  | "teamBuilding"
  | "meetingGames"
  | "remoteCulture"
  | "remoteCommunication"
  | "proximityChat"
  | "bestVirtualOffice"
  | "gatherPricing";

export interface Guide {
  slug: string;
  key: GuideKey;
  /** First published and last changed (YYYY-MM-DD): shown on the page and in its Article schema. */
  published: string;
  updated: string;
  /** Product pages the guide leads on to, after its own words. */
  pages: LandingKey[];
}

/** Guides for remote team leads (docs/18). Their words are in messages/guides/<locale>.json, keyed by `key` (lib/guide-copy). */
export const GUIDES: Guide[] = [
  { slug: "virtual-team-building-activities", key: "teamBuilding", published: "2026-10-04", updated: "2026-10-04", pages: ["watercooler", "whiteboard", "virtualOffice"] },
  { slug: "games-for-virtual-meetings", key: "meetingGames", published: "2026-10-04", updated: "2026-10-04", pages: ["meetingRoom", "whiteboard", "standup"] },
  { slug: "how-to-build-remote-team-culture", key: "remoteCulture", published: "2026-10-04", updated: "2026-10-04", pages: ["presence", "onboarding", "watercooler"] },
  { slug: "remote-team-communication", key: "remoteCommunication", published: "2026-10-04", updated: "2026-10-04", pages: ["teamChat", "presence", "slackHuddles"] },
  { slug: "what-is-proximity-chat", key: "proximityChat", published: "2026-10-04", updated: "2026-10-04", pages: ["proximityChat", "virtualOffice", "gather"] },
  // Buyers comparing products and prices (docs/20). Competitors' prices are checked against their own pages; bump `updated` when they are.
  { slug: "best-virtual-office-software", key: "bestVirtualOffice", published: "2026-10-07", updated: "2026-10-07", pages: ["virtualOffice", "gather", "kumospace"] },
  { slug: "gather-pricing", key: "gatherPricing", published: "2026-10-07", updated: "2026-10-07", pages: ["gather", "gatherVsKumospace", "virtualOffice"] },
];

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
    /** A comparison, like prices by team size: a header row, the rows, and where the numbers come from. */
    table?: { head: string[]; rows: string[][]; note?: string };
  }>;
  fit: { title: string; body: string };
  faq: Array<{ q: string; a: string }>;
}

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
  ].join(" ");
  const units = ["ja", "zh"].includes(locale) ? text.replace(/\s/g, "").length / 500 : text.split(/\s+/).length / 230;
  return Math.max(1, Math.round(units));
}
