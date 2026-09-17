# 05. `tinyfloor-realtime`: rooms and the lobby

## Worker entry

```
GET wss://realtime.tinyfloor.com/rooms/:room?ticket=...
```

1. Reject anything that isn't a WebSocket upgrade.
2. Check `Origin` is the site.
3. Verify the ticket: HMAC signature, `exp`, and `room` equal to `:room`.
4. `env.ROOM.getByName(room).fetch(request)`, with the verified ticket claims
   passed in a header set by the Worker (the client can't set it; the Worker
   overwrites it).

No D1, no API call, no Cloudflare API call. One Worker request per connection.

## `Room` Durable Object

One per workspace room, and one per lobby copy (`lobby-1`, `lobby-2`, ...).

### Accepting a connection

- If `ctx.getWebSockets().length >= cap`, reply with close code 4001
  (`room_full`).
- If the same user is already connected (tag `user:<id>`), close the older
  socket with 4002 (`replaced`). One live connection per person per room.
- `ctx.acceptWebSocket(server, ["user:<id>"])`.
- Build the attachment from the ticket and a spawn tile, and
  `serializeAttachment` it.
- Send `welcome` to the new socket; send `player_joined` to everyone else.
- If this is a lobby copy, tell the `LobbyRouter` the new count.

### Heartbeat without waking

In the constructor:

```ts
ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
```

The client sends the literal text `ping` every 30 seconds. It's answered without
waking the object and without duration charges. This replaces the Java JSON ping.

A cleanly closed connection calls `webSocketClose`. A client that vanishes
without closing (a laptop lid shut, a dropped network) may not be noticed
straight away, so the Java server's 90-second inactivity sweep is replaced
without a timer:

- Whenever the room is awake anyway (any message, join or RPC call), it checks
  `ctx.getWebSocketAutoResponseTimestamp(ws)` for every socket, and closes
  those with no heartbeat for over 90 seconds, broadcasting `player_left`.

A room where everyone has silently vanished stays hibernated with stale sockets
until the platform drops them. That costs nothing, because hibernation isn't
billed.

### Hibernation rules

- **No `setInterval` or `setTimeout` in rooms.** They keep the object in memory.
- **No alarms while people are connected.** Alarms are only used after the last
  person leaves, to write the day's usage totals (one alarm, then nothing).
- **Every message is handled and broadcast immediately.** No batching timer.
- **The constructor does as little as possible,** because it runs on every wake:
  auto-response, and schema creation guarded by `blockConcurrencyWhile`.
- **In-memory caches are optional.** Everything needed after a wake is in
  attachments or room SQLite.

### Leaving

`webSocketClose` and `webSocketError`:
- Leave the seat and meeting (broadcast `stood` and `meeting_member_left`).
- Broadcast `player_left`.
- Update the lobby count if this is a lobby copy.
- If nobody is left, set one alarm a minute later that writes usage totals
  through `env.API.recordUsage`.

### Room RPC for the API

| Method | Purpose |
|---|---|
| `presenceCount()` | People connected, for room lists |
| `disconnectAll(reason)` | Room deleted or archived: close all with 4003 |
| `disconnectGuests(linkId)` | Guest link revoked: close sockets whose ticket came from it |

## Discord, lobby only

Lobby copies (and only lobby copies) report to `DISCORD_WEBHOOK_URL` so abuse in
the free lobby can be spotted:

- A join: name, character, lobby copy, and the country from `request.cf.country`
  (read by the Worker at connect and passed in with the ticket claims).
- A chat message: name, lobby copy, text.

Each event is sent straight away with `ctx.waitUntil`, so it never delays the
room and needs no timer. Discord limits a webhook to about 30 requests a minute,
so each lobby copy sends at most 20 events per minute. Events past that are
counted instead of sent, and the next event that goes out adds
"(12 more skipped)".

Workspace rooms never send anything to Discord.

## Message protocol

JSON text frames `{ "t": "<type>", ...fields }`, except the heartbeat, which is
the plain text `ping` / `pong`. Types are defined once in `shared-protocol/`.

### Client to room

| Type | Fields | Handling |
|---|---|---|
| `move` | `x, y` | Tile must be walkable and at most 2 tiles from the last position; rate limited (below). Leaves any seat. Broadcast `moved` |
| `walk_to` | `x, y` | Click-to-walk destination. Leaves any seat. Broadcast `walking` |
| `sit` | `seat, x, y, meeting?` | Rejected with `sit_rejected` if taken. Broadcast `sat`. With `meeting`, join that table's meeting |
| `stand` | `x, y` | Leave the seat and meeting. Broadcast `stood` |
| `status` | `status` | `available`, `busy`, `away`, `in_call`. Broadcast `status` |
| `chat` | `text` | Up to 500 characters. The room adds the sender. Broadcast `chat`. Not saved |
| `board_sync` | | Reply `board_state` with all strokes |
| `board_draw` | `id, color, size, erase, points` | Validated as today; appended to SQLite; broadcast `board_draw` |
| `board_clear` | | Clears SQLite; broadcast `board_clear` |
| `music_set` | `track, playing, offset` | Saved to `room_state`; broadcast `music` |
| `call` | `kind, to, ...` | Peer-to-peer call signalling, relayed to one person. See `06-calls.md` |
| `sfu` | `op, ...` | Meeting-table media. See `06-calls.md` |

### Room to client

| Type | Fields |
|---|---|
| `welcome` | `self` (spawn tile, character), `players` (everyone else: id, name, character, x, y, status, seat, guest), `music` |
| `player_joined` | player |
| `player_left` | `id` |
| `moved` | `id, x, y` |
| `walking` | `id, x, y` |
| `move_rejected` | `x, y` (where the server has you) |
| `sat` / `stood` | `id, seat` / `id` |
| `sit_rejected` | `seat` |
| `status` | `id, status` |
| `chat` | `id, name, text, at` |
| `board_state` / `board_draw` / `board_clear` | as today |
| `music` | `track, playing, startedAt, offset` |
| `meeting_joined` / `meeting_member_joined` / `meeting_member_left` | as today |
| `call` | relayed signalling with `from, fromName` |
| `sfu` | meeting media responses |
| `error` | `code` |

The whiteboard stays on demand (`board_sync` when opened) rather than inside
`welcome`, because a full board can be large.

### Rate limits inside the room

Kept in the attachment, so they survive hibernation:

| Message | Limit | Over the limit |
|---|---|---|
| `move` | 6 per second (walking is at most ~3.75 tiles/s) | Dropped; `move_rejected` once per second |
| `walk_to`, `sit`, `stand`, `status` | 4 per second combined | Dropped |
| `chat` | 5 per 10 seconds | Dropped with `error: slow_down` |
| `board_draw` | 30 per second | Dropped |
| Anything | 60 per second | Socket closed with 4008 |

Because Cloudflare bills 20 incoming messages as one request, these limits also
cap what a single misbehaving client can cost.

### Close codes

| Code | Meaning | Client does |
|---|---|---|
| 1001, 1006, 1012 | Network drop or deploy | Reconnect with backoff (1s, 2s, 4s, up to 30s), new ticket |
| 4001 | Room full | Show "room is full" |
| 4002 | Replaced by another tab | Show "open in another tab" |
| 4003 | Room deleted or archived | Leave to the dashboard |
| 4004 | Access revoked | Leave |
| 4008 | Too many messages | Reconnect after 30s |

After a reconnect, the client's own position is taken from the server's
`welcome`, and other players are rebuilt from it, which also covers deploys.

## `LobbyRouter` Durable Object

A single object, `getByName("global")`.

- Holds `{ copy: string, count: number, updatedAt: number }` for each lobby copy
  in memory, mirrored to its SQLite.
- `place()`: returns the lowest-numbered copy with fewer than 20 people. When
  all are full, it opens the next number.
- `report(copy, count)`: called by lobby copies on every join and leave.
- Counts older than 10 minutes are treated as zero, in case a copy was evicted
  without reporting.
- It's woken only by joins, leaves and placements, so it is idle almost always.

## Usage totals

Each room tracks peak people and person-minutes in memory while awake. Because
hibernation can drop memory, the totals are also recomputed from `joinedAt` in
the attachments when people leave. They're written once through
`env.API.recordUsage` by the alarm after the room empties, or once a day for a
room that never empties.
