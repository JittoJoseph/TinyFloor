/**
 * The help center's questions, by address, topic and the questions to read
 * next (lib/help.ts has their words). Kept apart so the middleware can list
 * the addresses without loading any copy.
 */

export type HelpTopic = "plans" | "start" | "calls" | "privacy";

export interface HelpPlace {
  slug: string;
  topic: HelpTopic;
  /** Other questions to read next, by slug. */
  related: string[];
}

export const HELP_PAGES: HelpPlace[] = [
  { slug: "is-tinyfloor-free", topic: "plans", related: ["how-does-the-free-trial-work", "how-many-people-can-join-an-office", "how-do-i-cancel"] },
  { slug: "how-does-the-free-trial-work", topic: "plans", related: ["is-tinyfloor-free", "how-do-i-cancel", "how-many-people-can-join-an-office"] },
  { slug: "how-many-people-can-join-an-office", topic: "plans", related: ["is-tinyfloor-free", "how-do-i-invite-my-team"] },
  { slug: "how-do-i-cancel", topic: "plans", related: ["is-tinyfloor-free", "how-does-the-free-trial-work"] },
  { slug: "does-tinyfloor-need-a-download", topic: "start", related: ["does-tinyfloor-work-on-phones", "how-do-i-invite-my-team", "does-tinyfloor-keep-working-in-a-background-tab"] },
  { slug: "does-tinyfloor-work-on-phones", topic: "start", related: ["does-tinyfloor-need-a-download", "does-tinyfloor-work-behind-a-firewall-or-vpn"] },
  { slug: "how-do-i-invite-my-team", topic: "start", related: ["how-many-people-can-join-an-office", "does-tinyfloor-have-single-sign-on", "does-tinyfloor-need-a-download"] },
  { slug: "does-tinyfloor-record-calls", topic: "privacy", related: ["where-is-my-data-stored", "does-tinyfloor-keep-working-in-a-background-tab"] },
  { slug: "where-is-my-data-stored", topic: "privacy", related: ["does-tinyfloor-record-calls", "does-tinyfloor-have-single-sign-on"] },
  { slug: "does-tinyfloor-have-single-sign-on", topic: "privacy", related: ["how-do-i-invite-my-team", "where-is-my-data-stored"] },
  { slug: "does-tinyfloor-work-behind-a-firewall-or-vpn", topic: "calls", related: ["does-tinyfloor-keep-working-in-a-background-tab", "does-tinyfloor-work-on-phones"] },
  { slug: "does-tinyfloor-keep-working-in-a-background-tab", topic: "calls", related: ["does-tinyfloor-work-behind-a-firewall-or-vpn", "does-tinyfloor-record-calls"] },
];
