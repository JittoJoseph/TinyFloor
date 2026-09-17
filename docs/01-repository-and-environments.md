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
  REALTIME -> service binding to tinyfloor-realtime, entrypoint RealtimeAdmin
            (presence counts, closing rooms, removing a revoked link's guests)

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

| | Site | API | Realtime |
|---|---|---|---|
| Live | `www.tinyfloor.com` | `api.tinyfloor.com` | `realtime.tinyfloor.com` |
| Preview of the branch | `preview.tinyfloor.com` | same live API | same live realtime |
| Local | `localhost:3000` | `localhost:8787` | `localhost:8788` |

The preview uses a subdomain of `tinyfloor.com` rather than a `workers.dev` URL,
because the session cookie is scoped to `.tinyfloor.com`. On `workers.dev` the
site and API would be different sites and the cookie would not be sent.

## Environments

**One live environment for the new backend.** `tinyfloor-api`,
`tinyfloor-realtime` and `tinyfloor-db` are created and deployed during
development on their real hostnames. Until the merge, only
`preview.tinyfloor.com` and local development use them, so they double as the
testing environment. There is no separate staging copy for now; one can be added
after launch with an `env.staging` block in each `wrangler.jsonc`.

**The preview site** is a second Worker, `tinyfloor-preview`, built from
`feature/cloudflare-platform` with the same `frontend-nextjs/` code. It exists
only until the merge, then it's deleted.

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

| Worker | Root | Branch | Deploy |
|---|---|---|---|
| `tinyfloor` | `frontend-nextjs` | `master` | `pnpm run deploy:worker` (unchanged) |
| `tinyfloor-preview` | `frontend-nextjs` | `feature/cloudflare-platform` | `pnpm run build:worker && pnpm run deploy:preview` (the `preview` environment in `wrangler.jsonc`), with build variables `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_REALTIME_URL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `NEXT_PUBLIC_SITE_URL=https://preview.tinyfloor.com`. Created |
| `tinyfloor-api` | `worker-api` | `feature/cloudflare-platform`, then `master` after the merge | `pnpm run deploy` (applies D1 migrations first) |
| `tinyfloor-realtime` | `worker-realtime` | `feature/cloudflare-platform`, then `master` after the merge | `pnpm run deploy` |

Deploying the backend Workers from the branch is safe: the live site doesn't use
them until the merge.

Build watch paths are set per Worker so that a change in one folder does not
rebuild the others.
