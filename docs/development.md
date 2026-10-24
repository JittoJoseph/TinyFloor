# Development debt

What we know is missing or behind, so it isn't forgotten. Not a log of what
was built: when an item is done, delete it.

## Languages

Nothing is missing in any language today: every page, article, guide and free
tool is in all 18. A language without a page's article shows the shorter page,
never English text under a translated headline; the icebreaker lists are typed
per locale, so a new language fails the typecheck until it has one.

When a guide is written English-first, give it `locales` in
`web-shared/src/lib/guides.ts` until the rest are done: elsewhere it's not
found and nothing links to it. List it here while it waits.

When a page or guide is translated:

- Table rows take the language's own number format (`1.152 $`, `1 152 $`,
  `$1,152`, `US$ 1.152`) and the site's own word for the floor.
- In-text links (`[words](/path)`) only point at pages that exist in that
  language. Running a shape check against English (same sections, items,
  numbering and link count) catches dropped links and miscounted lists.
- Older guides link to newer ones by a sentence appended at the same place in
  every language, so a new link means a sentence in all 18.

## Pages

- **The Wonder.me page** serves a product that closed in 2023; decide whether
  to keep it. It's the last page without an article, so it's the only one
  still on the short points layout (`points` in `landings.pages.wonder`).
- **The About page** has a monogram where the founder's photo would go, until
  there's a portrait to use.

## Search Console and Bing

- Search Console takes only a handful of manual indexing requests a day, on a
  rolling 24 hours rather than a reset at midnight; space them out. Pages
  beyond that wait for the sitemap.
- **Still to request in Search Console**, most searched first: the remote work
  tools guide (English, Japanese, German), then the happy hour, one-on-one,
  retrospective, async and onboarding checklist guides in English, then the
  same in the other languages. Earlier lists of untouched pages are covered by
  the sitemap now; check Pages > Indexed before requesting old ones.
- Deploys don't notify Bing and the other IndexNow engines: after a deploy
  that changes pages, run `pnpm run indexnow <path…>` (or `all`) from
  `marketing-frontend`. Under Git Bash, set `MSYS_NO_PATHCONV=1`, or paths like
  `/pt/pricing` turn into Windows paths and IndexNow refuses them all (422).
