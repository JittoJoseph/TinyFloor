# TinyFloor platform docs

TinyFloor runs on Cloudflare: Workers, Durable Objects, D1 and Realtime.
Documents 01–08 are the system as it stands; 09–13 are where it is going.
(`backend-springboot/` is the retired Java backend, kept for reference only.)

## Direction

- Live runs from `master`. The next sprint is built on `dev` and tried on
  `preview.tinyfloor.com`, which is a whole second system with its own
  database.
- **An office is a floor.** One office, one room, two roles. Nobody creates
  rooms.
- **Membership is the seat.** Three members free; paid tiers hold more.
- **The floor is a fifth of the product.** The rest is the office shell: chat,
  people, settings, all beside the map rather than on top of it.
- **Costs stay near zero by design**, not by luck: hibernating sockets, small
  messages, thumbnail-quality video, images compressed in the browser.

## Documents

| Document | What it covers |
|---|---|
| [01-repository-and-environments.md](01-repository-and-environments.md) | Folders, Workers, bindings, environments, local development, deploys |
| [02-data-model.md](02-data-model.md) | D1 schema, room storage, what lives where |
| [03-auth-and-accounts.md](03-auth-and-accounts.md) | Google sign-in, guests, sessions, room tickets, abuse protection |
| [04-api.md](04-api.md) | Every endpoint of `tinyfloor-api` |
| [05-realtime-rooms.md](05-realtime-rooms.md) | Room and presence Durable Objects, the WebSocket protocol |
| [06-calls.md](06-calls.md) | Peer-to-peer calls with TURN, meeting tables on the SFU |
| [07-frontend.md](07-frontend.md) | The Next.js app: pages, entry flows, the room |
| [08-cloudflare-setup.md](08-cloudflare-setup.md) | Every Cloudflare resource and secret |
| [09-app-shell.md](09-app-shell.md) | The rail, the views, the presence dock, what it is built from |
| [10-chat.md](10-chat.md) | Channels, direct messages, attachments, and what they cost |
| [11-offices-members-and-seats.md](11-offices-members-and-seats.md) | One office one floor, two roles, what a seat is |
| [12-costs.md](12-costs.md) | Measured usage, the prices we are charged, where money can go |
| [13-pricing.md](13-pricing.md) | The tiers, the free office, fair use on group video |
| [research/gather.md](research/gather.md) | Gather, looked at properly: what to take and what to leave |

## Decisions

- Free office: 3 members. Paid: 10, 25 and 50.
- One free public lobby, split into copies of 20 people.
- Nearby chat on the floor is transient and never stored. Channels and direct
  messages are, in the office's own chat object.
- Image attachments in paid offices only, compressed in the browser, straight
  into R2.
- Meeting tables always use the SFU, even with two people, and start
  audio-first.
- Discord only hears about the public lobby (joins and chat, for spotting
  abuse). Nothing from an office is ever sent.
