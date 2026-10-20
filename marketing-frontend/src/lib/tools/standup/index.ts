import type { GuideSection } from "@/lib/guides";
import type { Locale } from "@/lib/i18n/routing";
import type { ToolCopy } from "@/components/tools/ToolPage";
import en from "./en";
import es from "./es";
import pt from "./pt";

/**
 * A daily standup template builder (docs/search.md: "daily standup template",
 * "daily standup agenda", "daily standup tool", each over 100 searches a month
 * in the US, easy), for the audience we want most: small software teams. In
 * English, Portuguese and Spanish (lib/tools/catalog).
 */
export const STANDUP_UPDATED = "2026-10-20";

export type StandupFormat = "live" | "async" | "board";

export interface StandupQuestionSet {
  key: string;
  label: string;
  /** Three questions, asked of everyone. */
  questions: [string, string, string];
}

export interface StandupContent extends ToolCopy {
  builder: {
    team: string;
    /** "{count} people". */
    people: string;
    format: string;
    formats: Record<StandupFormat, string>;
    questions: string;
    sets: StandupQuestionSet[];
    icebreaker: string;
    /** "{count} minutes". */
    minutes: string;
    /** What the result is: an agenda for a meeting, a message to post. */
    agenda: string;
    template: string;
    copy: string;
    copied: string;
    /** The agenda's lines; {column} is a board column. */
    lines: {
      open: string;
      icebreaker: string;
      round: string;
      column: string;
      blockers: string;
      close: string;
    };
    /** A board's columns, right to left: nearest to done first. */
    columns: string[];
    /** A line under the result saying how it was worked out. */
    note: Record<StandupFormat, string>;
  };
  sections: GuideSection[];
}

const CONTENT: Partial<Record<Locale, StandupContent>> = { en, pt, es };

export const standupIn = (locale: string): StandupContent | undefined => CONTENT[locale as Locale];

/**
 * How long a standup should take: about a minute a person, a little less in a
 * bigger team, plus a minute to open and close (and one for an icebreaker),
 * never more than fifteen. Walking a board depends more on the work than the
 * people, so it's five minutes plus one a person, up to fifteen.
 */
export function standupMinutes(format: StandupFormat, people: number, icebreaker: boolean): number {
  if (format === "async") return 0;
  if (format === "board") return Math.min(15, 5 + people + (icebreaker ? 1 : 0));
  const each = people <= 8 ? 1 : 0.75;
  return Math.min(15, Math.ceil(people * each + 2 + (icebreaker ? 1 : 0)));
}
