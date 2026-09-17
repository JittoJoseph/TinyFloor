# 04. `tinyfloor-api`

Base URL `https://api.tinyfloor.com/v1`. JSON in, JSON out. Errors are
`{ "error": { "code": "not_a_member", "message": "..." } }` with a matching HTTP
status.

Authentication is the session cookie from `03-auth-and-accounts.md`. "Account"
means a signed-in non-guest user.

## Endpoints

### Auth

| Method | Path | Who | Does |
|---|---|---|---|
| GET | `/auth/google/start` | Anyone | Redirects to Google |
| GET | `/auth/google/callback` | Google | Signs in, redirects back to the site |
| POST | `/auth/guest` | Anyone | Creates a guest session (Turnstile) |
| POST | `/auth/magic-link` | Anyone | Later: sends a sign-in email |
| GET | `/auth/magic-link/verify` | Anyone | Later: signs in from the email |
| POST | `/auth/logout` | Session | Ends the session |
| GET | `/session` | Anyone | `{ user, guest }` or `{ user: null }` |

### Me

| Method | Path | Who | Does |
|---|---|---|---|
| GET | `/me` | Session | Profile, and the workspaces they belong to |
| PATCH | `/me` | Session | Display name, character |
| DELETE | `/me` | Account | Deletes the account (see `03`) |

### Workspaces

| Method | Path | Who | Does |
|---|---|---|---|
| POST | `/workspaces` | Account | Creates a workspace on the Free plan; they become owner |
| GET | `/workspaces/:id` | Member | Name, plan, member count, limit |
| PATCH | `/workspaces/:id` | Owner, admin | Rename |
| DELETE | `/workspaces/:id` | Owner | Deletes the workspace, its rooms and links |
| GET | `/workspaces/:id/members` | Member | Members and roles |
| PATCH | `/workspaces/:id/members/:userId` | Owner | Change role between admin and member |
| DELETE | `/workspaces/:id/members/:userId` | Owner (anyone), admin (members), or themselves | Remove, or leave. The owner can't leave; they transfer first |
| POST | `/workspaces/:id/transfer` | Owner | Makes another member the owner |

### Invites

| Method | Path | Who | Does |
|---|---|---|---|
| POST | `/workspaces/:id/invites` | Owner, admin | `{ role, email? }` → invite token. Only the owner invites admins. Refused if the member limit is reached |
| GET | `/workspaces/:id/invites` | Owner, admin | Pending invites |
| DELETE | `/workspaces/:id/invites/:inviteId` | Owner, admin | Revoke |
| GET | `/invites/:token` | Anyone | Preview: workspace name, inviter |
| POST | `/invites/:token/accept` | Account | Joins. Checks expiry, email match, member limit |

Emailing the invite link comes with magic links. Until then the link is shown
to copy and share.

### Rooms

| Method | Path | Who | Does |
|---|---|---|---|
| GET | `/workspaces/:id/rooms` | Member | Rooms, with how many people are in each right now |
| POST | `/workspaces/:id/rooms` | Owner, admin | `{ name, capacity }` |
| GET | `/rooms/:id` | Member | Name, workspace name, capacity |
| PATCH | `/rooms/:id` | Owner, admin | Rename, capacity |
| DELETE | `/rooms/:id` | Owner, admin | Archives, and disconnects everyone in it |
| POST | `/rooms/:id/guest-links` | Owner, admin | `{ expiresIn }` → link |
| GET | `/rooms/:id/guest-links` | Owner, admin | Active links |
| DELETE | `/rooms/:id/guest-links/:linkId` | Owner, admin | Revoke, and disconnects guests who used it |
| GET | `/guest-links/:token` | Anyone | Preview: room and workspace name |

"How many people are in each" comes from one `presenceCounts(roomIds)` call to
the realtime Worker's `RealtimeAdmin` entrypoint, which asks each `Room` object
(`presenceCount()`). A call wakes a hibernating room briefly; the count is
just `ctx.getWebSockets().length`, so it takes well under a millisecond. The
dashboard fetches counts when it opens, not on a timer.

### Entering rooms

| Method | Path | Who | Returns |
|---|---|---|---|
| POST | `/rooms/:id/ticket` | Member | `{ ticket, url }` |
| POST | `/guest-links/:token/ticket` | Session | `{ ticket, url }` |
| POST | `/lobby/ticket` | Session, guest or account | `{ ticket, url }` |

`url` is `wss://realtime.tinyfloor.com/rooms/<room>`, or
`wss://realtime.tinyfloor.com/lobby` for the lobby. Lobby tickets name the room
`lobby`, and the realtime Worker picks the copy, so the API never talks to the
`LobbyRouter`.

### Calls

| Method | Path | Who | Returns |
|---|---|---|---|
| POST | `/calls/ice-servers` | Session holding a ticket-eligible room | Cloudflare TURN credentials, TTL 4 hours |

Rate limited per user, since each call hits Cloudflare's credential API.

### Billing (later milestone)

| Method | Path | Who | Does |
|---|---|---|---|
| POST | `/billing/checkout` | Owner | `{ workspaceId, plan }` → provider checkout URL |
| POST | `/billing/portal` | Owner | Provider customer portal URL |
| POST | `/billing/webhook` | Provider | Verifies the signature, updates `subscriptions` and the workspace plan |

Downgrades never remove members. They block new invites until the workspace is
under its new limit.

## RPC for other Workers

`tinyfloor-api` exports a `WorkerEntrypoint` for service bindings. These are not
reachable from the internet.

| Method | Caller | Purpose |
|---|---|---|
| `sessionUser(cookieHeader)` | Site, during server rendering | Who is signed in |
| `invitePreview(token)` | Site | Link previews on the invite page |
| `guestLinkPreview(token)` | Site | Link previews on the guest link page |
| `recordUsage(dayTotals)` | Realtime | Daily usage row per room |

## Scheduled work

One Cron Trigger, `0 3 * * *` (daily), runs the retention jobs from
`02-data-model.md`. It stays well under the Free plan's 5 cron triggers.

## Discord webhook

Today every chat message and every join, with a location from `ipwho.is`, goes
to Discord. The API sends nothing to Discord. Only the **public lobby** reports,
from `tinyfloor-realtime`, so abuse there can be spotted; see
`05-realtime-rooms.md`. Nothing from workspace rooms is ever sent.

## What replaces each Java endpoint

| Java | New |
|---|---|
| `POST /api/auth/register`, `/login` | Google sign-in; magic links later |
| `POST /api/auth/guest` | `POST /v1/auth/guest` |
| `POST /api/auth/logout` | `POST /v1/auth/logout` |
| `GET /api/auth/validate`, `/session` | `GET /v1/session` |
| `GET /api/users/me` | `GET /v1/me` |
| `GET /api/users/me/summary` | `GET /v1/me` (workspaces) and `GET /v1/workspaces/:id/rooms` |
| `PUT /api/users/me`, `/me/avatar` | `PATCH /v1/me` |
| `GET /api/users/profile/:id`, `/public` | **Removed.** No public people directory |
| `GET /api/rooms`, `/search` | **Removed.** No public room list |
| `GET /api/rooms/:id` | `GET /v1/rooms/:id` (members and guest-link holders only) |
| `GET /api/rooms/share/:code` | `GET /v1/guest-links/:token` |
| `GET /api/rooms/my-rooms`, `/joined` | `GET /v1/workspaces/:id/rooms` |
| `POST /api/rooms` | `POST /v1/workspaces/:id/rooms` |
| `POST /api/rooms/:id/join`, `/leave` | **Removed.** Presence lives in the room object; entry is a ticket |
| `PUT /api/rooms/:id` | `PATCH /v1/rooms/:id` |
| `DELETE /api/rooms/:id` | `DELETE /v1/rooms/:id` |
| Room passwords | **Removed.** Rooms are private to members; outsiders use guest links |
