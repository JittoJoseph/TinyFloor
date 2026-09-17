# 01. Repository and environments

## Folders and Workers

| Folder | Worker | Contents |
|---|---|---|
| `frontend-nextjs/` | `tinyfloor` | Next.js on OpenNext, unchanged hosting |
| `worker-api/` | `tinyfloor-api` | HTTP API, D1 migrations, cron cleanup |
| `worker-realtime/` | `tinyfloor-realtime` | WebSocket entry, `Room` and `LobbyRouter` Durable Objects, SFU broker |
| `shared-protocol/` | none | TypeScript types for the WebSocket protocol and API payloads, imported by the three packages above |
| `backend-springboot/` | none after cutover | Deprecated Java backend, kept for reference |

`shared-protocol/` is plain TypeScript with no runtime dependencies. Each
package imports it through a relative path or a `tsconfig` path alias, so there
is no package publishing and no workspace tooling to maintain.

Each Worker folder is self-contained: its own `package.json`, `wrangler.jsonc`,
`tsconfig.json`, `src/` and `test/`.

## Bindings

```
tinyfloor (frontend)
  API -> service binding to tinyfloor-api (RPC, used during server rendering)
  ASSETS -> static assets (existing)

tinyfloor-api
  DB -> D1 database tinyfloor-db
  ROOM -> Durable Object namespace Room, script_name tinyfloor-realtime
  LOBBY -> Durable Object namespace LobbyRouter, script_name tinyfloor-realtime

tinyfloor-realtime
  ROOM -> Durable Object class Room (defined here)
  LOBBY -> Durable Object class LobbyRouter (defined here)
  API -> service binding to tinyfloor-api (RPC, for usage totals)
```

The API reaches the Durable Objects directly through bindings that point at the
realtime Worker's classes. It never goes through the public realtime hostname.

## Why the Durable Objects live in `tinyfloor-realtime`

Deploying a Worker that defines Durable Objects disconnects every WebSocket
connected to them. The realtime Worker is deployed rarely, and only for changes
to rooms. API and site deploys never drop anyone from a room.

## Hostnames

| Environment | Site | API | Realtime |
|---|---|---|---|
| Production | `www.tinyfloor.com` | `api.tinyfloor.com` | `realtime.tinyfloor.com` |
| Staging | `staging.tinyfloor.com` | `staging-api.tinyfloor.com` | `staging-realtime.tinyfloor.com` |
| Local | `localhost:3000` | `localhost:8787` | `localhost:8788` |

Staging uses subdomains of `tinyfloor.com` rather than `workers.dev` URLs,
because the session cookie is scoped to `.tinyfloor.com`. On `workers.dev` the
site and API would be different sites and the cookie would not be sent.

## Environments

Each `wrangler.jsonc` defines a top-level production configuration and an
`env.staging` block. Staging has its own D1 database (`tinyfloor-db-staging`),
its own Durable Object namespaces (automatic per environment), its own secrets,
and its own Turnstile and Google OAuth settings.

Staging is used to rehearse the data migration and cutover before production.

## Local development

- `wrangler dev` in `worker-api/` and `worker-realtime/`, with local D1 and local
  Durable Objects. Service bindings between the two work when both run
  locally.
- `pnpm dev` in `frontend-nextjs/` as today, pointed at the local API and
  realtime URLs through `.env`.
- Secrets for local use go in each Worker's `.dev.vars`, which is gitignored.
- The licensed art keeps coming from `private-assets/` as it does now.

## Tests

- `@cloudflare/vitest-pool-workers` in both Workers, running against local D1
  and Durable Objects.
- The load test page from the cost measurements
  (`frontend-nextjs/public/loadtest.html`, git-excluded) is reused to confirm
  hibernation and message counts before cutover. See `10-build-order.md`.

## Deploys

Cloudflare Workers Builds, one connection per Worker, each with its folder as
the root directory:

| Worker | Root | Build | Deploy |
|---|---|---|---|
| `tinyfloor` | `frontend-nextjs` | `pnpm run build:worker` | `pnpm run deploy:worker` |
| `tinyfloor-api` | `worker-api` | `pnpm run build` | `pnpm run deploy` (runs `wrangler d1 migrations apply` first) |
| `tinyfloor-realtime` | `worker-realtime` | `pnpm run build` | `pnpm run deploy` |

While the branch is being built, the new Workers deploy from
`feature/cloudflare-platform` to staging only. Production for the new Workers is
set up during cutover (see `09-data-migration-and-cutover.md`).

Build watch paths are set per Worker so that a change in one folder does not
rebuild the others.
