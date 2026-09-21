# TinyFloor on Cloudflare: why, what it runs on, and what it costs

TinyFloor is a virtual office you walk around in: a pixel-art floor, chat, and
voice/video calls that start when you walk up to someone. All of it runs on
Cloudflare. There are no servers, containers or databases to look after anywhere else.

## Why Cloudflare-native

- **One platform, no ops.** Pages, API, realtime sockets, database, video relay
  and bot checks all run on the same network under one account. There's nothing to patch,
  scale or keep alive.
- **Near users everywhere.** Code runs in whichever Cloudflare location is closest to each user,
  so movement and chat feel instant without choosing regions.
- **Idle costs nothing.** WebSockets on Durable Objects *hibernate*: a floor
  full of people standing still isn't billed as running. We pay when something
  happens, for milliseconds at a time.
- **Built-in video infrastructure.** Cloudflare Realtime gives us TURN (relay) and
  an SFU (group calls) on the same network, with 1,000 GB a month free each.

## What it runs on

| Piece | Cloudflare service | What it does |
|---|---|---|
| Website and app | Workers (Next.js via OpenNext) + static assets | Landing pages in 18 languages, and the app itself |
| API | Worker `tinyfloor-api` | Accounts, offices, invites, tickets that let you into a room or call |
| Realtime | Worker `tinyfloor-realtime` + Durable Objects | Everything live: the floor and chat |
| ↳ `Room` | Durable Object, one per office floor / lobby room | Who's where, movement, whiteboard, call signalling |
| ↳ `Chat` | Durable Object, one per office (+ one for the lobby) | Channels, DMs, history (SQLite inside the object) |
| ↳ `PasswordGuard` | Durable Object, only while needed | Slows down password guessing |
| Database | D1 (SQLite) | Users, sessions, offices, memberships, usage |
| Calls | Realtime TURN + Realtime SFU | Relaying 1:1 calls; group meetings |
| Bot protection | Turnstile, Workers Rate Limiting | Sign-up checks, limits on login attempts |
| Housekeeping | Cron triggers, Durable Object alarms | Expire sessions and invites; the lobby chat forgets after 7 days |
| Deploys | Workers Builds (from GitHub) | master → production, dev → preview |

The API talks to the realtime Worker over a private *service binding*, not the
public internet, so deploying one never drops anyone's connection to the other.

## How calls work

Every call goes through Cloudflare Realtime. There are two kinds of call, each on the service that suits it.

**1. Walk up to someone (proximity, 1:1): Cloudflare TURN relay.**

```
You ──── WebRTC ────► Cloudflare TURN ◄──── WebRTC ──── Them
```

- The `Room` Durable Object passes the handshake between the two browsers; the
  API hands each of them short-lived TURN credentials.
- Audio and video then always flow **through Cloudflare's relay**
  (`iceTransportPolicy: "relay"`), never directly between the two people.
- Why always: in testing, direct connections between two people almost never
  worked (firewalls, NATs, mobile networks), and the relay carried nearly every
  call anyway. Relaying from the start means one path, faster setup, and calls
  that behave the same on any office or home network.

**2. Sit at a meeting table (group): Cloudflare Realtime SFU.**

```
Each person ──sends one stream──► Cloudflare SFU ──forwards──► everyone else
```

- Each person uploads their audio/video **once**; the SFU forwards it to the
  others. It doesn't mix or transcode, so it stays cheap and low-latency.
- The `Room` object opens the SFU sessions server-side with our app credentials,
  so browsers never hold them.
- Everyone sends two qualities (*simulcast*): a **150 kbps thumbnail** and a
  **900 kbps** version, pulled only for the card someone has enlarged. Audio is ~32 kbps.
  This one rule keeps group calls affordable.

**Extras that cost nothing:** echo cancellation and noise suppression run in
the browser. An optional *stronger noise removal* (the RNNoise model, running
on the user's device) can be switched on in Settings. No audio is ever sent to a server for processing.

## What it costs

We're on the **Workers free plan**. Measured over four days of real use,
including proximity calls and a group call: **about one cent of usage at list
price**, all inside the free allowance.

| Cost area | Why it's small (or not) | Free allowance |
|---|---|---|
| Compute (Workers, Durable Objects) | Hibernating sockets; a message wakes a room for about 1 ms | 100k requests/day; 13,000 GB-s of Durable Object time a day |
| Database and chat storage | Small rows; chat lives inside each office's object | 5 GB; 5M reads / 100k writes a day |
| **Group video (SFU)** | **The only real cost driver**: every viewer pulls every stream | **1,000 GB/month**, then $0.05/GB |
| TURN relay (1:1 calls) | Every 1:1 call; two streams, ~0.17 GB per call-hour | 1,000 GB/month, then $0.05/GB |
| Image attachments (planned) | R2, ~200 KB WebP each; **no egress fees** | 10 GB |

Rough scale for video:

| Meeting | Data per hour |
|---|---|
| 10 people, all cameras on | ~7.4 GB |
| 10 people, cameras off | ~1.3 GB |
| 2 people walking up to each other (relayed) | ~0.17 GB |

So the free 1,000 GB a month (SFU) covers about **135 hours of ten-person,
all-camera meetings**, or ~750 hours with cameras off, across every office
combined; the separate 1,000 GB of TURN covers roughly **5,900 hours of 1:1
calls**.
After that it's $0.05/GB (≈ $0.37 for an hour of a ten-person, all-camera
meeting).

**The takeaway:** running the floor and chat costs close to nothing, however
many offices we host, and a 1:1 call costs about a cent an hour past the free
allowance. Money only goes on large group video,
which is exactly what paid plans will cover. The free plan (up to 3 people per
office) is sustainable to give away.

*Figures from our own usage table and Cloudflare's dashboard, 21 September
2026. Re-check Realtime prices before launch.*
