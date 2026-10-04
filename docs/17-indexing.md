# 17. Indexing and AI answers

How new and changed pages reach search engines and AI assistants quickly.

## IndexNow, on every production deploy

IndexNow tells Bing, Yandex, Seznam, Naver and Yep that a page changed, so
they crawl it within minutes. ChatGPT search and Copilot answer from Bing's
index, so this is also how they learn about new pages.

- The key is `6537fa0233c5dc0cca20f9d1f56be989`, served at
  `/6537fa0233c5dc0cca20f9d1f56be989.txt` (`public/`). Keep both in step.
- `scripts/static-pages.mjs` hashes what a crawler reads on every built page:
  the title, meta tags, canonical and language links, the structured data, and
  the text, links and image descriptions. Scripts and asset names are left
  out, so a build that changes only code or styles changes no hash. The
  hashes are published at `/page-fingerprints.json` (noindex, no-cache).
- `worker:production` runs `scripts/indexnow.mjs before`, then the deploy,
  then `scripts/indexnow.mjs after`. Before the deploy it reads the live
  sitemap and fingerprints. After it, it waits for the new fingerprints to be
  served and submits new pages, pages whose hash changed and removed pages.
  IndexNow asks for only changed URLs, so unchanged pages are never sent.
- It never fails a deploy; a problem is printed in the build log.
- By hand: `pnpm run indexnow all` sends the whole sitemap,
  `pnpm run indexnow /pricing /de/pricing` sends those pages, and
  `INDEXNOW_DRY=1` prints instead of sending.

Bing Webmaster Tools has the site as `https://tinyfloor.com/`, which covers
`www`. It reads `https://www.tinyfloor.com/sitemap.xml`. Submissions show
under IndexNow there after a few hours.

## For AI assistants

- `/llms.txt` (https://llmstxt.org): the site, one line a page, grouped as the
  nav is: product, features, teams, use cases, compare, guides. Then what's in
  every office, the FAQ, and the other languages.
- `/llms-full.txt`: every marketing page's own words in English, with the plan
  table, billing notes, comparison tables with the month they were checked,
  every guide in full, and every page's questions. An assistant can answer
  from this one file.
- Both are built from the message files and `LANDINGS` (`src/lib/llms.ts`),
  so a new page or a changed price shows up there with no extra work.
- robots.txt lets every crawler in, AI crawlers included, except the app's
  private pages. Pages carry Organization, WebSite, WebApplication (with the
  three prices), FAQPage and BreadcrumbList structured data.
- Pages are rendered on the server, so a crawler that runs no JavaScript still
  reads everything, FAQ answers included.
