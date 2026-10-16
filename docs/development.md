# Development debt

What we know is missing or behind, so it isn't forgotten. Not a log of what
was built: when an item is done, delete it.

## Content missing in some languages

The Gather pricing guide, the Gather round-up, the virtual office page and
Discord for work are in all 18 languages. A language without a page's deeper
version shows the shorter one, never English text under a translated headline.

| Page | Deeper version in | Still the shorter version in | Where the text lives |
|---|---|---|---|
| `/tools/icebreaker-questions` | en only, by design for now | every other language's copy points search engines at the English page | `marketing-frontend/src/lib/tools/icebreakers.ts` |

When a new article is translated, its table rows need the language's own
number format (`1.152 $`, `1 152 $`, `$1,152`, `US$ 1.152`), as the existing
ones have, and the site's own word for the floor in each language.

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
- **One-against-one alternative pages:** 560 to 620 words (WorkAdventure,
  Sococo, Roam, SpatialChat, Teamflow, Slack huddles, oVice, Gather vs
  Kumospace). Kumospace, which has the most impressions after Gather, now has
  its full article in every language.
- **The Wonder.me page** serves a product that closed in 2023; decide whether
  to keep it.

## Search Console and Bing

- Search Console allows only a handful of manual indexing requests a day per
  property, and the day runs on Pacific time, so a new day in India can still
  be yesterday's quota (on 16 October it stopped after 11, then after 2 more).
  Pages beyond that wait for the sitemap and the next crawl.
- **Still to request in Search Console:** `/ja`, `/ko`
  `/gather-alternative`, and `/de`, `/fr`, `/it`, `/ja`, `/ko`
  `/guides/gather-pricing`; then the pages translated on 16 October, most
  searched first: `/gather-alternative` and `/guides/gather-pricing` in nl,
  pl, sv, da, no, fi, ru, ar, he, zh, and `/virtual-office` and
  `/discord-for-work` in all 17 other languages. Requested on 16 October: the
  English Gather guide, round-up, icebreaker tool, virtual office, Discord for
  work and pricing pages, the Portuguese and Spanish Gather pages, and the
  German, French and Italian round-ups.
- Every updated page went to Bing and the other IndexNow engines on 16 October
  (the deploy's own run, then `marketing-frontend/scripts/indexnow.mjs` by
  hand, from `marketing-frontend`). Under Git Bash,
  run it with `MSYS_NO_PATHCONV=1`, or paths like `/pt/pricing` turn into
  Windows paths and IndexNow refuses them all (422).
