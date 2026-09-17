# 10. Build order

Each milestone is finished when its checks pass on staging, not locally. Later
milestones assume the earlier ones.

## M0. Scaffold

- `worker-api/`, `worker-realtime/`, `shared-protocol/` created, with
  `wrangler.jsonc` (production and staging), TypeScript, tests.
- Staging D1, custom domains and Workers Builds connections.
- A health route on both Workers.

**Done when:** both Workers deploy to staging from the branch, and local
`wrangler dev` runs both with working service bindings and local D1.

## M1. Room core

- `Room` object: tickets verified, accept, `welcome`, `player_joined`,
  `player_left`, `move`, `walk_to`, `status`, `chat`, heartbeat auto-response,
  rate limits, close codes.
- A temporary ticket issuer on the API (fixed test users) so rooms can be tested
  before auth exists.

**Done when:**
- Two browsers see each other move and chat.
- An idle room hibernates: with the load test page, no duration is billed while
  nobody moves (checked in the Durable Objects metrics), and heartbeats don't
  wake it.
- Measured messages per walking minute match `05-realtime-rooms.md`.

## M2. Room features

- Seats and meeting membership, whiteboard (SQLite), jukebox, lobby router and
  lobby copies.

**Done when:** everything the current room does, except calls, works on staging
with 3 players, and the 21st lobby visitor lands in `lobby-2`.

## M3. Accounts

- D1 schema, Google sign-in, guest sessions, Turnstile, sessions, logout,
  `/session`, `/me`.
- Real tickets replace the temporary issuer.

**Done when:** sign-in, guest entry and sign-out work across `staging` and
`staging-api` with the cookie, and no auth request exceeds 10ms of CPU in
Workers Logs.

## M4. Workspaces

- Workspaces, members, roles, invites, rooms, guest links, room tickets,
  presence counts, room deletion disconnecting people.

**Done when:** an owner creates a workspace and a room, invites a second Google
account, both enter the room, a guest link lets a guest in, and revoking the
link removes the guest.

## M5. Frontend on the new platform

- New API client, auth page, dashboard, onboarding, invite and guest-link
  pages, lobby page, game client on the new protocol and reconnects.
- `/rooms` and `/people` removed with redirects; sitemap and `llms.txt`
  updated.

**Done when:** `staging.tinyfloor.com` runs end to end without the Java
backend, in all 18 languages, on desktop and phone.

## M6. Proximity calls

- ICE servers endpoint, TURN in `CallManager`, bitrate caps, signalling over
  `call` messages.

**Done when:** a call connects normally, and also with `iceTransportPolicy:
"relay"` forced, which proves TURN works for firewalled users.

## M7. Meeting tables on the SFU

- `SfuMeeting`, the room's SFU broker, simulcast layers, tile-driven layer
  choice, screen share, leaving and reconnecting.

**Done when:** a 3-person meeting with a screen share runs on staging, the load
test confirms `q` layers for grid tiles and `f` for the enlarged one, and
standing up stops that person's tracks.

## M8. Operations

- Daily cron cleanup, usage totals, Discord summaries, Workers Logs, rate limits
  on sensitive endpoints.
- A maintenance switch: a variable on the `tinyfloor` Worker that makes the
  site's middleware show a "back in a few minutes" page, for the cutover. It
  has to be added to master's frontend too, since that's what is live on the
  day.
- Marketing copy updated for private rooms and the lobby (18 languages).

**Done when:** a week of staging use leaves expired rows cleaned up and
`usage_daily` filled in.

## M9. Migration rehearsal

- `tools/migrate-mongo-to-d1/`, run against a copy of production data into
  staging, with the checks from `09-data-migration-and-cutover.md`.

**Done when:** the rehearsal runs clean twice in a row.

## M10. Cutover

- The runbook in `09-data-migration-and-cutover.md`.

**Done when:** production runs on Cloudflare only, and Railway is off.

## Billing

Not required for cutover. It can follow as its own milestone once the platform
is live: provider choice, checkout, webhook, plan limits enforced (invites
already refuse past the member limit), and pricing copy.
