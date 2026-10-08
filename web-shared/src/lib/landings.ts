export type LandingKey =
  | "gather"
  | "kumospace"
  | "spatialchat"
  | "workadventure"
  | "wonder"
  | "sococo"
  | "ovice"
  | "teamflow"
  | "roam"
  | "slackHuddles"
  | "discord"
  | "gatherVsKumospace"
  | "virtualOffice"
  | "virtualCoworking"
  | "virtualClassroom"
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
  | "agencies";

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
}

/** Pages written for what people search (docs/16). Copy lives under `landings.pages.<key>`. */
export const LANDINGS: Landing[] = [
  { slug: "gather-alternative", key: "gather", group: "compare", competitor: "Gather" },
  { slug: "kumospace-alternative", key: "kumospace", group: "compare", competitor: "Kumospace" },
  { slug: "sococo-alternative", key: "sococo", group: "compare", competitor: "Sococo", checked: "2026-10" },
  { slug: "ovice-alternative", key: "ovice", group: "compare", competitor: "oVice", checked: "2026-10" },
  { slug: "roam-alternative", key: "roam", group: "compare", competitor: "Roam", checked: "2026-10" },
  { slug: "teamflow-alternative", key: "teamflow", group: "compare", competitor: "Teamflow", checked: "2026-10" },
  { slug: "spatialchat-alternative", key: "spatialchat", group: "compare", competitor: "SpatialChat" },
  { slug: "workadventure-alternative", key: "workadventure", group: "compare", competitor: "WorkAdventure" },
  { slug: "wonder-alternative", key: "wonder", group: "compare", product: "Wonder" },
  { slug: "slack-huddles-alternative", key: "slackHuddles", group: "compare", competitor: "Slack huddles", checked: "2026-10" },
  { slug: "discord-for-work", key: "discord", group: "compare", competitor: "Discord", checked: "2026-10" },
  { slug: "gather-vs-kumospace", key: "gatherVsKumospace", group: "compare", versus: ["gather", "kumospace"], checked: "2026-09" },
  { slug: "proximity-chat", key: "proximityChat", group: "features" },
  { slug: "virtual-meeting-room", key: "meetingRoom", group: "features" },
  { slug: "team-chat", key: "teamChat", group: "features" },
  { slug: "team-presence", key: "presence", group: "features" },
  { slug: "online-whiteboard", key: "whiteboard", group: "features" },
  { slug: "engineering-teams", key: "engineering", group: "teams" },
  { slug: "design-teams", key: "design", group: "teams" },
  { slug: "startups", key: "startups", group: "teams" },
  { slug: "agencies", key: "agencies", group: "teams" },
  { slug: "virtual-office", key: "virtualOffice", group: "useCases" },
  { slug: "virtual-standup", key: "standup", group: "useCases" },
  { slug: "remote-pair-programming", key: "pairProgramming", group: "useCases" },
  { slug: "remote-onboarding", key: "onboarding", group: "useCases" },
  { slug: "virtual-watercooler", key: "watercooler", group: "useCases" },
  { slug: "virtual-coworking", key: "virtualCoworking", group: "useCases" },
  { slug: "virtual-classroom", key: "virtualClassroom", group: "useCases" },
];

export const LANDING_GROUPS = ["features", "teams", "useCases", "compare"] as const;

/** Each group's index page, which lists every page in it. */
export const HUBS: Record<LandingGroup, string> = { features: "features", teams: "teams", useCases: "use-cases", compare: "compare" };

export const COMPARE_ROWS = ["price", "freePlan", "browser", "screenShare"] as const;

export const landingBySlug = (slug: string) =>
  LANDINGS.find((landing) => landing.slug === slug);

export const landingByKey = (key: LandingKey) =>
  LANDINGS.find((landing) => landing.key === key)!;
