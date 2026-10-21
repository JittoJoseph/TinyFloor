# Development debt

What we know is missing or behind, so it isn't forgotten. Not a log of what
was built: when an item is done, delete it.

## Adding a page in every language

Nothing is missing in any language today. A language without a page's deeper
version shows the shorter one, never English text under a translated headline;
the icebreaker lists are typed per locale, so a new language fails the
typecheck until it has one.

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
- **Still to request in Search Console:** the main alternative page in
  Korean, and the competitor pricing guide in German, French, Italian,
  Japanese and Korean; then the pages translated on 16 October, most
  searched first: those two pages in nl, pl, sv, da, no, fi, ru, ar, he, zh,
  and `/virtual-office` and `/discord-for-work` in all 17 other languages;
  then the other alternative and "X vs Y" pages rewritten on 16 October and
  the use-case and team pages given articles on 16 October. Requested on 16
  October: the English competitor pricing guide, round-up, icebreaker tool,
  virtual office, Discord for work and pricing pages, the Portuguese and
  Spanish alternative and pricing guide pages, and the German, French,
  Italian and Japanese round-ups.
- Every updated page went to Bing and the other IndexNow engines on 16 October
  (`pnpm run indexnow <path…>` from `marketing-frontend`, by hand: deploys
  don't run it). Under Git Bash,
  run it with `MSYS_NO_PATHCONV=1`, or paths like `/pt/pricing` turn into
  Windows paths and IndexNow refuses them all (422).
