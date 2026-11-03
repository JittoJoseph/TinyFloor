/**
 * How TinyFloor works, for a team deciding whether to run its day on it: how
 * calls, meetings and screen sharing are carried, what happens when a
 * connection drops, where it runs, how often it changes, and what it doesn't
 * do. The page and llms-full.txt both read this. Every number is the code's
 * (app-frontend lib/media.ts, docs/calls.md);
 * change it here when the code changes. Links are written `[words](/path)`.
 */

export const HOW_IT_WORKS_PATH = "/how-it-works";
/** The day these words last changed (YYYY-MM-DD). */
export const HOW_IT_WORKS_UPDATED = "2026-11-03";

export const HOW_IT_WORKS_TITLE = "How TinyFloor works";
export const HOW_IT_WORKS_DESCRIPTION =
  "How TinyFloor carries calls, meetings and screen sharing, what happens when a connection drops, where it runs, how often it changes and what it doesn't do yet.";
export const HOW_IT_WORKS_INTRO =
  "TinyFloor is a virtual office in the browser: your team's characters on one floor, a call when you walk up to someone, a meeting room for the rest. This page is for the team deciding whether to rely on it every day: how it's built, with the numbers, and what it doesn't do.";

export interface HowItWorksSection {
  id: string;
  title: string;
  paragraphs?: string[];
  items?: string[];
  /** Questions and answers, for the last section. */
  faq?: Array<{ q: string; a: string }>;
}

export const HOW_IT_WORKS: HowItWorksSection[] = [
  {
    id: "calls",
    title: "Calls",
    paragraphs: [
      "Walk up to a teammate and start a call: it's one to one, and it starts with voice. The camera is a button, off again at your next call.",
    ],
    items: [
      "Every call goes through Cloudflare's relay (TURN), so it connects the same way behind an office firewall, a VPN or a phone network as at home. In testing, direct connections between browsers almost never worked on real networks, so we don't try them.",
      "It tries UDP first, which keeps voice smooth, and falls back to TCP or TLS on networks that block UDP.",
      "Every voice packet carries a copy of the one before, so a lost packet is still heard: in our tests the audible gaps fell from 8 or 9 every half minute to 0 or 1.",
      "Echo cancellation and noise removal run in your browser. Audio is never processed or stored on a server, and nothing is recorded.",
    ],
  },
  {
    id: "meetings",
    title: "Meetings",
    items: [
      "Three people or more meet in the meeting room, through Cloudflare's media servers (an SFU): everyone sends their video once, and each person receives only what their screen shows, at 720p for whoever is speaking on the stage, 360p for two or three side by side and 180p for small tiles.",
      "Cameras send at up to 720p and 24 frames a second.",
    ],
  },
  {
    id: "screen-sharing",
    title: "Screen sharing",
    items: [
      "Share your whole screen, a window or a browser tab in any call or meeting, from a desktop browser. Phones can watch a shared screen but not share one.",
      "A shared screen is sent at up to 720p and 10 to 15 frames a second, tuned to keep text sharp: code, documents, designs, dashboards. On the meeting stage it's shown at full size.",
      "It isn't made for playing video smoothly, and it doesn't share your computer's sound yet.",
    ],
  },
  {
    id: "connection",
    title: "When a connection drops",
    items: [
      "The floor reconnects by itself and says \"Reconnecting\" while it does. Once it's back you're where you were, sitting at the same desk.",
      "If a call can't find a path over UDP within a few seconds, it widens to the relay's TCP and TLS paths instead of failing.",
      "Everything is in the browser, so there's nothing to update and nothing to install. You can install it as an app from the browser if you'd like its own window.",
    ],
  },
  {
    id: "where",
    title: "Where it runs",
    items: [
      "The site, the app and its data run on Cloudflare's network. Each office's floor and its chat run on their own, in a Cloudflare Durable Object, so one busy office doesn't slow another.",
      "There are no passwords: you sign in with Google or a one-time code sent to your email. Everything travels over encrypted connections.",
      "What we keep and why is in the [privacy policy](/privacy).",
    ],
  },
  {
    id: "open-source",
    title: "Open source",
    paragraphs: [
      "The whole app is on [GitHub](https://github.com/JittoJoseph/TinyFloor) under the AGPL-3.0 license: the floor, the calls, the API and how they're deployed. You can read exactly how a call is set up, or run it yourself.",
    ],
  },
  {
    id: "changes",
    title: "How often it changes",
    paragraphs: [
      "TinyFloor ships to production almost every day: 84 releases in October 2026 and 41 in September. What changed for people using it, by date, is in the [changelog](/changelog).",
    ],
  },
  {
    id: "limits",
    title: "What it doesn't do yet",
    items: [
      "No recordings or transcripts of calls and meetings.",
      "No AI meeting notes.",
      "No single sign-on (SAML or SCIM).",
      "No sharing of your computer's sound when you share a screen.",
      "No public uptime history or status page yet.",
      "An office is for one team that works together every day, not a whole company: a bigger company gives each team an office of its own.",
    ],
  },
  {
    id: "questions",
    title: "Questions",
    faq: [
      {
        q: "Does TinyFloor work behind a company firewall or VPN?",
        a: "Yes, in most cases. Every call goes through Cloudflare's relay, and falls back from UDP to TCP and TLS, so it only needs ordinary HTTPS to get through.",
      },
      {
        q: "How good is TinyFloor's screen sharing?",
        a: "It's made for showing work: up to 720p at 10 to 15 frames a second, tuned for sharp text such as code and documents. It isn't made for smooth video, and it doesn't share sound yet.",
      },
      {
        q: "Does TinyFloor record calls?",
        a: "No. Calls and meetings are never recorded, and audio is never processed on a server.",
      },
      {
        q: "What happens if my internet drops?",
        a: "The floor reconnects by itself and puts you back where you were, at the same desk.",
      },
      {
        q: "Is TinyFloor actively developed?",
        a: "Yes. It ships to production almost every day, 84 releases in October 2026, and every change is public on GitHub. The changelog lists what changed for people using it.",
      },
      {
        q: "What does TinyFloor cost?",
        a: "Pro is one price for the whole team, $29 a month, not a price per person, and every new office starts with 14 days of Pro free, no card needed. See [pricing](/pricing).",
      },
    ],
  },
];
