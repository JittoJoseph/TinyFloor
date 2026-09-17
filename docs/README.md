# TinyFloor platform docs

The move of TinyFloor's backend onto Cloudflare: Workers, Durable Objects, D1
and Realtime.

## Direction

- The new platform is built on the `feature/cloudflare-platform` branch.
- **It is not compatible with the current Java backend,** and doesn't try to be.
  The API, the WebSocket protocol and the data model are all new.
- **Every Cloudflare resource is set up during development,** including the API
  and realtime Workers on their real hostnames. Nobody uses them until the merge.
- **The merge switches the site over:** the branch brings the frontend changes
  and points the frontend at the new API.
- **It's a fresh start.** Only user accounts are carried over from MongoDB. Rooms,
  whiteboards and everything else start empty.
- From the merge on, `backend-springboot/` is deprecated. Its code stays in the
  repository, but nothing runs it.

Where these documents differ from section 8 of the overview (side-by-side
testing against the Java backend), these documents win.

## Documents

| Document | What it covers |
|---|---|
| [cloudflare-platform-plan.md](cloudflare-platform-plan.md) | The overview: services, costs, free allowances |
| [01-repository-and-environments.md](01-repository-and-environments.md) | Folders, Workers, bindings, environments, local development, deploys |
| [02-data-model.md](02-data-model.md) | D1 schema, room storage, what lives where |
| [03-auth-and-accounts.md](03-auth-and-accounts.md) | Google sign-in, guests, sessions, room tickets, abuse protection |
| [04-api.md](04-api.md) | Every endpoint of `tinyfloor-api`, and what replaces each Java endpoint |
| [05-realtime-rooms.md](05-realtime-rooms.md) | Room and lobby Durable Objects, the WebSocket protocol |
| [06-calls.md](06-calls.md) | Peer-to-peer calls with TURN, meeting tables on the SFU |
| [07-frontend-changes.md](07-frontend-changes.md) | What changes in the Next.js app |
| [08-cloudflare-setup.md](08-cloudflare-setup.md) | Every Cloudflare resource and secret |
| [09-data-migration-and-cutover.md](09-data-migration-and-cutover.md) | Carrying over user accounts, and the switch-over runbook |
| [10-build-order.md](10-build-order.md) | Milestones, in order, with what "done" means for each |

## Decisions

- Plans: Free up to 3 members, then 10, 25 and 50 members.
- One free lobby, split into copies of 20 people.
- Chat is not saved, as today.
- Discord only hears about the public lobby (joins and chat, for spotting
  abuse). Nothing from workspace rooms is ever sent.
- Meeting tables always use the SFU, even with two people.
- Only user accounts are carried over; everything else starts fresh.
