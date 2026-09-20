# 06. Calls

Two paths:

| Situation | Media path |
|---|---|
| Proximity calls (walk up, tap to call), up to 4 people | Peer-to-peer, with Cloudflare TURN as the fallback |
| Sitting at a meeting table | Cloudflare Realtime SFU, whatever the number of people |

Meeting tables always use the SFU, even with 2 people. Switching one live call
between peer-to-peer and SFU when a fifth person sits down would be fragile.
Small SFU meetings use very little data.

## Proximity calls: peer-to-peer with TURN

### ICE servers

1. When a room loads, the client calls `POST /v1/calls/ice-servers`.
2. The API calls Cloudflare's `generate-ice-servers` with `TURN_KEY_ID` and
   `TURN_KEY_API_TOKEN`, TTL 4 hours, and returns the list unchanged. It
   includes `stun:stun.cloudflare.com` and TURN over UDP, TCP and TLS on 443.
3. The client caches the list until 15 minutes before expiry, then refetches.

The Google STUN servers are removed.

The browser tries direct routes first, so TURN is only used when a direct
connection fails, which is how firewalled users get through. Cloudflare bills
only what it relays to those users, from the shared 1,000 GB/month free.

### Signalling

Invite, accept, decline, signal, add, end — all carried by the
room object's `call` message:

```json
{ "t": "call", "kind": "signal", "to": "<userId>", "data": { "sdp": "..." } }
```

The room relays it to `user:<to>` with `from` and `fromName` added. If that
person isn't connected, the room replies `{ "t": "call", "kind": "end", "from": "<to>" }`.

`CallManager` keeps its fixed transceivers (audio, camera, screen) and
`replaceTrack`. Signalling messages are not squeezed into 64 KB: Durable
Objects accept messages up to 32 MiB.

### Caps for peer-to-peer

`RTCRtpSender.setParameters` on every sender:
- Camera: `maxBitrate` 1,000,000, and scaled down to 640x360 when more than 2
  people are in the call.
- Screen: `maxBitrate` 1,500,000, 15 fps, `contentHint = "detail"`.

Measured today without caps: ~1.7 Mbps per camera stream. Capping protects
uploads and TURN usage.

## Meeting tables: Realtime SFU

The SFU has no rooms, only sessions and tracks. The `Room` object is the broker:
it holds `REALTIME_APP_ID` and `REALTIME_APP_SECRET`, calls the SFU API, and
keeps a registry of who publishes which track at each table.

### Registry kept by the room (in memory, rebuilt from attachments)

```ts
interface MeetingMember {
  userId: string;
  sessionId: string;          // the member's SFU session
  tracks: { mid: string; name: string; kind: "audio" | "camera" | "screen" }[];
}
```

A meeting only exists while people sit at the table, so this never needs to
survive the object being evicted: when the object wakes after hibernation, the
tables' members reconnect their SFU sessions (below).

### Joining a table

1. The client sends `sit` with `meeting`. The room broadcasts
   `meeting_member_joined`.
2. The client creates an `RTCPeerConnection` using the ICE servers from the API,
   adds its microphone, and its camera with **simulcast**:
   ```ts
   sendEncodings: [
     { rid: "h", maxBitrate: 900_000 },
     { rid: "l", maxBitrate: 150_000, scaleResolutionDownBy: 4, maxFramerate: 20 }
   ]
   ```
   Two qualities, not three: a card is either the enlarged one or small, and
   everything about them lives in `frontend-nextjs/src/lib/media.ts`.
3. The client sends `{ t: "sfu", op: "publish", offer, tracks: [{ mid, kind }] }`.
4. The room creates an SFU session (`/sessions/new`), then publishes the tracks
   (`/sessions/:id/tracks/new` with the offer), stores them in the registry,
   and replies `{ t: "sfu", op: "published", answer, sessionId }`.
5. The room tells the other members:
   `{ t: "sfu", op: "tracks", userId, tracks }`.

### Watching others

1. For each other member's tracks, the client sends
   `{ t: "sfu", op: "subscribe", tracks: [{ userId, kind, quality }] }`.
2. The room calls `/sessions/:id/tracks/new` with the remote track names and
   `simulcast.preferredRid`, and relays the SFU's offer back.
3. The client answers with `{ t: "sfu", op: "answer", answer }`; the room
   forwards it with `/sessions/:id/renegotiate`.

### Choosing quality

| Card | Quality |
|---|---|
| Enlarged, on a screen wider than 767px | `high` |
| Small, set aside, or anything on a phone | `low` |

Changes go through `{ t: "sfu", op: "quality", userId, kind, mid, quality }`.
The room calls `/tracks/update` with the new `preferredRid`; Cloudflare requests
a keyframe on its own.

Screen shares work the same way: captured at up to 720p and 10 fps, published in
both qualities, and watched at `low` until someone enlarges them.

Peer-to-peer calls have no SFU to choose for them, so the viewer asks with
`signal: { want: { camera, screen } }` and the sender turns its own encoder down
to the same two profiles.

### Leaving a table

- `stand`, walking away or disconnecting: the room closes that member's tracks
  (`/tracks/close`), removes them from the registry, and tells the others with
  `{ t: "sfu", op: "gone", userId }`.
- The client closes its peer connection.

### When the room object restarts during a meeting

After an eviction or deploy, clients reconnect their WebSocket, get `welcome`,
see they are still seated, and redo "joining a table". Media is interrupted for
a few seconds, the same as a network blip.

## Costs and guardrails

| Measured (worst-case video) | Per hour |
|---|---|
| 6-person meeting, everyone watched at `high` | ~20 GB (~$1.00 after the free 1,000 GB) |
| 6-person meeting, `low` except one enlarged card | ~5 GB (~$0.25) |

Guardrails:
- The quality table above is the main lever: most cards are small most of the
  time, and phones never ask for more.
- Cameras at meeting tables default to off for new people, but remember each
  person's last choice.
- `sfu_minutes` are recorded per room per day (`usage_daily`), so heavy usage by
  a workspace is visible and can be priced.
- (Proposal) The Free plan's meeting tables allow video for up to 4 cameras;
  paid plans have no cap.

## Testing

The load test page used for the cost measurements is extended to:
- sit clients at a meeting table and confirm SFU tracks flow;
- read `outbound-rtp` and `inbound-rtp` stats per layer and confirm the
  expected bitrates;
- confirm peer-to-peer calls still connect with TURN forced
  (`iceTransportPolicy: "relay"`).

## Messages as built

Peer-to-peer signalling: `{ t: "call", kind, to, data? }` where `kind` is
`invite`, `accept`, `decline`, `signal`, `add` or `end`. The room relays
`{ t: "call", kind, from, fromName, data }`. For `add`, `data` is `{ id }` and the
room fills in the added person's name itself.

Meeting-table media, all `{ t: "sfu", op, ... }`. Track kinds are `mic`, `camera`
and `screen`, one of each per person; the SFU track name is the kind.

| Client sends | Room replies or broadcasts |
|---|---|
| `publish { sdp, tracks: [{ mid, kind }] }` | `published { sdp }` to the sender; `tracks { userId, kinds }` to the table |
| `unpublish { kinds }` | `untracks { userId, kinds }` to the table |
| `subscribe { tracks: [{ userId, kind, layer? }] }` | `offer { sdp, tracks: [{ userId, kind, mid }] }` |
| `answer { sdp }` | nothing; forwarded to the SFU as a renegotiation |
| `layer { userId, mid, layer }` | `offer` only if the SFU asks for renegotiation |
| `unsubscribe { mids }` | nothing; the tracks stop straight away |
| (sits at a table) | `tracks` for each member already publishing |
| (stands, walks off or disconnects) | `gone { userId }` to the table; the room closes their tracks |

Errors come back as `{ op: "error", code }`, for example `not_in_meeting` or
`no_tracks`. SFU operations are limited to 10 per second per person.

Tested against the real SFU with two headless Chrome clients: the camera
published three layers (1280x720, 640x360, 320x180), the watcher received
320x180 at `q` and 1280x720 after switching to `f`, and `gone` arrived when the
publisher stood up. A relay-only peer connection through Cloudflare TURN also
connected.
