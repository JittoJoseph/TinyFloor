# 05. `tinyfloor-realtime`: rooms and the lobby

## Worker entry

```
GET wss://realtime.tinyfloor.com/rooms/:room?ticket=...
GET wss://realtime.tinyfloor.com/lobby?ticket=...
```

1. Reject anything that isn't a WebSocket upgrade.
2. Check `Origin` is the site.
3. Verify the ticket: HMAC signature, `exp`, and `room` equal to `:room` (or
   `lobby` for `/lobby`).
4. For the lobby, ask `Presence` for a copy (`lobby-1`, `lobby-2`, ...).
5. `env.ROOM.getByName(room).fetch(request)`, with the verified ticket claims
   passed in a header set by the Worker (the client can't set it; the Worker
   overwrites it).

No D1, no API call, no Cloudflare API call. One Worker request per connection,
plus one router call for the lobby.

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
- Tell `Presence` the new headcount.

### Heartbeat without waking

In the constructor:

```ts
ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
```

The client sends the literal text `ping` every 30 seconds. It's answered without
waking the object and without duration charges.

A cleanly closed connection calls `webSocketClose`. A client that vanishes
without closing (a laptop lid shut, a dropped network) may not be noticed
straight away, so dead sockets are swept without a timer:

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
- Tell `Presence` the new headcount.
- Add this person's time to the room's pending usage, and write the day's totals
  to D1 when the room empties (see `02-data-model.md`).

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
| `move` | `x, y, d?` | The tile you're on, and while walking a heading (0 to 7, clockwise from east). Must be on the map; rate limited (below). Leaves any seat. Broadcast `moved` |
| `walk_to` | `x, y` | Click-to-walk destination. Leaves any seat. Broadcast `walking` |
| `sit` | `seat, x, y, meeting?` | Rejected with `sit_rejected` if taken. Broadcast `sat`. With `meeting`, join that table's meeting |
| `stand` | `x, y` | Leave the seat and meeting. Broadcast `stood` |
| `status` | `status` | `available`, `busy`, `away`, `in_call`. Broadcast `status` |
| `chat` | `text` | Up to 500 characters. The room adds the sender. Broadcast `chat` to everyone else; the sender already has it. Not saved |
| `board_sync` | | Reply `board_state` with all strokes |
| `board_draw` | `id, color, size, erase, points` | Validated, appended to SQLite, broadcast as `board_draw` |
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
| `moved` | `id, x, y, d?` |
| `walking` | `id, x, y` |
| `move_rejected` | `x, y` (where the server has you) |
| `sat` / `stood` | `id, seat, x, y` / `id` |
| `sit_rejected` | `seat` |
| `status` | `id, status` |
| `chat` | `id, name, text, at` |
| `board_state` / `board_draw` / `board_clear` | `strokes` / stroke plus `by` / `by` |
| `music` | `track, playing, startedAt, offset` |
| `meeting_joined` / `meeting_member_joined` / `meeting_member_left` | `meeting, members` / `id, name` / `id` |
| `call` | relayed signalling with `from, fromName` |
| `sfu` | meeting media responses |
| `error` | `code` |

The whiteboard stays on demand (`board_sync` when opened) rather than inside
`welcome`, because a full board can be large.

### Rate limits inside the room

Kept in the attachment, so they survive hibernation:

| Message | Limit | Over the limit |
|---|---|---|
| `move` | 12 per second (a straight walk sends about one a second) | Dropped quietly; `move_rejected` only for a tile off the map |
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

## Walking

A walk is sent as a heading, not as every tile. While someone walks, everyone
else keeps them walking that way at the same speed, stopping at walls, so:

- Starting to walk, or turning, sends one `move` with `d`.
- The walker also walks its own shadow copy, exactly as the others draw it, and
  sends a correction only when the two are more than a tile apart.
- Stopping sends one `move` without `d`, at the tile they stopped on.
- A click-to-walk sends `walk_to` alone: the others find the same path.

Positions are tile centres. Crossing a room costs about two messages instead of
one per tile, which is what the room object is billed for.

## `Presence` Durable Object

A single object, `getByName("global")`.

- Keeps one SQLite row per room: name, people, last updated.
- `report(room, people)`: called by every room on each join and leave.
- `counts(rooms)`: what the dashboard shows, so listing rooms doesn't wake a
  Durable Object per room.
- `place()`: the lowest-numbered lobby copy with fewer than 20 people; when all
  are full it opens the next number. It counts the new visitor straight away, so
  a burst of arrivals spreads out before the rooms report back.
- Counts older than 10 minutes are ignored, in case a room was evicted without
  reporting.

## Usage totals

Each room keeps pending totals in its own SQLite, adds a person's time as they
leave (from `joinedAt` in the attachment, which survives hibernation), and adds
the lot to `usage_daily` in D1 when the room empties, or after an hour in a room
that never does. `tinyfloor-realtime` has a D1 binding for that one table.
