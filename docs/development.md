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

- **The About page** (208 words) is mostly about the founder. The four index
  pages now carry a short text under their lists (`hubs` in
  `messages/landing-articles/<locale>.json`); /about was left alone because
  anything more about the person who makes TinyFloor is theirs to write.
- **Unused copy:** every feature, team and use-case page now has its own
  article in every language, which replaces its three short points and its
  moments timeline. Those keys (`points`, `moments`, `momentsTitle` under
  `landings.pages.<key>` in each `messages/<locale>.json`) are no longer shown
  and can be deleted, once the Wonder.me page is decided (it still uses its
  points).
- **The Wonder.me page** serves a product that closed in 2023; decide whether
  to keep it.

## Search Console and Bing

- Search Console allows only a handful of manual indexing requests per
  property, and the quota doesn't simply reset at Pacific midnight: on 16
  October it stopped after 11, then after 2 more, then took one at 07:00 UTC
  and stopped again. It behaves like a rolling 24 hours, so space requests
  through the day. Pages beyond that wait for the sitemap and the next crawl.
- **Still to request in Search Console:** `/ko`
  `/gather-alternative`, and `/de`, `/fr`, `/it`, `/ja`, `/ko`
  `/guides/gather-pricing`; then the pages translated on 16 October, most
  searched first: `/gather-alternative` and `/guides/gather-pricing` in nl,
  pl, sv, da, no, fi, ru, ar, he, zh, and `/virtual-office` and
  `/discord-for-work` in all 17 other languages; then the alternative pages
  rewritten on 16 October (Kumospace, WorkAdventure, Teamflow, Roam, Sococo,
  oVice, SpatialChat, Slack huddles, Gather vs Kumospace) and the use-case and
  team pages given articles on 16 October. Requested on 16 October: the
  English Gather guide, round-up, icebreaker tool, virtual office, Discord for
  work and pricing pages, the Portuguese and Spanish Gather pages, and the
  German, French, Italian and Japanese round-ups.
- Every updated page went to Bing and the other IndexNow engines on 16 October
  (the deploy's own run, then `marketing-frontend/scripts/indexnow.mjs` by
  hand, from `marketing-frontend`). Under Git Bash,
  run it with `MSYS_NO_PATHCONV=1`, or paths like `/pt/pricing` turn into
  Windows paths and IndexNow refuses them all (422).
