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
| `Room` | office floor, lobby copy | hibernating floor sockets, whiteboard, usage | **Keep.** The floor. No chat of its own any more. |
| `Chat` | office, plus one `lobby` | channels, messages, reads, reactions | **Keep**, separate from `Room` — see below. |
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

### The lobby's chat

Every copy of the lobby (`lobby-1`, `lobby-2`, …) is its own `Room`, but they
share one `Chat` named `lobby`, so a conversation does not split when the lobby
fills up. It has three fixed channels, takes posts from anyone inside, guests
included, and refuses what only an office has (new channels, direct messages,
images). It keeps a week: after a post it sets an alarm for a day later, which
deletes messages older than seven days and sets itself again only while any
remain. That is one alarm a day while the lobby is in use and none when it is
quiet — cheaper than a cron trigger, which would wake the object every day
regardless.

The floor's old transient chat, which lived in `Room`, is gone.

The door shows who is inside with `GET /v1/lobby`, which asks the copies in
turn and is cached at the edge for fifteen seconds, so a crowd at the door is
one Durable Object round per quarter minute.

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
| Discord webhook | someone walking into the public lobby (name, character, city/region/country); a new office (name, maker, where) | Keep. Lobby chat is not sent (it is stored, a week), nor office arrivals. The webhook is a secret of `tinyfloor-realtime` only; the API reaches it through `RealtimeAdmin.officeCreated`. |
| R2 | image attachments (not built yet) | Add with attachments. |

## Outside Cloudflare

| Thing | Verdict |
|---|---|
| `backend-springboot/`, `dev-docs/` (MongoDB) | The old backend. Nothing live uses it; candidates for removal. |
| Microsoft Clarity and Google Analytics | Two analytics tools on the landing pages doing the same job; worth picking one when the landing pages are reworked. |

## Deploying

Workers Builds builds each Worker from git: `tinyfloor`, `tinyfloor-api` and
`tinyfloor-realtime` from master, and `tinyfloor-preview` from dev. Every
package's deploy script goes through `tools/deploy.mjs`, which reads the
branch Workers Builds is building (`WORKERS_CI_BRANCH`):

| Branch | Runs | So |
|---|---|---|
| master | the production script | production, and the API's D1 migrations on `tinyfloor-db` |
| anything else | the preview script | the `preview` environment, never production |
| (a laptop) | production, or preview with `deploy:preview` | as before |

A project pointed at the wrong branch or command can no longer put unmerged
code, or a migration, into production. The guard also sets `CLOUDFLARE_ENV`
("" or "preview"), so Wrangler knows which environment was meant.

The site's `build:worker` is just `opennextjs-cloudflare build`: OpenNext runs
the package's own `build`, which already fetches the licensed art and copies
the noise suppressor, so those steps run once.

Things in the build log that are expected:

- *The "middleware" file convention is deprecated.* Kept on purpose: `proxy.ts`
  runs on the Node.js runtime, which OpenNext on Workers still calls experimental.
- *A Node.js API is used (process.cwd) … not supported in the Edge Runtime.*
  From inside `next/server`, which the middleware imports; that code path never
  runs in the middleware.
- *No build cache found* or a full pnpm download: the caches Workers Builds keeps
  (`.next/cache`, the pnpm store) were empty; the next build reuses them.
