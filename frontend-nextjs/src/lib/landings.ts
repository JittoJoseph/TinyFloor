export type LandingKey =
  | "gather"
  | "kumospace"
  | "spatialchat"
  | "workadventure"
  | "wonder"
  | "virtualOffice"
  | "virtualCoworking"
  | "onlineStudyRoom"
  | "virtualClassroom"
  | "proximityChat";

export interface Landing {
  slug: string;
  key: LandingKey;
  group: "compare" | "useCases";
  /** Set on pages that carry a comparison table, as the product is spelled. */
  competitor?: string;
}

/** Pages written for what people search. Copy lives under `landings.pages.<key>`. */
export const LANDINGS: Landing[] = [
  { slug: "gather-alternative", key: "gather", group: "compare", competitor: "Gather" },
  { slug: "kumospace-alternative", key: "kumospace", group: "compare", competitor: "Kumospace" },
  { slug: "spatialchat-alternative", key: "spatialchat", group: "compare", competitor: "SpatialChat" },
  { slug: "workadventure-alternative", key: "workadventure", group: "compare", competitor: "WorkAdventure" },
  { slug: "wonder-alternative", key: "wonder", group: "compare" },
  { slug: "virtual-office", key: "virtualOffice", group: "useCases" },
  { slug: "virtual-coworking", key: "virtualCoworking", group: "useCases" },
  { slug: "online-study-room", key: "onlineStudyRoom", group: "useCases" },
  { slug: "virtual-classroom", key: "virtualClassroom", group: "useCases" },
  { slug: "proximity-chat", key: "proximityChat", group: "useCases" },
];

export const LANDING_GROUPS = ["compare", "useCases"] as const;

export const COMPARE_ROWS = ["price", "freePlan", "browser", "screenShare"] as const;

export const landingBySlug = (slug: string) =>
  LANDINGS.find((landing) => landing.slug === slug);
