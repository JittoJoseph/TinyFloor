/**
 * The illustrations made for the site's own pages, in public/illustrations:
 * one per free tool and per feature, team and use-case page, by slug, and
 * the demo office's. The same series as the guides' and the blog's covers.
 * A page not listed here (a comparison) has none, and its card shows words only.
 */
const ILLUSTRATED = new Set([
  "demo-office",
  // The free tools, by the last part of their path.
  "icebreaker-questions",
  "virtual-office-cost-calculator",
  "time-zone-meeting-planner",
  "would-you-rather-questions",
  "two-truths-and-a-lie",
  "daily-standup-template",
  "out-of-office-message",
  "team-building-questions",
  // Features.
  "online-whiteboard",
  "proximity-chat",
  "team-chat",
  "team-presence",
  "virtual-meeting-room",
  // Teams.
  "agencies",
  "design-teams",
  "engineering-teams",
  "hybrid-teams",
  "startups",
  // Use cases.
  "remote-onboarding",
  "remote-pair-programming",
  "virtual-coworking",
  "virtual-office",
  "virtual-standup",
  "virtual-watercooler",
]);

/** The illustration for a page's slug (or a tool's path), if it has one. */
export function illustrationFor(slugOrPath: string): string | null {
  const slug = slugOrPath.split("/").filter(Boolean).pop() ?? "";
  return ILLUSTRATED.has(slug) ? `/illustrations/${slug}.webp` : null;
}
