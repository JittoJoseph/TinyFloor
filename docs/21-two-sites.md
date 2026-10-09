# Two sites: www and app

TinyFloor's frontend has two parts, each a Worker of its own built from its own
folder:

| Folder | Worker | Address | What it serves |
|---|---|---|---|
| `marketing-frontend/` | `tinyfloor` | www.tinyfloor.com (and preview.tinyfloor.com) | The home page, pricing, features, guides, legal pages, llms.txt, the sitemap |
| `app-frontend/` | `tinyfloor-app` | app.tinyfloor.com (and app-preview.tinyfloor.com) | The lobby, offices, invitations, signing in, making an office, the account, admin |
| `web-shared/` | — | — | What both use: translations, styles, shared components and lib code, fonts and icons, the build scripts |

Why: people who use TinyFloor every day open app.tinyfloor.com and are in their
office, the way Slack opens your workspace. Marketing traffic (crawlers,
visitors from search) and the people working in offices no longer share a
Worker, its CPU limits or its deploys. A change to the landing pages doesn't
rebuild the app, and the other way round.

## Where you land

- **www.tinyfloor.com** stays the site. Visitors are never sent to the app on
  their own; "Get started", "Sign in" and "Lobby" link there.
- **app.tinyfloor.com/** decides for you: signed out, the sign-in; signed in
  and in an office, straight into it (the one you were last in, else the
  busiest); in none, the page to make an office or join one by its link.

## Old links

Every app address on www (and on the bare domain, which goes to www first)
gets a 308 to the same path and query on app: `/invite/…`, `/office/…`,
`/lobby…`, `/join?…`, `/dashboard`, `/auth?redirect=…`, with or without a
locale prefix. Links shared before the split keep working, and the redirect is
permanent so search engines move the lobby's ranking with it. The app sends
anything that isn't its own back to www the same way.

The list of app paths is `APP_PATH` in `web-shared/src/lib/site.ts`; both
middlewares read it. On the site, `Link` (`marketing-frontend/src/lib/i18n/navigation.ts`)
turns a link to an app path into a plain link to the app in the reader's
language, so a click never takes the redirect.

## Search

- The site keeps everything it had, minus the lobby, which moved.
- The app is `noindex` everywhere (a header from the middleware and from
  `cf-worker.mjs`) except `/lobby` in each language, which keeps its canonical,
  hreflang and structured data, now at app.tinyfloor.com. The app has its own
  robots.txt and a sitemap with just the lobby.
- Social cards stay files of the site; the app's pages point to them there.

## Sessions and languages

The session cookie is set by the API on `.tinyfloor.com`, so signing in on
either part signs you in on both (on preview the cookie is the API host's, and
both preview sites call the same API).

Neither site ever picks a language for the reader: no redirects by browser
language, no remembered choice. The address says it: `/pricing` is English,
`/es/pricing` Spanish (`localeDetection: false` in `lib/i18n/routing.ts`).
Every link keeps the language of the page it's on, including links between the
two sites (`appHref` / `siteHref` in `lib/site.ts`), so a reader on a /es page
only ever lands on /es pages. The language menu is the way to change it. Old
app links on www keep whatever prefix they had.

## Builds

Each Worker has its own Workers Builds project with its folder as the root and
watch paths for that folder, `web-shared/` and `shared-protocol/`, so a push
only builds the parts it touched. `tools/deploy.mjs` still sends master to
production and every other branch to preview.

Locally: `pnpm dev` in `marketing-frontend` (port 3000) and in `app-frontend`
(port 3001), with `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_APP_URL` pointing at
each other (see `.env.example`).

## What is shared, and how

- **Pages both sites have** (the document and its metadata, the 404s, the
  error page, the manifest) live in `web-shared/src/shell`. Each app's route
  files are one or two lines that re-export them and say which site it is:
  the app's `[locale]/layout.tsx` passes `APP_URL`, the site's `SITE_URL`, so
  canonicals and language links name the right address.
- **Translations** are per site: `web-shared/messages/<locale>.json` holds what
  both say (common, the language menu, metadata, 404, legal, shell, home),
  `marketing-frontend/messages` the site's (landing pages, pricing, FAQ, guides)
  and `app-frontend/messages` the app's. Each app's `lib/i18n/request.ts`
  merges the shared file with its own, so each worker carries only its own
  words, and each app's types (`src/global.d.ts`) only know its own keys.
- **Components, lib code and styles** live in `web-shared/src`. `@/` looks in the app's own `src` first, then in
  `web-shared/src`. Only files both apps use belong there; a file one app
  uses lives in that app. The one deliberate override is
  `lib/i18n/navigation.ts`: each app has its own, and the site's turns links to
  app paths into links to the app.
- **Config and the worker:** `web-shared/next-config.mjs` is the Next config
  both build with (the app adds that its server leaves Phaser out), and
  `web-shared/scripts/static-worker.mjs` is the worker in front of OpenNext (the
  app adds its shared office pages and its noindex).
- **Packages:** each app lists only what it uses. The site has no Phaser and
  no Paddle (checkout is `app-frontend/src/lib/checkout.ts`; the plan list it
  shows is shared).
- **Public files:** `web-shared/public` is copied into each app's `public` at
  build time. The licensed art comes from R2: the app gets all of it, the site
  only the characters (`fetch-assets.mjs --only=characters/`).

`web-shared` has no packages of its own. Before every dev server and build,
`web-shared/node_modules` is linked to the building app's
(`web-shared/scripts/link-modules.mjs`, run by `fetch-assets.mjs`), and webpack
looks in the app's own `node_modules` first, so there is one copy of React. Don't
map bare imports through tsconfig `paths` instead: OpenNext's bundler reads
those too, picks up the full `next` package and its native image library, and
the worker fails to build.
