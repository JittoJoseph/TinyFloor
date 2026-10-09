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
both preview sites call the same API). Each site keeps its own language
cookie; links between the two always carry the locale prefix, so the pick
crosses over.

## Builds

Each Worker has its own Workers Builds project with its folder as the root and
watch paths for that folder, `web-shared/` and `shared-protocol/`, so a push
only builds the parts it touched. `tools/deploy.mjs` still sends master to
production and every other branch to preview.

Locally: `pnpm dev` in `marketing-frontend` (port 3000) and in `app-frontend`
(port 3001), with `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_APP_URL` pointing at
each other (see `.env.example`).

`web-shared` has no packages of its own. Before every dev server and build,
`web-shared/node_modules` is linked to the building app's
(`web-shared/scripts/link-modules.mjs`, run by `fetch-assets.mjs`), and webpack
looks in the app's own `node_modules` first, so there is one copy of React. Don't
map bare imports through tsconfig `paths` instead: OpenNext's bundler reads
those too, picks up the full `next` package and its native image library, and
the worker fails to build.
