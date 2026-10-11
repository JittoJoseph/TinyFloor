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

- **Don't map bare imports through tsconfig `paths`.** OpenNext's bundler
  reads them too, picks up the full `next` package and its native image
  library, and the worker fails to build. Instead `web-shared/node_modules` is
  linked to the building app's before every build
  (`web-shared/scripts/link-modules.mjs`), and webpack looks in the app's own
  `node_modules` first, so there's one copy of React.
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
