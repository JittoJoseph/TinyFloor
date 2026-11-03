/**
 * What changed in TinyFloor, by the day it went live: the changelog page and
 * llms-full.txt both read this. Only what someone using an office would
 * notice; site and search work stays out. Newest first. Links are written
 * `[words](/path)`, the way the guides write them.
 */

export const CHANGELOG_PATH = "/changelog";
/** The day the newest entry went live (YYYY-MM-DD): the page's date and its sitemap lastmod. */
export const CHANGELOG_UPDATED = "2026-11-03";

/** Releases to production a month, counted from the merges that deploy it (the code is on GitHub). */
export const RELEASES = [
  { month: "November 2026", count: 6, partial: true },
  { month: "October 2026", count: 84 },
  { month: "September 2026", count: 41 },
] as const;

export interface ChangelogEntry {
  /** The day it went live, YYYY-MM-DD. */
  date: string;
  title: string;
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-11-03",
    title: "A bigger floor for new offices",
    items: [
      "New offices and the [demo office](/lobby) open on Campus: a building round an open hall, with grounds, a café, a library, a quiet room and patios. Offices made before stay on their floor until their team asks to move.",
    ],
  },
  {
    date: "2026-11-02",
    title: "One dock for everything on the floor",
    items: [
      "Your status, your microphone, the way back to your desk and who's here now live in one dock at the bottom of the floor, which opens into panels in place.",
      "Decorating your desk works spot by spot: each desk has three places for things, and you pick what goes in each.",
      "Messages from the TinyFloor team count as unread and notify you, like any other conversation.",
      "Pressing a chair answers at once; a chair that's taken says so.",
    ],
  },
  {
    date: "2026-10-30",
    title: "A sharper floor",
    items: ["The floor and its characters draw at your screen's own resolution, so they stay crisp at any zoom."],
  },
  {
    date: "2026-10-29",
    title: "Voice messages",
    items: ["Record a voice message in any chat.", "A card in #general shows who's in the meeting room, while a meeting is on."],
  },
  {
    date: "2026-10-23",
    title: "No more passwords",
    items: [
      "Sign in with Google or a one-time code sent to your email.",
      "Make your desk your own: decorate it with things from the catalogue.",
      "The floor appears faster on a first visit.",
    ],
  },
  {
    date: "2026-10-22",
    title: "Desks of your own",
    items: ["Claim a desk, and walk back to it from anywhere on the floor."],
  },
  {
    date: "2026-10-21",
    title: "Pro free for 14 days",
    items: [
      "Every new office starts with 14 days of Pro for the whole team, no card needed (see [pricing](/pricing)).",
      "Share what you're listening to from Spotify on your name tag.",
      "Profiles show each person's local time.",
      "Reply to a message in chat, and see who's typing.",
    ],
  },
  {
    date: "2026-10-20",
    title: "A fuller chat",
    items: [
      "Share files, mention people and search everything said in chat.",
      "Desktop notifications, and pushes to your phone or other computer when TinyFloor isn't open.",
    ],
  },
  {
    date: "2026-10-17",
    title: "Find your team by work email",
    items: ["Colleagues with the same work email domain can find their team's office and walk in, or ask to.", "Set a status note so teammates know what you're up to."],
  },
  {
    date: "2026-10-05",
    title: "Talk to the people who make it",
    items: ["Write to the TinyFloor team from inside the app; the answer comes back in your Chat."],
  },
  {
    date: "2026-09-25",
    title: "Calls start with voice",
    items: ["A call starts with your voice and the camera is a button, the way quick talk works in an office.", "A new ring, and your status shows you're in a call."],
  },
  {
    date: "2026-09-21",
    title: "Clearer voices",
    items: ["Stronger noise removal, and voice settings that reach a call already going."],
  },
  {
    date: "2026-09-20",
    title: "Rebuilt on Cloudflare",
    items: [
      "The whole app moved to Cloudflare's network: each office's floor and chat run on their own, calls go through Cloudflare's relay and meetings through its media servers. How it works now is on [how TinyFloor works](/how-it-works).",
    ],
  },
  {
    date: "2026-09-16",
    title: "Sharper characters",
    items: ["New characters drawn pixel for pixel, and a new status picker."],
  },
  {
    date: "2026-09-12",
    title: "18 languages",
    items: ["The app and the site in 18 languages, from Portuguese and Japanese to Arabic and Hebrew."],
  },
  {
    date: "2026-09-09",
    title: "A whiteboard in the meeting room",
    items: ["Draw together on the meeting room's whiteboard."],
  },
];
