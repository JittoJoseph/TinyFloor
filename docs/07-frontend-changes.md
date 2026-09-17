# 07. Frontend changes

The site stays on the `tinyfloor` Worker. What changes is how it signs people in,
what it shows, and what it talks to.

## Configuration

`frontend-nextjs/.env` and the Worker's build settings:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.tinyfloor.com/v1` |
| `NEXT_PUBLIC_REALTIME_URL` | `wss://realtime.tinyfloor.com` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile site key |

Removed: `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_WS_URL`.

`wrangler.jsonc` gets a service binding `API` to `tinyfloor-api`, used during
server rendering.

## API client

`src/lib/api.ts` is rewritten against `04-api.md`:
- `fetch` with `credentials: "include"`; no token in `localStorage`.
- Typed with `shared-protocol/`.
- Server components call `env.API` (RPC) instead of `fetch`, through a small
  helper that picks the binding on the server and `fetch` in the browser.

Removed from the client: JWT storage, `validateToken`, register and login forms.

## Pages

| Page | Today | After |
|---|---|---|
| `/` and marketing pages | Unchanged at cutover | Copy that promises public rooms or a people directory is updated (see below) |
| `/auth` | Username and password | "Continue with Google". Magic link later |
| `/dashboard` | Profile, created and joined rooms, recent collaborators | Workspaces: rooms with live counts, members, invites, plan. Onboarding: "Create your office" when they have none |
| `/rooms` | Public room directory | **Removed.** Redirects to `/dashboard` for accounts, `/lobby` otherwise |
| `/people` | Public people directory | **Removed.** Redirects to `/` |
| `/create-room` | Anyone creates a public room | Creates a room in a workspace; without one, onboarding first |
| `/join` | Join by room id or share code | `/join/:token` for guest links, `/invite/:token` for workspace invites, both with server-rendered previews |
| `/lobby` | The `public-room` room | The free lobby, placed by `LobbyRouter` |
| `/room/:id` | Room by id | Member rooms. Gets a ticket from the API, then connects |
| `sitemap.xml`, `llms.txt` | List `/rooms` and `/people` | Those entries removed |

The directory pages were server-rendered for SEO. Removing them drops indexed
URLs, so they return a 301 to their replacement rather than a 404.

## Game client

### `WebSocketManager`

- Connects to `NEXT_PUBLIC_REALTIME_URL/rooms/:room?ticket=...`.
- Heartbeat: sends the text `ping` every 30 seconds, not JSON.
- Reconnects with backoff and a fresh ticket, following the close codes in
  `05-realtime-rooms.md`.
- Message names and fields move to the new protocol (`t` instead of `type`,
  `x`/`y` instead of `tileX`/`tileY`).

### Other managers

| File | Change |
|---|---|
| `MessageHandler.ts` | New message names; `welcome` replaces `space-joined` |
| `MovementManager.ts` | Handles `moved` immediately (no batch) and `move_rejected` |
| `SeatManager.ts` | `sat`, `stood`, `sit_rejected` |
| `WhiteboardManager.ts` | Same flow, new names |
| `JukeboxManager.ts` | `music` instead of `music_state` |
| `CallManager.ts` | ICE servers from the API; caps; peer-to-peer only for proximity calls |
| `SfuMeeting.ts` (new) | Meeting-table media from `06-calls.md` |
| `CallCards.tsx` | Tells `SfuMeeting` which tiles are enlarged or hidden, to pick layers |

## Entry flows

- **Lobby:** `/lobby` → guest name and character (Turnstile) or signed-in
  account → `POST /lobby/ticket` → room.
- **Guest link:** `/join/:token` → preview → name and character → session →
  `POST /guest-links/:token/ticket` → room.
- **Invite:** `/invite/:token` → preview → sign in with Google → accept →
  dashboard.
- **Member:** dashboard → room card → `POST /rooms/:id/ticket` → room.

The existing entry panel (preview, character picker, name) is reused for all
three.

## Marketing copy that changes

Some copy describes the current sandbox and becomes untrue. Update it in 18
languages at cutover:
- The "Rooms / listed for everyone / always on" moment on the home page.
- Comparison tables and FAQs that say rooms are public, or that there's a
  people directory.
- "Free" statements stay true for the lobby and the Free plan; pricing copy
  arrives with billing.
