# 07. The services, and whether each one earns its place

Three Workers, one database, three kinds of Durable Object (down from four), and
Cloudflare Realtime for media. This is what each is for, and what changed.

## Workers

| Worker | Why it is separate |
|---|---|
| `tinyfloor` (site) | Next.js through OpenNext; static assets and pages. |
| `tinyfloor-api` | Accounts, offices, tickets. Short requests against D1. |
| `tinyfloor-realtime` | Every WebSocket and every Durable Object that holds one. |

Keeping sockets out of the API means a deploy of the API never drops anyone off
the floor, and the API stays a plain request/response Worker. The API reaches
rooms only through a service binding (`RealtimeAdmin`), never over the internet.
All three stay.

## Durable Objects

A Durable Object class is a kind; the dashboard lists *instances*, one per name
ever used. That is where "so many" came from.

| Class | One per | Keeps | Verdict |
|---|---|---|---|
| `Room` | office floor, lobby copy | hibernating floor sockets, whiteboard, usage | **Keep.** The floor. |
| `Chat` | office | channels, messages, reads, reactions | **Keep**, separate from `Room` — see below. |
| `PasswordGuard` | email address, client IP | bcrypt work, failed-attempt counts | **Keep, but stop it leaving objects behind.** |
| `Presence` | one, global | head count of every room | **Removed.** |

### Presence is gone

It existed so the dashboard could read head counts without waking rooms, and so
the lobby could pick a copy with space. It cost one extra Durable Object request
on every arrival and departure in every room, all funnelled into a single
global object in one location.

Now a room answers for itself: `Room.headcount()`. The dashboard asks the few
offices a person belongs to (usually one to three calls), and the lobby asks
`lobby-1`, then `lobby-2`, until one has space — normally one call. If a burst
overfills a copy, that room already turns the extra visitor away as *full*, and
*Try again* places them in the next one.

### PasswordGuard stops leaving objects behind

Its constructor created a SQLite table, so every email address and every IP
that ever touched sign-in became a Durable Object with storage, forever —
thousands of instances holding nothing useful.

It now keeps its one counter in the key-value API, deletes it on a successful
sign-in, and sets an alarm for the end of the lockout window that clears
everything. An object with no stored data does not persist, so the only guards
that exist are the ones currently counting failures.

The class itself stays: bcrypt takes longer than a free-plan Worker's CPU
budget, and a Durable Object request gets thirty seconds.

### Why chat is not folded into Room

One object per office would save a socket, but it would tie chat to the floor:
you could not read a channel on a phone without walking in, a floor deploy or
reset would drop chat too, and the floor's hot path (movement, many messages a
second) would share an object with durable history. Two hibernating sockets
cost nothing while idle, so the separation is free.

## Storage and the rest

| Service | For | Verdict |
|---|---|---|
| D1 (`tinyfloor-db`, `-preview-db`) | users, sessions, offices, memberships, invitations, usage | Keep. |
| Workers Rate Limiting | per-IP limit on auth routes | Keep; free. |
| Cron (daily, live only) | sessions, idle guests, expired invitations | Keep. |
| Realtime TURN | relay for calls behind strict NATs | Keep; pay-as-you-go past 1,000 GB. |
| Realtime SFU | group meetings | Keep; same. |
| Turnstile | bot check on sign-up and guest creation | Keep; free. |
| Discord webhook | public lobby activity, for spotting abuse | Keep while the lobby is open to anyone. |
| R2 | image attachments (not built yet) | Add with attachments. |

## Outside Cloudflare

| Thing | Verdict |
|---|---|
| `backend-springboot/`, `dev-docs/` (MongoDB) | The old backend. Nothing live uses it; candidates for removal. |
| Microsoft Clarity and Google Analytics | Two analytics tools on the landing pages doing the same job; worth picking one when the landing pages are reworked. |
