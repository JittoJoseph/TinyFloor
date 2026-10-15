# Development debt

What we know is missing or behind, so it isn't forgotten. Not a log of what
was built: when an item is done, delete it.

## Content missing in some languages

Pages get their deeper content in English first, then in the languages people
buy in (Portuguese, Spanish, German, French, Italian, Japanese, Korean), then
the rest. A language without the deeper version shows the page's shorter one,
never English text under a translated headline.

| Page | Deeper version in | Still the shorter version in | Where the text lives |
|---|---|---|---|
| `/guides/gather-pricing` | en, pt, es, de, fr, it, ja, ko | nl, pl, sv, da, no, fi, ru, ar, he, zh | `messages/guides/<locale>.json` → `gatherPricing` |
| `/gather-alternative` (round-up) | en, pt, es, de, fr, it, ja, ko | nl, pl, sv, da, no, fi, ru, ar, he, zh (still the one-against-one page and its "free Gather alternative" title) | `messages/landing-articles/<locale>.json` → `gather`, and `messages/<locale>.json` → `landings.pages.gather` |
| `/virtual-office` | en | every other language | `messages/landing-articles/<locale>.json` → `virtualOffice`; the English title and description changed too |
| `/discord-for-work` | en | every other language | `messages/landing-articles/<locale>.json` → `discord` |
| `/tools/icebreaker-questions` | en only, by design for now | every other language's copy points search engines at the English page | `marketing-frontend/src/lib/tools/icebreakers.ts` |

A translated round-up needs its table rows in the language's own number format
(`1.152 $`, `1 152 $`, `$1,152`, `US$ 1.152`), as the existing ones have.

## Pages that are still thin

Measured on 16 October 2026 (English, words a reader sees):

- **Index pages:** `/teams` 153, `/features` 176, `/use-cases` 216,
  `/compare` 396, `/about` 208. They mostly route visitors on; each would do
  better with a short real introduction to what's behind it.
- **Feature, team and use-case pages:** 280 to 440 words each (online
  whiteboard, design teams, team chat, team presence, engineering teams,
  meeting room, agencies, startups, watercooler, standup, onboarding, pair
  programming, coworking, proximity chat). Each needs its own article: they
  still share the home page's "moments" block.
- **One-against-one alternative pages:** 560 to 620 words (Kumospace,
  WorkAdventure, Sococo, Roam, SpatialChat, Teamflow, Slack huddles, oVice,
  Gather vs Kumospace). Kumospace has the most impressions after Gather.
- **The Wonder.me page** serves a product that closed in 2023; decide whether
  to keep it.

## Search Console and Bing

- Search Console allows only a handful of manual indexing requests a day per
  property (on 16 October it stopped after 11). Pages beyond that wait for the
  sitemap and the next crawl.
- **Still to request in Search Console:** `/fr`, `/it`, `/ja`, `/ko`
  `/gather-alternative`, and `/de`, `/fr`, `/it`, `/ja`, `/ko`
  `/guides/gather-pricing`. Requested on 16 October: the English Gather guide,
  round-up, icebreaker tool, virtual office, Discord for work and pricing
  pages, the Portuguese and Spanish Gather pages, and the German round-up.
- Every updated page went to Bing and the other IndexNow engines on 16 October
  (the deploy's own run, then `scripts/indexnow.mjs` by hand). Under Git Bash,
  run it with `MSYS_NO_PATHCONV=1`, or paths like `/pt/pricing` turn into
  Windows paths and IndexNow refuses them all (422).
