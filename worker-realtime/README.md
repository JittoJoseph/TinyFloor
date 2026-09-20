# tinyfloor-realtime

Rooms and the public lobby for TinyFloor on `realtime.tinyfloor.com`: the
WebSocket entry point and the `Room` and `LobbyRouter` Durable Objects. See
`docs/05-realtime-rooms.md`.

## Commands

| Command | Does |
|---|---|
| `pnpm dev` | Runs locally on `localhost:8788` |
| `pnpm test` | Runs the tests |
| `pnpm typecheck` | Type checks source and tests |
| `pnpm types` | Regenerates `worker-configuration.d.ts` after changing `wrangler.jsonc` |
| `pnpm deploy` | Deploys |

Deploying disconnects everyone in every room, so this Worker is only deployed for
changes to rooms. Pushing to `master` deploys through
Workers Builds when anything in `worker-realtime/` or `shared-protocol/` changes.

Local secrets go in `.dev.vars`.
