/**
 * What changed in TinyFloor, by the day it went live: the changelog, each
 * entry's own page, the feed (changelog.xml) and llms-full.txt all read this.
 * Only what someone using an office would notice; site and search work stays
 * out. Newest first. Links are written `[words](/path)`, the way the guides
 * write them.
 *
 * One entry is one change people can see, not one day: a release that brought
 * three things is three entries on the same date. An entry with `body` gets a
 * page of its own (/changelog/<slug>), with how to use it and what's behind
 * it; the rest are only on the changelog. Its `summary` stands on its own, as
 * an answer would quote it: it's the card, the page's description and the
 * feed's item.
 */

export const CHANGELOG_PATH = "/changelog";
/** The feed of the same entries, for readers and anything that follows the site. */
export const CHANGELOG_FEED = "/changelog.xml";

/** Releases to production a month, counted from the merges that deploy it (the code is on GitHub). */
export const RELEASES = [
  { month: "November 2026", count: 20, partial: true },
  { month: "October 2026", count: 84 },
  { month: "September 2026", count: 41 },
] as const;

export type ChangeKind = "new" | "improved" | "fixed";

export interface ChangelogEntry {
  /** Its address: /changelog/<slug> for an entry with a page, #<slug> on the changelog page that lists it for the rest. A few words, and it never changes. */
  slug: string;
  /** The day it went live, YYYY-MM-DD. */
  date: string;
  kind: ChangeKind;
  title: string;
  /** One or two sentences that stand on their own: the card, the page's description, the feed. */
  summary: string;
  /**
   * A picture of it from the product: public/screens/<image>.webp (1600 by
   * 1000), with a 1200 by 630 .jpg beside it for the page's social card.
   */
  image?: { name: string; alt: string };
  /** The page where the feature lives, by the feature's name. */
  more?: { href: string; label: string };
  /**
   * Its own page's text, in sections, each with a picture of its own if it
   * shows something the entry's picture doesn't. Without it, the entry is only
   * on the changelog.
   */
  body?: Array<{ title: string; paragraphs: string[]; image?: { name: string; alt: string } }>;
  /** Smaller changes that went out with it. */
  also?: string[];
}

export const changelogPath = (entry: ChangelogEntry) => `${CHANGELOG_PATH}/${entry.slug}`;

/** What the changelog is, for its pages' descriptions. */
export const CHANGELOG_DESCRIPTION =
  "What's new in TinyFloor, the virtual office for remote teams: every change people using an office would notice, by the day it went live, with pictures from the app.";

/** Changes on each page of the changelog; older ones go on /changelog/page/2 and on. */
export const CHANGELOG_PAGE_SIZE = 12;
/** How many pages the changelog runs to. */
export const changelogPageCount = () => Math.max(1, Math.ceil(CHANGELOG.length / CHANGELOG_PAGE_SIZE));
/** A page of the changelog: the first is /changelog itself. */
export const changelogListPath = (page: number) => (page <= 1 ? CHANGELOG_PATH : `${CHANGELOG_PATH}/page/${page}`);
/** The changes on one page of it, newest first. */
export const changelogOnPage = (page: number) => CHANGELOG.slice((page - 1) * CHANGELOG_PAGE_SIZE, page * CHANGELOG_PAGE_SIZE);
/** Where a change is read: its own page, or its place on the page of the changelog that lists it. */
export const changelogHref = (entry: ChangelogEntry) =>
  entry.body ? changelogPath(entry) : `${changelogListPath(Math.floor(CHANGELOG.indexOf(entry) / CHANGELOG_PAGE_SIZE) + 1)}#${entry.slug}`;
export const changelogImage = (entry: ChangelogEntry) => (entry.image ? `/screens/${entry.image.name}.webp` : null);
export const changelogCard = (entry: ChangelogEntry) => (entry.image ? `/screens/${entry.image.name}.jpg` : null);
/** The entries with a page of their own. */
export const CHANGELOG_PAGES = () => CHANGELOG.filter((entry) => entry.body);

/**
 * Every entry, including any written ahead for a day that hasn't come (a
 * seasonal change that switches itself on). The site is built ahead of time,
 * so one of those appears with the first deploy on or after its day.
 */
const ENTRIES: ChangelogEntry[] = [
  {
    slug: "christmas",
    date: "2026-12-01",
    kind: "new",
    title: "Christmas on the floor",
    summary:
      "From 1 December to 6 January, snow falls over the floor and a pile of presents outside the building holds a Christmas hat. Walk over to wear it, and everyone on the floor sees it on you until you take it off.",
    also: ["Snow can be turned off in Settings, for you alone."],
  },
  {
    slug: "dressing-room",
    date: "2026-11-14",
    kind: "new",
    title: "A dressing room for your character",
    summary:
      "Your character has a dressing room: start from one of 16 characters, then change its skin, hair, outfit and extras like hats, glasses and bags, with a preview that walks as you go.",
    image: { name: "dressing-room", alt: "TinyFloor's dressing room, with the Extras tab open on hats and a character wearing a brown hat in the preview" },
    more: { href: "/lobby", label: "Demo office" },
    body: [
      {
        title: "Where to find it",
        paragraphs: [
          "Select your face at the left end of the dock, at the bottom of the floor, then Change how you look. The dressing room opens over the floor with your character on the left and what you can change on the right.",
        ],
      },
      {
        title: "What you can change",
        paragraphs: [
          "Start from any of 16 ready-made characters, or build your own: skin, hair (style and colour), outfit, and extras, which are faces, glasses, hats, gloves and bags, most of them in a few colours.",
          "The preview shows each choice on your character as you point at it, and you can turn it round or set it walking, to see the look the way the floor will. Undo goes back a step, and Randomize picks a whole new look to start from.",
        ],
      },
      {
        title: "Everyone sees it at once",
        paragraphs: [
          "Save, and your character changes where it stands. You don't leave the floor to do it: a call you're on goes on, and nobody hears you arrive again. Your character's face in the dock changes with it.",
        ],
      },
    ],
  },
  {
    slug: "floating-dock",
    date: "2026-11-14",
    kind: "improved",
    title: "The dock floats, in your theme",
    summary:
      "The dock at the bottom of the floor now floats just above its edge and follows your light or dark theme, so it sits with the floor instead of on top of it. Faces in it are rounded squares, like its buttons.",
    image: { name: "floating-dock", alt: "TinyFloor's dock in the dark theme, open on Nathan's status, floating over desks in the office hall" },
    more: { href: "/team-presence", label: "Presence" },
    also: ["On a phone, the joystick fades back while you aren't using it, so it covers less of the floor."],
  },
  {
    slug: "facing-the-way-you-walk",
    date: "2026-11-13",
    kind: "fixed",
    title: "Characters face the way they walk",
    summary:
      "A character now faces the way it's heading, the same on every screen, instead of turning to face the floor on a walk slightly off a straight line.",
    also: ["On high-density screens, the floor's lines stay even when the camera stops."],
  },
  {
    slug: "new-look-without-leaving",
    date: "2026-11-06",
    kind: "improved",
    title: "A new look without leaving the room",
    summary:
      "Changing your look or your name no longer takes you off the floor and back: your character changes where it stands, your call goes on, and nobody hears you arrive again.",
    also: ["Music from Spotify keeps playing when TinyFloor is in a background tab."],
  },
  {
    slug: "faster-calls",
    date: "2026-11-05",
    kind: "improved",
    title: "Calls connect while they ring",
    summary:
      "From answering a call to hearing each other now takes under a second, down from about six, because the connection is made while it rings. Voices are cleaner too, with noise removal in the browser and a hint when you talk while muted.",
    image: { name: "calls", alt: "A call on TinyFloor's floor: Nathan and Ryan standing together between the desks, with the call's controls below" },
    more: { href: "/proximity-chat", label: "Proximity chat" },
    body: [
      {
        title: "Under a second from answering to talking",
        paragraphs: [
          "When you call someone, the connection between you is made while it rings, with nothing sent on it: your microphone opens when you call, theirs only when they answer. Measured through the app on the same machine and network, the time from answering to hearing each other went from about 5.7 seconds (and up to 13.7) to between 0.4 and 0.9 seconds.",
          "A call says Connecting until the other person's voice is actually arriving, so it never looks connected while it's silent.",
        ],
      },
      {
        title: "Cleaner voices",
        paragraphs: [
          "Noise removal runs in your browser and takes over once it has loaded, so a call never waits for it. Detecting who's talking ignores fans, key clicks and barking.",
          "Talking with your microphone off shows \"You're muted\". If you unplug a headset, or pick another microphone or camera in the middle of a call, the call follows.",
        ],
      },
      {
        title: "Sharper screens, and a call in a small window",
        paragraphs: [
          "Screen sharing goes up to 1080p and opens large in a call. Text on a shared screen is readable after about 5 seconds, where it took 19.",
          "In Chrome, a call or a meeting can sit in a small window on top of your other apps, with who's talking, the time, and your microphone, camera and hang up. It opens from the call's bar, and by itself when you switch tabs mid-call where Chrome allows it.",
        ],
      },
      {
        title: "Meetings that hold",
        paragraphs: [
          "A meeting connects as you join it, and a dropped connection to the office no longer drops you out of the meeting: you're back in about a second, with the same microphone, camera and shared screen, and no join or leave sounds.",
        ],
        image: { name: "meetings", alt: "A meeting in TinyFloor's meeting room: Mia, Leo and Zoe at the table and Emma walking in" },
      },
    ],
  },
  {
    slug: "chat-and-search",
    date: "2026-11-05",
    kind: "improved",
    title: "Chat that never loses a message, and search that finds everything",
    summary:
      "A message shows the moment you send it and is never lost or posted twice, even when your connection drops, and search now finds anything ever said in your office, not only recent messages.",
    image: { name: "chat-search", alt: "Search in TinyFloor's chat finding three messages about onboarding in #general, from John Connor and Jordan Lee" },
    more: { href: "/team-chat", label: "Team chat" },
    body: [
      {
        title: "What you send is never lost",
        paragraphs: [
          "A message appears the moment you send it, faded until the office has it. If it can't go, it says Not sent, with Send again and Discard, and it goes by itself when your connection is back. Each message carries an id from your app, so one sent twice is only posted once.",
          "Measured: shown in a third of a second; sent while the connection was dead, posted once after it came back; sent but its answer lost, still posted once.",
        ],
        image: {
          name: "chat",
          alt: "TinyFloor's team chat in #general: Jordan Lee, Ryan, John Connor and Nathan planning standup and an onboarding review",
        },
      },
      {
        title: "Search that finds anything ever said",
        paragraphs: [
          "Search used to look through the newest 20,000 messages, so older ones were never found. Messages are now kept in a full-text index, and search finds words by how they start: \"meet tomorrow\" finds \"Meeting's tomorrow?\". Capitals and accents don't matter.",
          "Press Ctrl+K (⌘K on a Mac), or Search or jump to at the top of Chat. On the Free plan search covers the last 90 days; on Pro, everything.",
        ],
      },
    ],
  },
  {
    slug: "whiteboard-ink",
    date: "2026-11-05",
    kind: "improved",
    title: "Ink on the whiteboard",
    summary:
      "Lines on the meeting room's whiteboard now follow your pen on a smooth curve and grow thicker or thinner with its speed, so a quick circle comes out round instead of as a polygon.",
    image: {
      name: "whiteboard",
      alt: "TinyFloor's whiteboard open in the meeting room: three steps sketched with arrows, two ticked off and the last circled, notes, and a chart that climbs",
    },
    more: { href: "/online-whiteboard", label: "Whiteboard" },
  },
  {
    slug: "staying-connected",
    date: "2026-11-05",
    kind: "fixed",
    title: "Staying connected through sleep and Wi-Fi changes",
    summary:
      "When your laptop sleeps or your Wi-Fi changes, TinyFloor notices within seconds and reconnects, instead of leaving you on a floor that had already let you go.",
    also: [
      "A click on the floor walks you there in a straight line across open rooms, instead of a zigzag along the grid.",
      "Nobody is marked away for leaving TinyFloor in a background tab while they work in other apps.",
    ],
  },
  {
    slug: "campus",
    date: "2026-11-03",
    kind: "new",
    title: "A bigger floor for new offices",
    summary:
      "New offices and the demo office open on Campus: a building round an open hall, with grounds, a café, a library, a quiet room and patios. Offices made before stay on their floor until their team asks to move.",
    image: { name: "campus", alt: "Campus, TinyFloor's office floor: the open hall with two rows of desks and people at work, meeting rooms above" },
    more: { href: "/lobby", label: "Demo office" },
  },
  {
    slug: "one-dock",
    date: "2026-11-02",
    kind: "new",
    title: "One dock for everything on the floor",
    summary:
      "Your status, your microphone, the way back to your desk and who's here now live in one dock at the bottom of the floor, which opens into panels in place.",
    also: [
      "Decorating your desk works spot by spot: each desk has three places for things, and you pick what goes in each.",
      "Messages from the TinyFloor team count as unread and notify you, like any other conversation.",
      "Pressing a chair answers at once; a chair that's taken says so.",
    ],
  },
  {
    slug: "sharper-floor",
    date: "2026-10-30",
    kind: "improved",
    title: "A sharper floor",
    summary: "The floor and its characters draw at your screen's own resolution, so they stay crisp at any zoom.",
  },
  {
    slug: "voice-messages",
    date: "2026-10-29",
    kind: "new",
    title: "Voice messages",
    summary: "Record a voice message in any chat, when typing would take longer.",
    also: ["A card in #general shows who's in the meeting room, while a meeting is on."],
  },
  {
    slug: "passwordless-sign-in",
    date: "2026-10-23",
    kind: "new",
    title: "No more passwords",
    summary: "Sign in with Google or a one-time code sent to your email.",
    also: ["Make your desk your own: decorate it with things from the catalogue.", "The floor appears faster on a first visit."],
  },
  {
    slug: "desks",
    date: "2026-10-22",
    kind: "new",
    title: "Desks of your own",
    summary: "Claim a desk, and walk back to it from anywhere on the floor.",
  },
  {
    slug: "pro-trial",
    date: "2026-10-21",
    kind: "new",
    title: "Pro for 14 days",
    summary: "Every new office starts with 14 days of Pro for the whole team (see [pricing](/pricing)).",
    also: ["Share what you're listening to from Spotify on your name tag.", "Profiles show each person's local time.", "Reply to a message in chat, and see who's typing."],
  },
  {
    slug: "fuller-chat",
    date: "2026-10-20",
    kind: "new",
    title: "A fuller chat",
    summary: "Share files, mention people and search everything said in chat.",
    also: ["Desktop notifications, and pushes to your phone or other computer when TinyFloor isn't open."],
  },
  {
    slug: "find-your-team",
    date: "2026-10-17",
    kind: "new",
    title: "Find your team by work email",
    summary: "Colleagues with the same work email domain can find their team's office and walk in, or ask to.",
    also: ["Set a status note so teammates know what you're up to."],
  },
  {
    slug: "talk-to-us",
    date: "2026-10-05",
    kind: "new",
    title: "Talk to the people who make it",
    summary: "Write to the TinyFloor team from inside the app; the answer comes back in your Chat.",
  },
  {
    slug: "voice-first-calls",
    date: "2026-09-25",
    kind: "improved",
    title: "Calls start with voice",
    summary: "A call starts with your voice and the camera is a button, the way quick talk works in an office.",
    also: ["A new ring, and your status shows you're in a call."],
  },
  {
    slug: "clearer-voices",
    date: "2026-09-21",
    kind: "improved",
    title: "Clearer voices",
    summary: "Stronger noise removal, and voice settings that reach a call already going.",
  },
  {
    slug: "rebuilt-on-cloudflare",
    date: "2026-09-20",
    kind: "improved",
    title: "Rebuilt on Cloudflare",
    summary:
      "The whole app moved to Cloudflare's network: each office's floor and chat run on their own, calls go through Cloudflare's relay and meetings through its media servers. How it works now is on [how TinyFloor works](/how-it-works).",
  },
  {
    slug: "sharper-characters",
    date: "2026-09-16",
    kind: "improved",
    title: "Sharper characters",
    summary: "New characters drawn pixel for pixel, and a new status picker.",
  },
  {
    slug: "18-languages",
    date: "2026-09-12",
    kind: "new",
    title: "18 languages",
    summary: "The app and the site in 18 languages, from Portuguese and Japanese to Arabic and Hebrew.",
  },
  {
    slug: "whiteboard",
    date: "2026-09-09",
    kind: "new",
    title: "A whiteboard in the meeting room",
    summary: "Draw together on the meeting room's whiteboard.",
    more: { href: "/online-whiteboard", label: "Whiteboard" },
  },
];

/** The changes that have gone live, newest first. */
export const CHANGELOG: ChangelogEntry[] = ENTRIES.filter((entry) => entry.date <= new Date().toISOString().slice(0, 10));
/** The day the newest of them went live (YYYY-MM-DD): the page's date and its sitemap lastmod. */
export const CHANGELOG_UPDATED = CHANGELOG[0].date;
