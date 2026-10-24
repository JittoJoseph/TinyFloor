export type LandingKey =
  | "gather"
  | "kumospace"
  | "spatialchat"
  | "sowork"
  | "spot"
  | "zep"
  | "workadventure"
  | "wonder"
  | "sococo"
  | "ovice"
  | "teamflow"
  | "roam"
  | "slackHuddles"
  | "discord"
  | "gatherVsKumospace"
  | "zepVsGather"
  | "virtualOffice"
  | "virtualCoworking"
  | "proximityChat"
  | "meetingRoom"
  | "teamChat"
  | "presence"
  | "whiteboard"
  | "pairProgramming"
  | "standup"
  | "onboarding"
  | "watercooler"
  | "engineering"
  | "design"
  | "startups"
  | "agencies"
  | "hybrid";

export type LandingGroup = "features" | "teams" | "useCases" | "compare";

export interface Landing {
  slug: string;
  key: LandingKey;
  group: LandingGroup;
  /** Set on pages that carry a comparison table, as the product is spelled. */
  competitor?: string;
  /** The other product's name on a compare page without a table, for menu labels. */
  product?: string;
  /** "X vs Y" pages: the two products set beside TinyFloor, by the keys of their own alternative pages. */
  versus?: [LandingKey, LandingKey];
  /** When the other products' details were last checked against their own sites (YYYY-MM). */
  checked?: string;
  /** The pages in its own group to link first, closest first; otherwise the ones after it in the list. */
  related?: LandingKey[];
}

/** Pages written for what people search (docs/search.md). Copy lives under `landings.pages.<key>`. */
export const LANDINGS: Landing[] = [
  { slug: "gather-alternative", key: "gather", group: "compare", competitor: "Gather", checked: "2026-10", related: ["gatherVsKumospace", "zepVsGather", "kumospace"] },
  { slug: "kumospace-alternative", key: "kumospace", group: "compare", competitor: "Kumospace", checked: "2026-10", related: ["gatherVsKumospace", "gather", "sowork"] },
  { slug: "sococo-alternative", key: "sococo", group: "compare", competitor: "Sococo", checked: "2026-10", related: ["ovice", "roam", "gather"] },
  { slug: "ovice-alternative", key: "ovice", group: "compare", competitor: "oVice", checked: "2026-10", related: ["zep", "sococo", "gather"] },
  { slug: "roam-alternative", key: "roam", group: "compare", competitor: "Roam", checked: "2026-10", related: ["teamflow", "sococo", "gather"] },
  { slug: "teamflow-alternative", key: "teamflow", group: "compare", competitor: "Teamflow", checked: "2026-10", related: ["roam", "gather", "spatialchat"] },
  { slug: "spatialchat-alternative", key: "spatialchat", group: "compare", competitor: "SpatialChat", checked: "2026-10", related: ["kumospace", "workadventure", "gather"] },
  { slug: "sowork-alternative", key: "sowork", group: "compare", competitor: "SoWork", checked: "2026-10", related: ["spot", "gather", "kumospace"] },
  { slug: "spot-alternative", key: "spot", group: "compare", competitor: "Spot", checked: "2026-10", related: ["sowork", "gather", "kumospace"] },
  { slug: "zep-alternative", key: "zep", group: "compare", competitor: "ZEP", checked: "2026-10", related: ["zepVsGather", "gather", "ovice"] },
  { slug: "workadventure-alternative", key: "workadventure", group: "compare", competitor: "WorkAdventure", checked: "2026-10", related: ["gather", "spatialchat", "zep"] },
  { slug: "wonder-alternative", key: "wonder", group: "compare", product: "Wonder", related: ["spatialchat", "kumospace", "gather"] },
  { slug: "slack-huddles-alternative", key: "slackHuddles", group: "compare", competitor: "Slack huddles", checked: "2026-10", related: ["discord", "roam", "gather"] },
  { slug: "discord-for-work", key: "discord", group: "compare", competitor: "Discord", checked: "2026-10", related: ["slackHuddles", "workadventure", "gather"] },
  { slug: "gather-vs-kumospace", key: "gatherVsKumospace", group: "compare", versus: ["gather", "kumospace"], checked: "2026-10", related: ["gather", "kumospace", "zepVsGather"] },
  { slug: "zep-vs-gather", key: "zepVsGather", group: "compare", versus: ["zep", "gather"], checked: "2026-10", related: ["zep", "gather", "gatherVsKumospace"] },
  { slug: "proximity-chat", key: "proximityChat", group: "features" },
  { slug: "virtual-meeting-room", key: "meetingRoom", group: "features" },
  { slug: "team-chat", key: "teamChat", group: "features" },
  { slug: "team-presence", key: "presence", group: "features" },
  { slug: "online-whiteboard", key: "whiteboard", group: "features" },
  { slug: "engineering-teams", key: "engineering", group: "teams" },
  { slug: "design-teams", key: "design", group: "teams" },
  { slug: "startups", key: "startups", group: "teams" },
  { slug: "agencies", key: "agencies", group: "teams" },
  { slug: "hybrid-teams", key: "hybrid", group: "teams" },
  { slug: "virtual-office", key: "virtualOffice", group: "useCases" },
  { slug: "virtual-standup", key: "standup", group: "useCases" },
  { slug: "remote-pair-programming", key: "pairProgramming", group: "useCases" },
  { slug: "remote-onboarding", key: "onboarding", group: "useCases" },
  { slug: "virtual-watercooler", key: "watercooler", group: "useCases" },
  { slug: "virtual-coworking", key: "virtualCoworking", group: "useCases" },
];

export const LANDING_GROUPS = ["features", "teams", "useCases", "compare"] as const;

/** Each group's index page, which lists every page in it. */
export const HUBS: Record<LandingGroup, string> = { features: "features", teams: "teams", useCases: "use-cases", compare: "compare" };

export const COMPARE_ROWS = ["price", "freePlan", "browser", "screenShare"] as const;

export const landingBySlug = (slug: string) =>
  LANDINGS.find((landing) => landing.slug === slug);

export const landingByKey = (key: LandingKey) =>
  LANDINGS.find((landing) => landing.key === key)!;

/** Pages in the same group to link from this one: its `related` first, then the ones after it, round the list. */
export function relatedLandings(page: Landing, count: number): Landing[] {
  const group = LANDINGS.filter((other) => other.group === page.group);
  const at = group.findIndex((other) => other.key === page.key);
  const after = group.map((_, index) => group[(at + 1 + index) % group.length]);
  const picked = [...(page.related ?? []).map(landingByKey), ...after].filter((other) => other.key !== page.key);
  return [...new Set(picked)].slice(0, count);
}
