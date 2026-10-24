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

New copy is translated with Gemini (`gemini-3.5-flash` on Vertex, credentials
in the root `.env.local`), giving each language its own published copy of a
similar page as the reference for voice, terms and number format, and
rejecting any answer whose shape, `<em>` marks or link paths differ from the
English.

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
- **Still to request in Search Console.** Requested on 24 October, before
  the day's quota ran out: the remote work tools guide (English, Portuguese;
  Japanese was already indexed), and the happy hour, one-on-one,
  retrospective, async, onboarding checklist and remote team management
  guides in English, plus the happy hour guide in Portuguese. Next, one or two
  days' worth: the Portuguese one-on-one, retrospective, async, onboarding
  and management guides, then the Japanese and Spanish ones. The sitemap was
  resubmitted the same day, so the rest will be found without asking.
- Deploys don't notify Bing and the other IndexNow engines: after a deploy
  that changes pages, run `pnpm run indexnow <path…>` (or `all`) from
  `marketing-frontend`. Under Git Bash, paths like `/pt/pricing` turn into
  Windows paths and IndexNow refuses them all (422); `MSYS_NO_PATHCONV=1`
  stops that but also breaks pnpm itself, so run
  `MSYS_NO_PATHCONV=1 node scripts/indexnow.mjs <path…>` instead.
