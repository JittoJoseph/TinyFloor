# 07. The Next.js app

The site is the `tinyfloor` Worker: Next.js on OpenNext, 18 languages through
next-intl, Phaser for the floor.

## Configuration

`frontend-nextjs/.env.production` and the Worker's build variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.tinyfloor.com/v1` |
| `NEXT_PUBLIC_REALTIME_URL` | `wss://realtime.tinyfloor.com` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile site key |
| `NEXT_PUBLIC_SITE_URL` | `https://www.tinyfloor.com` |

The preview site carries the same four, pointed at `api-preview`,
`realtime-preview` and the preview Turnstile widget.

`wrangler.jsonc` has a service binding `API` to `tinyfloor-api`, used during
server rendering.

## API client

`src/lib/api.ts`, written against `04-api.md`:

- `fetch` with `credentials: "include"`. The session is a cookie; no token
  is ever stored in the browser.
- Typed from `shared-protocol/`.
- Server components go through `env.API` (RPC) instead of `fetch`, via a helper
  that picks the binding on the server and `fetch` in the browser.

## Pages

| Page | What it is |
|---|---|
| `/` and the marketing pages | The landing site, in 18 languages |
| `/auth` | Email and password. Sign-up asks name, email, password — no character; that is asked at the door |
| `/dashboard` | Your offices. One office opens straight into it; none shows the way to make one |
| `/space/:id` | The office |
| `/space/:id/people` | Members, roles and pending invites |
| `/space/:id/settings` | Rename, hand over, leave or close the office |
| `/account` | Your name, email and password |
| `/create` | Name an office, then make an account if there isn't one |
| `/lobby` | The free public lobby, placed across copies by `Presence` |
| `/room/:id` | A room. Gets a ticket from the API, then connects |
| `/join/:token` | A guest link, with a server-rendered preview |
| `/invite/:token` | An office invitation, with a preview |
| `/rooms`, `/people` | Gone. They 301 to `/dashboard` (or `/lobby`) and `/` — they were indexed once, so they redirect rather than 404 |

`09-app-shell.md` replaces the `/space/:id` pages with a rail and views; this
table is what exists today.

## Game client

### `RoomSocket`

- Connects to `NEXT_PUBLIC_REALTIME_URL/rooms/:room?ticket=…`.
- Heartbeat: the text `ping` every 30 seconds, not JSON, so it never wakes the
  object.
- Reconnects with backoff and a fresh ticket, following the close codes in
  `05-realtime-rooms.md`.

### The managers

| File | What it does |
|---|---|
| `MessageHandler.ts` | Routes every server message |
| `MovementManager.ts` | Sends a heading while walking, applies `moved` immediately |
| `SeatManager.ts` | `sit`, `stand`, and the rejections |
| `WhiteboardManager.ts` | Strokes as fractions of the board, batched every 100ms |
| `JukeboxManager.ts` | The shared player |
| `CallManager.ts` | Proximity calls, peer-to-peer, ICE servers from the API |
| `SfuMeeting.ts` | Meeting-table media (`06-calls.md`) |
| `CallCards.tsx` | Tells `SfuMeeting` which tiles are enlarged or hidden, to pick quality |

## Inside a room

Everything floating over the floor shares one look, from
`components/room/ui.tsx`: the same surface, the same 40px round buttons, the
same 13px sentence-case type. No uppercase labels, no second size of anything.

- **Top row:** where you are on the left (a dot, the room, the office, and a
  headcount once someone else is in), and what you can do on the right —
  **Invite** and **Leave**. Both sides are the same height, so they read as one
  bar. Reconnecting turns the dot amber and says so, rather than adding a
  second notice in the middle of the screen.
- **Invite** hands the link to whatever suits the device (`lib/share.ts`): the
  share sheet on a touch screen, the clipboard on a desktop, where the button
  says "Link copied" for a moment. A browser that allows neither falls back to
  a hidden field.
- **Control bar:** status, then microphone and camera, then the ways to talk.
  A phone drops what only a desktop needs — the speaker unless a call is on,
  and the device picker — so the row never runs out of room.
- **Panels** (chat, whiteboard, jukebox) sit above the bar, and on a phone
  spread to both edges instead of floating in a corner.

## Entry flows

Every door is the same two steps: your name, then your character. An account
already has a name, so it only picks a character. Both are kept in this browser
(`lib/identity.ts`), so nobody types their name twice.

- **Lobby:** `/lobby` → name → character (Turnstile) → guest session →
  `POST /lobby/ticket` → room.
- **Guest link:** `/join/:token` → preview → name → character → session →
  `POST /guest-links/:token/ticket` → room.
- **Invitation:** `/invite/:token` → preview → name → character → *then* sign up
  or sign in, with the name already filled in → accept → the office.
- **Member:** office → character → `POST /rooms/:id/ticket` → room.
- **Making an office:** `/create` → name it → sign up (the name waits in the
  browser) → the office is made → `/space/:id`.

The entry panel (preview on one side, one question on the other) is reused by
all of them.
