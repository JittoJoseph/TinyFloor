import type { GuideSection } from "@/lib/guides";
import type { Locale } from "@/lib/i18n/routing";
import ar from "@/lib/tools/office-cost-copy/ar";
import da from "@/lib/tools/office-cost-copy/da";
import de from "@/lib/tools/office-cost-copy/de";
import en from "@/lib/tools/office-cost-copy/en";
import es from "@/lib/tools/office-cost-copy/es";
import fi from "@/lib/tools/office-cost-copy/fi";
import fr from "@/lib/tools/office-cost-copy/fr";
import he from "@/lib/tools/office-cost-copy/he";
import it from "@/lib/tools/office-cost-copy/it";
import ja from "@/lib/tools/office-cost-copy/ja";
import ko from "@/lib/tools/office-cost-copy/ko";
import nl from "@/lib/tools/office-cost-copy/nl";
import no from "@/lib/tools/office-cost-copy/no";
import pl from "@/lib/tools/office-cost-copy/pl";
import pt from "@/lib/tools/office-cost-copy/pt";
import ru from "@/lib/tools/office-cost-copy/ru";
import sv from "@/lib/tools/office-cost-copy/sv";
import zh from "@/lib/tools/office-cost-copy/zh";

/**
 * What a virtual office costs a team (docs/search.md): pick a team size and
 * billing, see each product's price a month. The prices come from each
 * product's own pricing page in the month `OFFICE_COSTS_CHECKED` names; the
 * copy around them is per language (lib/tools/office-cost-copy).
 */
export const OFFICE_COSTS_PATH = "/tools/virtual-office-cost-calculator";
export const OFFICE_COSTS_UPDATED = "2026-10-16";
export const OFFICE_COSTS_CHECKED = "2026-10";

export type Billing = "yearly" | "monthly";
export type Basis = "office" | "member" | "activeMember" | "space" | "seat";
export type FreeLimit = "everyFeature" | "thirtyMinutes" | "oneFloor" | "atOnce" | "twoHours" | "preRelease";

export interface Cost {
  /** USD a month, before tax. */
  amount: number;
  /** How this price is billed: a product without the billing asked for shows the one it has. */
  billed: Billing;
  /** The plan, when it changes with the team's size. */
  plan?: string;
}

export interface OfficeProduct {
  key: string;
  name: string;
  plan: string;
  pricing: string;
  basis: Basis;
  free?: { upTo: number; limit: FreeLimit };
  /** Null when the product doesn't take a team this size. */
  cost: (people: number, billing: Billing) => Cost | null;
  /** The most people it takes, when that's what stops it. */
  maxPeople?: number;
}

const perPerson = (yearly: number | null, monthly: number | null) => (people: number, billing: Billing): Cost => {
  const rate = billing === "yearly" ? (yearly ?? monthly!) : (monthly ?? yearly!);
  const billed: Billing = billing === "yearly" ? (yearly === null ? "monthly" : "yearly") : monthly === null ? "yearly" : "monthly";
  return { amount: rate * people, billed };
};

export const OFFICE_PRODUCTS: OfficeProduct[] = [
  {
    key: "tinyfloor",
    name: "TinyFloor",
    plan: "Pro",
    pricing: "https://www.tinyfloor.com/pricing",
    basis: "office",
    free: { upTo: 3, limit: "everyFeature" },
    maxPeople: 15,
    cost: (people) => (people <= 15 ? { amount: 29, billed: "monthly" } : null),
  },
  {
    key: "gather",
    name: "Gather",
    plan: "Essential",
    pricing: "https://www.gather.town/pricing",
    basis: "member",
    cost: perPerson(12, 15),
  },
  {
    key: "sowork",
    name: "SoWork",
    plan: "Basic",
    pricing: "https://www.sowork.com/pricing",
    basis: "member",
    free: { upTo: 10, limit: "thirtyMinutes" },
    cost: perPerson(5.4, 6),
  },
  {
    key: "kumospace",
    name: "Kumospace",
    plan: "Business",
    pricing: "https://www.kumospace.com/pricing",
    basis: "member",
    free: { upTo: 5, limit: "oneFloor" },
    cost: perPerson(16, 20),
  },
  {
    key: "workadventure",
    name: "WorkAdventure",
    plan: "Business",
    pricing: "https://workadventu.re/pricing/",
    basis: "member",
    free: { upTo: 10, limit: "atOnce" },
    cost: perPerson(9, 11),
  },
  {
    key: "spatialchat",
    name: "SpatialChat",
    plan: "Business",
    pricing: "https://www.spatial.chat/pricing",
    basis: "member",
    free: { upTo: 12, limit: "twoHours" },
    cost: perPerson(76 / 12, 8),
  },
  {
    key: "roam",
    name: "Roam",
    plan: "Roam",
    pricing: "https://ro.am/pricing",
    basis: "activeMember",
    cost: perPerson(null, 19.5),
  },
  {
    key: "ovice",
    name: "oVice",
    plan: "Entry",
    pricing: "https://www.ovice.com/pricing",
    basis: "space",
    free: { upTo: 50, limit: "preRelease" },
    // Entry-S suits about 10 regular members and Entry-M about 40; past that, Business Starter per user.
    cost: (people, billing) => {
      const yearly = billing === "yearly";
      if (people <= 10) return { amount: yearly ? 65 : 78, billed: billing, plan: "Entry-S" };
      if (people <= 40) return { amount: yearly ? 245 : 294, billed: billing, plan: "Entry-M" };
      return { amount: people * (yearly ? 16 : 19.2), billed: billing, plan: "Business Starter" };
    },
  },
  {
    key: "sococo",
    name: "Sococo",
    plan: "Sococo",
    pricing: "https://www.sococo.com/pricing/",
    basis: "seat",
    // Yearly only, ten seats at least.
    cost: (people) => ({ amount: 13.49 * Math.max(people, 10), billed: "yearly" }),
  },
];

/** Every product's price for a team this size, cheapest first; the ones that can't take it last. */
export function costsFor(people: number, billing: Billing) {
  return OFFICE_PRODUCTS.map((product) => ({ product, cost: product.cost(people, billing) })).sort((a, b) =>
    a.cost && b.cost ? a.cost.amount - b.cost.amount : a.cost ? -1 : b.cost ? 1 : 0,
  );
}

/**
 * A price the way the site writes it in each language (docs/development.md):
 * "29 $" in most of Europe, "$ 29" in Dutch, "US$ 29" in Portuguese, "29$" in
 * Arabic, "$29" elsewhere. Cents only when there are some.
 */
export function usd(amount: number, locale: string): string {
  const rounded = Math.round(amount * 100) / 100;
  const cents = !Number.isInteger(rounded);
  const number = new Intl.NumberFormat(locale === "ar" ? "ar-u-nu-latn" : locale, {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(rounded);
  if (["de", "fr", "es", "it", "pl", "sv", "da", "no", "fi", "ru"].includes(locale)) return `${number} $`;
  if (locale === "nl") return `$ ${number}`;
  if (locale === "pt") return `US$ ${number}`;
  if (locale === "ar") return `${number}$`;
  return `$${number}`;
}

export interface OfficeCostsContent {
  meta: { title: string; description: string };
  eyebrow: string;
  updated: string;
  title: string;
  intro: string;
  calculator: {
    people: string;
    /** "{count} people". */
    count: string;
    billing: Record<Billing, string>;
    product: string;
    free: string;
    price: string;
    /** "{amount} a month". */
    perMonth: string;
    /** "{amount} a year". */
    perYear: string;
    /** Shown beside a price billed differently from the one asked for. */
    only: Record<Billing, string>;
    noFree: string;
    /** "Free at this size", before the free plan's limits. */
    fits: string;
    /** "Up to {count} people". */
    upTo: string;
    pricingPage: string;
    basis: Record<Basis, string>;
    limits: Record<FreeLimit, string>;
    /** "For {count} people, per-person plans cost {low} to {high} a month; TinyFloor is {tinyfloor}." */
    summary: string;
    /** The same past the size TinyFloor takes, without it. */
    summaryLarge: string;
  };
  /** Before the table of team sizes. */
  sections: GuideSection[];
  table: { title: string; body: string[]; product: string; note: string };
  /** After the table. */
  after: GuideSection[];
  fit: { title: string; body: string; cta: string };
  faqTitle: string;
  faq: Array<{ q: string; a: string }>;
}

const COPY: Record<Locale, OfficeCostsContent> = { en, pt, es, it, ja, de, fr, nl, pl, sv, da, no, fi, ru, ko, zh, he, ar };

export const officeCostsIn = (locale: Locale): OfficeCostsContent => COPY[locale];
