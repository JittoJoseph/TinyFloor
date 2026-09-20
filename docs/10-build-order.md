# 10. Build order

Each milestone is finished when its checks pass against the live backend Workers
(and, from M5, on `preview.tinyfloor.com`), not only locally. Later milestones
assume the earlier ones.

## M0. Scaffold

- `worker-api/`, `worker-realtime/`, `shared-protocol/` created, with
  `wrangler.jsonc`, TypeScript and tests.
- `tinyfloor-db` created; custom domains `api.tinyfloor.com` and
  `realtime.tinyfloor.com`; `TICKET_SECRET` set on both Workers.
- A health route on both Workers.

**Done when:** both Workers are deployed and answer on their hostnames, and local
`wrangler dev` runs both with working service bindings and local D1.

## M1. Room core

- `Room` object: tickets verified, accept, `welcome`, `player_joined`,
  `player_left`, `move`, `walk_to`, `status`, `chat`, heartbeat auto-response,
  stale-socket check, rate limits, close codes.
- A temporary ticket issuer on the API, only enabled locally, so rooms can be
  tested before auth exists.

**Done when:**
- Two clients see each other move and chat through `realtime.tinyfloor.com`.
- An idle room hibernates: with the load test page, no duration is billed while
  nobody moves (checked in the Durable Objects metrics), and heartbeats don't
  wake it.
- Measured messages per walking minute match `05-realtime-rooms.md`.

## M2. Room features

- Seats and meeting membership, whiteboard (SQLite), jukebox, lobby router,
  lobby copies, lobby-only Discord reports.

**Done when:** everything the current room does, except calls, works with 3
clients, and the 21st lobby visitor lands in `lobby-2`.

## M3. Accounts

- D1 schema, Google sign-in, guest sessions, Turnstile, sessions, logout,
  `/session`, `/me`.
- Real tickets replace the temporary issuer.

**Done when:** sign-in, guest entry and sign-out work from localhost and from
the preview site, and no auth request exceeds 10ms of CPU in Workers Logs.

## M4. Workspaces

- Workspaces, members, roles, invites, rooms, guest links, room tickets,
  presence counts, room deletion disconnecting people.

**Done when:** an owner creates a workspace and a room, invites a second Google
account, both enter the room, a guest link lets a guest in, and revoking the
link removes the guest.

## M5. Frontend on the new platform

- `tinyfloor-preview` Worker on `preview.tinyfloor.com`, built from the branch.
- New API client, auth page, dashboard, onboarding, invite and guest-link
  pages, lobby page, game client on the new protocol and reconnects.
- `/rooms` and `/people` removed with redirects; sitemap and `llms.txt`
  updated.

**Done when:** `preview.tinyfloor.com` runs end to end without the Java backend,
in all 18 languages, on desktop and phone.

## M6. Proximity calls

- TURN key, ICE servers endpoint, TURN in `CallManager`, bitrate caps,
  signalling over `call` messages.

**Done when:** a call connects normally, and also with `iceTransportPolicy:
"relay"` forced, which proves TURN works for firewalled users.

## M7. Meeting tables on the SFU

- SFU app, `SfuMeeting`, the room's SFU broker, simulcast layers, tile-driven
  layer choice, screen share, leaving and reconnecting.

**Done when:** a 3-person meeting with a screen share runs on the preview site,
the load test confirms `q` layers for grid tiles and `f` for the enlarged one,
and standing up stops that person's tracks.

## M8. Operations

- Daily cron cleanup, usage totals, Workers Logs, rate limits on sensitive
  endpoints.
- Marketing copy updated for private rooms and the lobby (18 languages).
**Done when:** a week of preview use leaves expired rows cleaned up and
`usage_daily` filled in.

**Status (2026-09-17):** built and deployed. Cron cleanup and usage totals are
live (the first `usage_daily` row came from the preview lobby); `AUTH_LIMIT`
guards sign-up, sign-in and guest creation; marketing copy is updated in all 18
languages. Waiting on the week of preview use.

## M9. Account migration rehearsal

- `tools/migrate-users-to-d1/`, run against a copy of production accounts into
  a local D1, with the checks from `09-data-migration-and-cutover.md`.

**Done when:** the rehearsal runs clean twice in a row.

**Status (2026-09-20):** done, and the accounts are in. 19 accounts in MongoDB,
10 with an email, all imported into the live D1 and verified. The import is
additive (`INSERT OR IGNORE`), so it is run again on the day to pick up anyone
who signs up on the old system in between.

**Status (2026-09-17):** two clean runs in a row and a carried-over
password signed in locally. The 9 of 18 production accounts without an email
(username sign-in on the Java backend) are dropped; they can register again.

## M10. Cutover

- The runbook in `09-data-migration-and-cutover.md`: import accounts, merge.

**Done when:** the live site runs on Cloudflare only, Railway is off, and
`tinyfloor-preview` is deleted.

## Billing

Not required for cutover. It follows as its own milestone once the platform is
live: provider choice, checkout, webhook, plan limits enforced (invites already
refuse past the member limit), and pricing copy.
