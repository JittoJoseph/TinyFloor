# 08. Cloudflare setup

Everything created outside the code. All of it is set up during development, on
the real hostnames. Wrangler commands are run from the Worker's folder.

## Account

- Workers Free plan to start. Upgrade to Workers Paid ($5/month) when the first
  workspace pays, or when email is needed (see the overview, section 7).

## D1

| Item | How |
|---|---|
| `tinyfloor-db` | `wrangler d1 create tinyfloor-db` |
| Database ID | Into `worker-api/wrangler.jsonc` |
| Migrations | `worker-api/migrations/`, applied by the deploy script |

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
`"script_name": "tinyfloor-realtime"`, so `tinyfloor-realtime` is deployed first.

## Custom domains

| Worker | Hostname |
|---|---|
| `tinyfloor` | `www.tinyfloor.com`, `tinyfloor.com` (existing) |
| `tinyfloor-api` | `api.tinyfloor.com` |
| `tinyfloor-realtime` | `realtime.tinyfloor.com` |
| `tinyfloor-preview` | `preview.tinyfloor.com` |
| `tinyfloor-api-preview` | `api-preview.tinyfloor.com` |
| `tinyfloor-realtime-preview` | `realtime-preview.tinyfloor.com` |

Declared as `routes` with `custom_domain: true` in each `wrangler.jsonc`. The
site's middleware redirects every other host to `www`, so it must let
`preview.tinyfloor.com` through.

## Realtime

Both systems use the same TURN and SFU services, with their own credentials,
because neither service holds anything of ours to keep apart.

| Item | Where | Stored as |
|---|---|---|
| TURN key | Dashboard: Realtime → TURN Server, app `tinyfloor`. Created | `TURN_KEY_ID`, `TURN_KEY_API_TOKEN` secrets on `tinyfloor-api`. Set |
| SFU app | Dashboard: Realtime → Serverless SFU, app `tinyfloor`. Created | `REALTIME_APP_ID`, `REALTIME_APP_SECRET` secrets on `tinyfloor-realtime`. Set |
| TURN key (preview) | app `tinyfloor-preview`. Created | the same two secrets on `tinyfloor-api-preview`. Set |
| SFU app (preview) | app `tinyfloor-dev`, also used for local development. Created | the same two secrets on `tinyfloor-realtime-preview`. Set |

## Turnstile

- Widget `TinyFloor`, hostname `tinyfloor.com`, managed mode. Created.
- Site key (public): `0x4AAAAAAE6AVMD41Jo_qCYG`, set as
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in the site's build settings.
- Secret: `TURNSTILE_SECRET` on `tinyfloor-api`. Set.
- Preview has its own widget, `TinyFloor preview`, hostname
  `preview.tinyfloor.com`: site key `0x4AAAAAAE9nazlV53rNBQgP` in the preview
  site's build settings, secret on `tinyfloor-api-preview`. Set.
- Local development uses Cloudflare's test keys instead: site key
  `1x00000000000000000000AA` and secret `1x0000000000000000000000000000000AA`
  (in `.dev.vars`), which always pass.

## Google OAuth (Google Cloud, not Cloudflare)

- OAuth consent screen: TinyFloor, scopes `openid`, `email`, `profile`.
- Web client with redirect URIs:
  - `https://api.tinyfloor.com/v1/auth/google/callback`
  - `http://localhost:8787/v1/auth/google/callback`
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` secrets on `tinyfloor-api`.
- This needs a Google account with Google Cloud access, so it is set up by hand.

## Secrets

| Secret | Worker | Notes |
|---|---|---|
| `TICKET_SECRET` | api, realtime | 32 random bytes, same value on both |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | api | |
| `TURNSTILE_SECRET` | api | |
| `TURN_KEY_ID`, `TURN_KEY_API_TOKEN` | api | |
| `REALTIME_APP_ID`, `REALTIME_APP_SECRET` | realtime | |
| `DISCORD_WEBHOOK_URL` | realtime | Lobby only |

Set with `wrangler secret put <NAME>`. Never committed. Local values go in each
Worker's `.dev.vars`, which is gitignored.

## Workers Builds

One Git connection per Worker, root directory set to its folder, build watch
paths limited to that folder and `shared-protocol/`:

| Worker | Branch |
|---|---|
| `tinyfloor` | `master` |
| `tinyfloor-api` | `master` |
| `tinyfloor-realtime` | `master` |
| `tinyfloor-preview` | `dev` |

The two preview Workers behind the site, `tinyfloor-api-preview` and
`tinyfloor-realtime-preview`, have no Git connection: they are deployed by hand
with `pnpm run deploy:preview` when their code changes.

Git connections are made in the dashboard.

## Observability

- `"observability": { "enabled": true }` in each `wrangler.jsonc` for Workers
  Logs.

## Existing resources, unchanged

- R2 bucket `tinyfloor` and its public URL (licensed art).
- `public/_headers` on the site.
- DNS for `tinyfloor.com`.
