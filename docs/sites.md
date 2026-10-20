# Two sites, one shared folder

The frontend is two Workers: the site (`marketing-frontend/`,
www.tinyfloor.com) and the app (`app-frontend/`, app.tinyfloor.com), with
what both use in `web-shared/`. This is what isn't obvious from the folders.

## Why two

People who use TinyFloor every day open app.tinyfloor.com and are in their
office, the way Slack opens your workspace. Crawlers and visitors from search
no longer share a Worker, its CPU limits or its deploys with people working,
and a landing-page change doesn't rebuild the app.

## Links that must keep working

- Every app path on www (and the bare domain) gets a **308 to the same path
  on app**: `/invite/…`, `/office/…`, `/lobby…`, `/join?…`, `/auth?redirect=…`,
  with or without a locale. Links shared before the split keep working, and
  the lobby's ranking moved with it. The app sends anything not its own back
  to www the same way. The list is `APP_PATH` in `web-shared/src/lib/site.ts`.
- The app is `noindex` everywhere except `/lobby` (the demo office) in each
  language.
- **No site ever picks a language for the reader**: no redirect by browser
  language, no remembered choice (`localeDetection: false`). The address says
  it, and every link keeps the page's language, including links between the
  two sites (`appHref` / `siteHref`).
- The session cookie is set on `.tinyfloor.com`, so signing in on either signs
  you in on both.

## Build gotchas

- **The two frontends and `web-shared` are one pnpm workspace** (20
  October): `pnpm-workspace.yaml` and `pnpm-lock.yaml` at the repository
  root, versions named once in its `catalog`, and `web-shared` a package
  with the same versions as the frontends, so every package is a single
  copy in the store that all three resolve to. Install from the root, or
  from either frontend. The Workers keep their own lockfiles and
  `pnpm-workspace.yaml`, so their installs stay small. Before this,
  `web-shared/node_modules` was a link to whichever frontend last ran, and
  only webpack's custom resolving kept one copy of React.
- **Both frontends build and run on Turbopack.** Its root is the
  repository's (`turbopack.root`, and `outputFileTracingRoot` with it).
  Packages the server build leaves out (Phaser) are aliased to
  `web-shared/empty.cjs`: CommonJS, because Turbopack rejects a named import
  that an empty ES module provably lacks.
- **Don't map bare imports through tsconfig `paths`.** OpenNext's bundler
  reads them too, picks up the full `next` package and its native image
  library, and the worker fails to build.
- `@/` looks in the app's own `src` first, then `web-shared/src`. Only files
  both apps use belong in `web-shared`. The deliberate override is
  `lib/i18n/navigation.ts`: the site's turns links to app paths into plain
  links to the app, so a click never takes the redirect.
- Translations are split: `web-shared/messages` for what both say,
  each app's `messages` for its own. Each worker carries only its own words.
- The licensed art comes from R2 at build time, never from the repo: the app
  gets all of it, the site only the characters.
- Each Worker has its own Workers Builds project watching its folder,
  `web-shared/` and `shared-protocol/`. `tools/deploy.mjs` sends master to
  production and every other branch to preview.

## Build times (20 October)

Measured from Workers Builds' own records, the last ten builds of each:

- **Builds run one at a time.** The account is on the Workers Free plan,
  which builds one project at a time (Workers Paid builds six), so a push
  that touches all four builds them in a row: about ten minutes before the
  last is live, and an API change can wait five minutes behind the site.
- **The site takes ~5 minutes**, and 133 seconds of it is uploading about
  5,500 changed files: every built page is kept twice (Next's cache entry
  and the plain files `static-pages.mjs` serves), and each build's id is in
  all of them, so all 864 pages count as changed on every deploy. Building
  the 946 pages took 48 seconds on one worker; Workers Builds has two cores
  and Next uses one fewer than there are, so the config asks for two (28 s).
- **The app takes ~3 minutes**: install ~20 s, compile ~21 s warm (50 s
  when the config changes and webpack's cache is cold), type check ~10 s,
  build traces and OpenNext's bundling ~35 s, upload ~15 s.
- **The Workers take ~25 seconds** each; their time is the queue.
- The site watched `shared-protocol/`, which it only takes types from, so
  every protocol change rebuilt it; it no longer does.
- **Turbopack builds the app in 35 s locally against webpack's 83 s**
  (compile 11 s against 40 s, and no separate trace step), the site in 73
  s, and keeps a build cache in `.next/cache`, which Workers Builds
  restores. With the old link pointing at the site, a Turbopack build of the
  app took `next-intl`, `posthog-js` and others from the site's copies,
  which is why the workspace came first.

## Getting onto the floor fast

Measured on 15 October 2026 from India, opening an office on app.tinyfloor.com:
about 9 seconds to the floor, with the loader gone after 6 and a blank panel
after that.

- **The API sat next to the visitor, the database in ENAM.** Each D1 query
  was a ~220 ms round trip from India; `/session` (one query) took ~320 ms,
  `/me` and an office's overview (several) ~780 ms. `/plans`, which reads no
  database, took ~100 ms. So the production API is placed in `aws:us-east-1`
  (`worker-api/wrangler.jsonc`): one trip to it, then queries next door.
  Preview's database is in APAC, so preview isn't placed.
- **Everything waited for the step before:** session, then the office, then
  the floor's code (319 KB), then its map and sprites, then a room ticket,
  then the room. Now the code, files, ticket and office are all asked for at
  once when an office opens, and on the lobby's door while a name is being
  picked (`lib/floorWarmup.ts`). The ticket is good for a minute, so an early
  one is used only if it's under 40 seconds old.
- **Both tilesets were downloaded twice**, once as an image for the map and
  once as a sheet for furniture. One sheet does both.
- **The map and sprites were re-checked on every visit** (`max-age=0`). They
  keep their names, so they can't be immutable; they're kept 10 minutes and
  served stale while being re-checked for a day (`web-shared/public/_headers`).
- **One loader until the floor shows.** It used to go once the code arrived,
  seconds before the room said where you are. `floor_entered` carries
  `load_ms`, from the floor being asked for to it showing.
