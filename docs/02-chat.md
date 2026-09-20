# 02. Chat

A team cannot work in a room that forgets everything the moment they walk out.
Today we have one transient room chat; what an office needs is a place that
keeps what was said. This is that, built to cost approximately nothing.

## Two kinds of chat, kept apart

| | Nearby | Office chat |
|---|---|---|
| Where | the floor, to whoever is close | channels and direct messages |
| Lives in | the room object, memory only | the office's chat object, SQLite |
| Lasts | seconds — it is speech | until someone deletes it |
| Costs | nothing, ever | one row per message |

This is the line Gather draws too, and it is the right one: transient chat
needs no storage, no history, no unread counts, no retention policy. We keep
what we have on the floor and build the durable one beside it.

## What is in it

- **Channels**, visible to everyone in the office. Not private channels — an
  office of ten does not need walls inside itself, and private channels double
  the membership model for very little.
- **Direct messages**, one to one, private to the pair.
- **Reactions** on any message.
- **Image attachments**, in paid offices (see below).
- Unread marks per channel, and a badge on the rail.

Deliberately not on day one: threads, drafts, rich text beyond links and line
breaks, group DMs, typing indicators, message search, email notifications.
Every one of them is a week of work and a new failure mode; none of them is why
a team would leave Slack open in another tab.

## Nothing exists until it is used

Every office has `#general`. It is not a row in any table — it is the id
`general`, rendered in the sidebar for every office ever created. The first
time someone sends a message in it, the channel row is written and the message
lands. An office nobody talks in costs us one row: the office itself.

| Act | What is written |
|---|---|
| Office created | nothing for chat |
| Someone opens chat | nothing |
| First message in `#general` | the channel row, then the message |
| Someone names a new channel | the channel row (naming is a deliberate act) |
| First DM between two people | the pair's channel row, then the message |

A DM channel's id is derived from the two member ids, sorted and hashed, so
both sides address the same object without a lookup table.

## Where it lives

**One Durable Object per office**, `Chat`, holding that office's channels and
messages in its own SQLite:

```
channels(id TEXT PK, kind TEXT, name TEXT, created_by TEXT, created_at INT)
messages(seq INTEGER PK AUTOINCREMENT, channel TEXT, author TEXT,
         body TEXT, image TEXT, w INT, h INT, at INT)
reads(member TEXT, channel TEXT, seq INT, PRIMARY KEY (member, channel))
reactions(seq INT, member TEXT, emoji TEXT, PRIMARY KEY (seq, member, emoji))
```

Why one object per office and not D1:

- One writer, so `seq` is an ordering without coordination, and history pages
  are `WHERE channel = ? AND seq < ? ORDER BY seq DESC LIMIT 50`.
- The people who need the message are already connected to that object, so
  delivery is a fan-out over sockets that are already open, not a second hop.
- D1's row-write allowance is shared by the whole product; a chatty office
  should not eat the allowance the rest of the platform runs on.
- It is the same shape as `Room`, which we already operate and test.

D1 keeps only what other parts of the system must join against: the office, its
members, their roles. Chat never writes to D1.

## Connections

Chat rides its **own hibernating WebSocket**, opened when the office shell
loads — not when the chat view opens — so unread badges and the activity dot
work while you are on the map.

```
wss://realtime.tinyfloor.com/offices/:officeId/chat?ticket=…
```

The same ticket mechanism as rooms: the API mints a short-lived ticket after
checking membership, the object verifies it and attaches
`{ memberId, name, role }` to the socket.

Hibernation is what makes this free. Ten people with chat connected all day are
ten sockets the runtime holds for us; the object is only billed while it is
awake, which is the millisecond it takes to write a message and fan it out.

| Message | Direction | Cost |
|---|---|---|
| `chat_send` | client → object | 1 DO request, 1 row write |
| `chat_new` | object → everyone connected | free (existing sockets) |
| `chat_history` | client → object | 1 request, ~50 rows read |
| `chat_read` | client → object | 1 request, 1 row upsert, debounced to 2s |

A ten-person office sending fifty messages each a day is 11,000 row-writes a
month against a free allowance of 100,000 **a day**.

## Attachments: images only

Images, compressed in the browser before they ever reach us:

1. The client draws the picked file to a canvas, scales the long edge to
   1,600px, encodes WebP at quality 0.8 — a 4 MB phone photo becomes ~200 KB.
2. The API returns a short-lived presigned `PUT` for R2 with a content-length
   cap, so the upload goes **straight to R2** and never through a Worker.
3. The client sends the message with the object key, width and height, so the
   message renders at the right size before the image loads.
4. R2 serves it from a cached custom domain. R2 has no egress charge, so a
   popular image costs nothing to show.

Keys are `att/{officeId}/{uuid}.webp`: unguessable, not secret. Good enough for
a team photo; documented as such. If a customer ever needs media that is genuinely
private, the upgrade is signed GETs through the API, at the cost of one
request per image.

Limits: 5 MB before compression, one image per message, **paid offices only**.
The button exists in free offices and in the public lobby, and says why when
pressed — showing the shape of the product beats hiding it. The reason is not
the storage bill (a thousand images is less than a cent a month); it is that
anonymous uploads are an abuse surface, and paying offices have a card on file.

## Keeping it small

- Messages are capped at 4,000 characters, and a body that is only whitespace
  is dropped before the write.
- Each channel keeps its last 5,000 messages; the nightly cron trims older ones
  in batches, oldest first, and deletes their R2 objects with them.
- Free offices keep 90 days. Paid offices keep everything inside the 5,000.
- History arrives in pages of 50, cursored on `seq`, never "load everything".
- The client keeps the last page per channel in memory only; a reload asks
  again. No local database to go stale.

## What the screen looks like

Chat is a view in the office shell (`01-app-shell.md`), not a window floating
over the map: the rail on the left, the channel list in the second column with
the presence dock beneath it, and the conversation filling the rest.

- Messages group by author within five minutes, with a date separator between
  days.
- The composer is one line that grows, with attach and emoji, and nothing else.
- `Enter` sends, `Shift+Enter` breaks the line.
- On a phone the second column becomes the whole screen, and picking a channel
  pushes the conversation over it.

## Protocol

New messages in `shared-protocol`, on the chat socket only:

```ts
// client → object
| { t: "chat_send"; channel: string; body: string; image?: Attachment }
| { t: "chat_history"; channel: string; before?: number }
| { t: "chat_read"; channel: string; seq: number }
| { t: "chat_react"; seq: number; emoji: string; on: boolean }
| { t: "chat_channel"; name: string }        // naming one creates it

// object → client
| { t: "chat_ready"; channels: ChannelSummary[] }   // with unread counts
| { t: "chat_new"; channel: string; message: Message }
| { t: "chat_page"; channel: string; messages: Message[]; more: boolean }
| { t: "chat_reacted"; seq: number; emoji: string; by: string; on: boolean }
| { t: "chat_channel"; channel: ChannelSummary }
```

Nearby chat keeps the existing `chat` message on the room socket, unchanged and
unstored.
