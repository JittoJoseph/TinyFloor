# TinyFloor on Cloudflare: platform plan

Three Workers, Durable Objects for live rooms, D1 for accounts and teams, and
Realtime TURN and SFU for calls, all within free allowances until there are
paying teams.

## 1. Services and folders

| Folder (repo root) | Worker name | Job |
|---|---|---|
| `frontend-nextjs/` (existing) | `tinyfloor` | Next.js site. Server rendering calls the API through a **service binding** |
| `worker-api/` | `tinyfloor-api` | Stateless HTTP: auth, workspaces, rooms, invites, billing webhooks, issuing call credentials. Owns **D1** and its migrations |
| `worker-realtime/` | `tinyfloor-realtime` | WebSocket entry point plus the **Durable Object classes** (rooms, lobby router), and the SFU broker |

TURN and SFU need no folders or servers of their own: they're Cloudflare API
calls made from these Workers, with keys stored as secrets.

**Why separate realtime from the API:** deploying a Worker that hosts Durable
Objects disconnects every WebSocket. Keeping them separate means shipping an API
or UI change never kicks people out of their rooms.

Service binding calls **cost nothing extra**; they only count toward the
per-request subrequest limit. Optionally, a small `shared-protocol/` folder can
hold the message types used by both the frontend and the realtime Worker.

## 2. Domains, API and auth

- **Hostnames:** `www.tinyfloor.com` → `tinyfloor`, `api.tinyfloor.com` →
  `tinyfloor-api`, `realtime.tinyfloor.com` → `tinyfloor-realtime`.
- **Sessions:** an opaque token in an HttpOnly, Secure, SameSite=Lax cookie on
  `.tinyfloor.com`, stored hashed in D1 so sessions can be revoked. Browser calls
  to the API use CORS with credentials, allowing only `www`.
- **The free plan allows 10ms of CPU per HTTP request.** Classic password hashing
  (bcrypt, PBKDF2) won't fit, and it's also the less secure option. So:
  - **Google sign-in first.** It's mostly network waiting, which doesn't count
    as CPU time, and ID-token checks use WebCrypto.
  - **Magic-link email later.** Email sending is **Workers Paid only** (it's in
    beta), so it waits for the $5 plan or an external free-tier provider.
  - **Guests** get a lightweight guest session, valid only for the lobby and
    guest-link rooms.
- **Turnstile** (free) on guest joins and sign-ups keeps bots out of the free
  lobby.
- **Existing password accounts:** carried over by email, and people sign in with
  Google or a magic link from then on.

## 3. Data split

| Where | What |
|---|---|
| **D1** (free: 5M rows read/day, 100k written/day, 5 GB) | users, sessions, workspaces, memberships and roles, invites, rooms (metadata, visibility), guest links, subscriptions, daily usage totals |
| **Durable Object SQLite, one per room** (free: 5 GB total, 1 GB per object) | whiteboard strokes, recent chat, jukebox state, seats |
| **WebSocket attachments** (16 KB each) | live presence: position, character, status. Kept in the room object, never written to D1 |
| **R2** (existing) | licensed art; uploads later |

The rule is to **never write per-move data to D1**: its free plan allows only
100k writes a day.

## 4. Real-time rooms on Durable Objects

**Connecting:**
1. The API checks membership and issues a **short-lived signed room ticket**
   (HMAC, ~60s).
2. The browser connects to `wss://realtime.tinyfloor.com/rooms/{id}`.
3. The Worker verifies the ticket with WebCrypto (under 1ms, no database read),
   then hands the socket to `env.ROOM.getByName(roomId)`.

**Inside the room object**, using the Hibernation API:
- `ctx.acceptWebSocket(ws, [userId])` lets the object sleep while everyone stays
  connected.
- **The heartbeat is answered by `setWebSocketAutoResponse`,** which per the docs
  replies "without waking WebSockets in hibernation and incurring billable
  duration charges". So idle players cost nothing.
- **Movement is broadcast on receipt, with no timers.** The docs warn that
  timers and alarms prevent hibernation, so the Java server's 50ms broadcast
  timer must not be ported.
- **Movement is rate-limited per socket to walking speed,** so a misbehaving
  client can't run up message costs.
- `webSocketClose` removes the player and tells the lobby router.
- **The client reconnects automatically** with a fresh ticket, which also covers
  deploys.

**Public lobby:** a tiny `LobbyRouter` object assigns people to `lobby-1`,
`lobby-2`, and so on, capped at 20 each. Extra lobby copies only exist while
they're needed.

## 5. Video calls

| Call type | How | Cost |
|---|---|---|
| Proximity calls and small groups (≤4) | Peer-to-peer as today, **plus TURN**. The API mints short-lived ICE credentials, and signalling goes over the room WebSocket | Only firewalled users use the relay, drawing on the 1,000 GB/month free |
| **Meeting tables** (6+ camera meetings, screen shares) | **Realtime SFU.** The room object holds the app secret and creates sessions and tracks, since the SFU has no concept of rooms. Clients publish with **simulcast** (several quality layers) and bitrate caps (~1 Mbps camera, ~1.5 Mbps screen); viewers pull small layers for the grid and the high layer only for the enlarged card or active speaker. Hidden tiles stop receiving video | $0.05/GB egress, sharing the 1,000 GB free. **TURN is free when used with the SFU** |

**Why not RealtimeKit or LiveKit:** RealtimeKit costs **$0.002 per video
participant-minute** with no free allowance listed, so about $0.72 for a
6-person meeting hour. The raw SFU costs ~$0.36 with thumbnail layers, or
nothing inside the free 1,000 GB. LiveKit Cloud measured ~2.5–3× the raw SFU,
and it's a second vendor.

## 6. Other Cloudflare pieces

- **Cron Triggers** (5 free): clean up expired sessions, invites and guests, and
  reconcile lobby counts.
- **Workers Logs:** debugging.
- **Static assets:** "free and unlimited", so only server rendering and API calls
  count toward the 100k requests/day.
- **Not needed:** KV (its free write limit is tight, and D1 plus Durable Objects
  cover it), Queues, Containers.

## 7. Free budget, and when to pay $5

**What triggers the $5 Workers Paid plan:**
- more than 100k Worker requests a day across all three Workers
- regular errors from exceeding 10ms CPU during server rendering
- more than ~28 awake room-hours a day (13,000 GB-s)
- more than 100k D1 writes a day
- or wanting invite and magic-link **emails**

**Recommendation:** stay free until the first paying team, then upgrade. The
first subscription covers it.

**Rough cost per paying room** once on Paid, from our measurements:

| Item | Monthly cost |
|---|---|
| Durable Object for a busy room | ~$1 |
| SFU for a daily 30-minute 6-person standup | ~$4, or $0 inside the free 1,000 GB |
| TURN relay | ~$0–1 |
| **Total** | **≈ $1–6 against $9** |

## 8. How the migration runs

On the development branch, with the Java backend left untouched:

1. **Scaffold:** folders, wrangler configs, D1 database, local multi-Worker dev
   with service bindings, `vitest-pool-workers` tests.
2. **Room parity:** the room object speaks today's WebSocket protocol, apart from
   the heartbeat change and the broadcast timer. The frontend can then switch
   between Java and Workers with one environment variable for side-by-side
   testing.
3. **TURN credentials endpoint.** This could also ship to master early as a small
   standalone fix.
4. **API and D1 on the new model:** Google sign-in, guest sessions, workspaces,
   private rooms, invite links, lobby routing, Turnstile.
5. **SFU meeting tables.**
6. **Carry over data and cut over:** move users by email, point the domains at
   the new Workers, keep Railway running briefly as a fallback. The Java code
   stays in the repo.

## Sources

- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Durable Objects limits](https://developers.cloudflare.com/durable-objects/platform/limits/)
- [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)
- [WebSocket Hibernation best practices](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)
- [DurableObjectState API (auto-response)](https://developers.cloudflare.com/durable-objects/api/state/)
- [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- [Service bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/)
- [Static assets billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)
- [Realtime SFU introduction](https://developers.cloudflare.com/realtime/sfu/introduction/)
- [Realtime SFU simulcast](https://developers.cloudflare.com/realtime/sfu/simulcast/)
- [Realtime pricing](https://developers.cloudflare.com/realtime/sfu/pricing/)
- [Realtime TURN](https://developers.cloudflare.com/realtime/turn/)
- [RealtimeKit pricing](https://developers.cloudflare.com/realtime/realtimekit/pricing/)
- [Email Service](https://developers.cloudflare.com/email-service/)
- [Rate limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
- [OpenNext for Cloudflare](https://opennext.js.org/cloudflare)
