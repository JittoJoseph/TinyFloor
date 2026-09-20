# tinyfloor-api

HTTP API for TinyFloor on `api.tinyfloor.com`. The routes are in
`src/index.ts`; each module beside it owns one area.

## Commands

| Command | Does |
|---|---|
| `pnpm dev` | Runs locally on `localhost:8787` with a local D1 |
| `pnpm migrate:local` | Applies migrations to the local D1 |
| `pnpm test` | Runs the tests |
| `pnpm typecheck` | Type checks source and tests |
| `pnpm types` | Regenerates `worker-configuration.d.ts` after changing `wrangler.jsonc` |
| `pnpm deploy` | Applies migrations to `tinyfloor-db`, then deploys |

Pushing to `master` deploys through Workers Builds when
anything in `worker-api/` or `shared-protocol/` changes.

Local secrets go in `.dev.vars`.
