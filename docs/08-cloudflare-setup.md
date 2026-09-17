# 08. Cloudflare setup

Everything to create outside the code, for staging first and then production.
Wrangler commands are run from the Worker's folder.

## Account

- Workers Free plan to start. Upgrade to Workers Paid ($5/month) when the first
  workspace pays, or when email is needed (see the overview, section 7).

## D1

| Item | How |
|---|---|
| `tinyfloor-db-staging` | `wrangler d1 create tinyfloor-db-staging` |
| `tinyfloor-db` | `wrangler d1 create tinyfloor-db` |
| Database IDs | Into `worker-api/wrangler.jsonc` |
| Migrations | Applied by the deploy script |

## Durable Objects

No resources to create. Declared in `worker-realtime/wrangler.jsonc`:

```jsonc
"durable_objects": {
  "bindings": [
    { "name": "ROOM", "class_name": "Room" },
    { "name": "LOBBY", "class_name": "LobbyRouter" }
  ]
},
"migrations": [
  { "tag": "v1", "new_sqlite_classes": ["Room", "LobbyRouter"] }
]
```

SQLite-backed classes only, which is also the only kind the Free plan allows.
`worker-api/wrangler.jsonc` binds the same classes with
`"script_name": "tinyfloor-realtime"`.

## Custom domains

| Worker | Staging | Production |
|---|---|---|
| `tinyfloor` | `staging.tinyfloor.com` | `www.tinyfloor.com`, `tinyfloor.com` (existing) |
| `tinyfloor-api` | `staging-api.tinyfloor.com` | `api.tinyfloor.com` |
| `tinyfloor-realtime` | `staging-realtime.tinyfloor.com` | `realtime.tinyfloor.com` |

Declared as `routes` with `custom_domain: true` in each `wrangler.jsonc`. The
middleware redirect to `www` must allow `staging.tinyfloor.com`.

## Realtime

| Item | Where | Stored as |
|---|---|---|
| TURN key | Dashboard: Realtime → TURN | `TURN_KEY_ID`, `TURN_KEY_API_TOKEN` secrets on `tinyfloor-api` |
| SFU app | Dashboard: Realtime → SFU | `REALTIME_APP_ID`, `REALTIME_APP_SECRET` secrets on `tinyfloor-realtime` |

One of each for staging and production, so staging traffic is visible separately.

## Turnstile

- One widget covering `staging.tinyfloor.com`, `www.tinyfloor.com` and
  `localhost`, in managed mode.
- Site key: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in the site's build settings.
- Secret: `TURNSTILE_SECRET` on `tinyfloor-api`.

## Google OAuth (Google Cloud, not Cloudflare)

- OAuth consent screen: TinyFloor, scopes `openid`, `email`, `profile`.
- Web client with redirect URIs:
  - `https://api.tinyfloor.com/v1/auth/google/callback`
  - `https://staging-api.tinyfloor.com/v1/auth/google/callback`
  - `http://localhost:8787/v1/auth/google/callback`
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` secrets on `tinyfloor-api`.

## Secrets

| Secret | Worker | Notes |
|---|---|---|
| `TICKET_SECRET` | api, realtime | 32 random bytes, same value on both |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | api | |
| `TURNSTILE_SECRET` | api | |
| `TURN_KEY_ID`, `TURN_KEY_API_TOKEN` | api | |
| `REALTIME_APP_ID`, `REALTIME_APP_SECRET` | realtime | |
| `DISCORD_WEBHOOK_URL` | api | Optional |
| `ADMIN_TOKEN` | api, realtime | Only for the migration import; removed afterwards |

Set with `wrangler secret put <NAME>` (and `--env staging`). Never committed.
Local values go in `.dev.vars`.

## Workers Builds

One Git connection per Worker, root directory set to its folder, build watch
paths limited to that folder and `shared-protocol/`. Staging deploys from
`feature/cloudflare-platform`; production is switched on during cutover.

## Observability

- `"observability": { "enabled": true }` in each `wrangler.jsonc` for Workers
  Logs.
- Head sampling at 100% on staging, lower on production if log volume nears the
  free limit.

## Existing resources, unchanged

- R2 bucket `tinyfloor` and its public URL (licensed art).
- `public/_headers` on the site.
- DNS for `tinyfloor.com`.
