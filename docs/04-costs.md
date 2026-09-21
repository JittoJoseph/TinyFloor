# 04. What it costs to run

Measured on 21 September 2026 from our own tables and the Cloudflare dashboard,
after four days of real use (two people, the public lobby, proximity calls on
the 20th and a meeting-table call on the 19th).

## What we actually used

`usage_daily`, the live database:

| Day | Peak people | Person-minutes | SFU participant-minutes |
|---|---|---|---|
| 17 Sep | 2 | 28 | 2 |
| 18 Sep | 2 | 41 | 2 |
| 19 Sep | 2 | 165 | 22 |
| 20 Sep | 2 | 142 | 0 |

Cloudflare Realtime, same week:

| Service | Egress | Ingress |
|---|---|---|
| TURN | 164.73 MB | 179.69 MB |
| Serverless SFU | 47.37 MB | 5.26 MB |

Two numbers fall out of that, and they are the ones to design against:

- **SFU: ~1.8 MB per participant-minute** (47.37 MB ÷ 26 participant-minutes),
  about 240 kbps — one subscribed stream each, which is what a two-person
  meeting is.
- **TURN carried three times more than the SFU did.** Proximity calls were
  peer-to-peer with the relay as a fallback, but the peers almost never reached
  each other directly and the relay carried the lot. So proximity calls now
  always go through the relay (`iceTransportPolicy: "relay"`): the direct
  attempt only added setup time, and relayed is what they cost anyway.

Both sit inside the free allowance: 0.21 GB against 1,000 GB a month, per
service. At list price ($0.05/GB) the whole week of calls would have cost
**about one cent**.

Gap worth closing: we count `sfu_minutes` but nothing for proximity calls, so
we cannot attribute that 165 MB to a call. Count relayed call minutes too.

## The prices we are charged against

Account is on the **Workers free plan** today (SQLite-backed Durable Objects are
in the free tier). Everything below is per month unless it says per day.

| Thing | Free | Paid ($5/mo) |
|---|---|---|
| Worker requests | 100,000 / day | 10M included, then $0.30 / M |
| Worker CPU | 10 ms / request | $0.02 / M CPU-ms |
| DO requests | 100,000 / day | $0.15 / M |
| **DO duration** | **13,000 GB-s / day** | $12.50 / M GB-s |
| DO SQL rows read / written | 5M / 100k per day | $0.001 / M, $1.00 / M |
| DO stored data | 5 GB | $0.20 / GB-mo |
| D1 rows read / written | 5M / 100k per day | $0.001 / M, $1.00 / M |
| D1 storage | 5 GB | $0.75 / GB-mo |
| R2 storage | 10 GB | $0.015 / GB-mo, **egress free** |
| R2 writes / reads | — | $4.50 / M, $0.36 / M |
| TURN egress | 1,000 GB | $0.05 / GB |
| SFU egress | 1,000 GB | $0.05 / GB |
| Workers Builds | 3,000 min | 6,000 min, then $0.005 / min |

(Re-check the Realtime allowances before launch; they are the only ones we have
not seen on an invoice.)

## Where the money can actually go

### Compute: nowhere

Hibernating WebSockets mean an idle room with ten people standing still is not
"running" — duration is billed while the object is awake. A room message wakes
it for something on the order of a millisecond at 128 MB, so 0.000128 GB-s.

A ten-person office, twenty-two working days, generous assumptions:

| | Volume | Free allowance |
|---|---|---|
| Room messages | ~440,000 / month | 100k DO requests **a day** |
| DO duration | ~56 GB-s / month | 13,000 GB-s **a day** |
| Chat messages stored | ~11,000 rows | 100k row-writes **a day** |

Three orders of magnitude of headroom. Compute is not a cost, it is a rounding
error — as long as we keep hibernation and keep per-message work small.

### Media: everything

SFU egress is the sum of what every subscriber pulls. With our two-quality
policy (150 kbps thumbnails, 900 kbps only for an enlarged card, ~32 kbps
audio):

| Shape | Per participant | Per meeting-minute | Per hour |
|---|---|---|---|
| 10 people, all cameras on | 9 × 150 kbps + audio ≈ 1.6 Mbps | ~123 MB | **7.4 GB** |
| 10 people, cameras off | 9 × 32 kbps ≈ 290 kbps | ~22 MB | **1.3 GB** |
| 4 people, cameras on | 3 × 150 kbps + audio ≈ 550 kbps | ~16 MB | 1.0 GB |
| 2 people, proximity (always relayed) | measured | ~2.8 MB | 0.17 GB |

So the free 1,000 GB a month is roughly **135 hours of ten-person full-video
meetings across every office we host**, or 750 hours with cameras off.

Cameras are a 5.7× multiplier. That single fact should drive the product:
default group meetings to audio with thumbnails, make "everyone on camera" a
deliberate act, and keep the enlarged-card rule.

### Storage: cheap, if we compress

Image attachments in R2, compressed client-side to WebP at ~200 KB:

| | Cost |
|---|---|
| 1,000 images stored | 200 MB → $0.003 / month |
| 1,000 uploads | $0.0045 |
| Serving them | £0 — R2 has no egress charge, and Cloudflare caches |

A thousand images a month costs less than a cent. The reason to keep
attachments out of free offices is not the bill, it is that anonymous uploads
are an abuse surface; paying offices have a card on file.

## The shape of it

| Cost | Driver | Lever |
|---|---|---|
| ~$0 | compute, storage, database | hibernation, small messages, WebP |
| the whole bill | group video egress | default audio, thumbnail quality, meeting-hour caps |
| second place | TURN relay on proximity calls | cap the relayed bitrate |

Two people using TinyFloor all week cost us a cent. A hundred offices doing
daily all-hands on camera cost real money. Price the second, give away the
first.
