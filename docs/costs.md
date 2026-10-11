# What TinyFloor costs to run

Measured from our own usage tables and Cloudflare's dashboard, September to
October 2026. Re-check Cloudflare's Realtime prices once a year; they are the
only ones that matter.

## Only media costs money

| | Price |
|---|---|
| Video and voice (Cloudflare Realtime: TURN and the SFU) | **$0.05 per GB sent to browsers**, after **1 TB free a month shared by TURN and the SFU** together. Ingress is free. |
| Compute, Durable Objects, D1, R2 | A rounding error. Sockets hibernate, so a floor of people standing still isn't billed as running; a message wakes a room for about a millisecond. A busy ten-person office uses about 1/1000 of the free Durable Object allowance. |
| Fixed | About $10 a month (Workers paid plan at $5, needed past 100k requests a day; the domain). |
| Creem | 3.9% + 40¢ per payment, so $29 nets **$27.47**. Payouts cost $7 or 1%, whichever is more: withdraw once a month, not twice. |

So everything below is about bytes sent to people.

## Measured rates

| What | Measured | Note |
|---|---|---|
| A 2 h 45 min camera-on call in the lobby (25 Sep) | 624 MB through TURN, **~0.22 GB per call-hour**, ~245 kbps each way | 1.7× what the settings promised; the quality cap was silently skipped when a browser reported no encodings (fixed). |
| A two-person meeting (SFU, early) | ~1.8 MB per participant-minute (~240 kbps) | One subscribed stream each. |
| Proximity calls before relay-only | TURN carried 3× what the SFU did | Direct peer-to-peer almost never connected, so calls are always relayed now (see `calls.md`). |

What one person receives per hour, with today's settings (`lib/media.ts`):

| Stream | Rate | GB / hour |
|---|---|---|
| A voice (Opus with redundancy) | ~65 kbps | 0.029 |
| A floor call with camera (180p + voice) | ~190 kbps | 0.086 |
| Meeting stage, every camera on (one HD card, three small, voices) | ~1.2 Mbps | 0.54 |
| Meeting stage, voices only | ~80 kbps | 0.036 |

Cameras multiply cost by about 5×, and HD by much more. Every decision about
defaults (camera off, audio-first calls) follows from that.

## What an office costs a month

22 working days, list price, ignoring the free 1 TB. Floor calls are one to
one (groups go to meetings), and a meeting sends each person only the four
videos on their stage, so cost grows with people, not with people squared.

| Team | Typical (calls, a little meeting video) | Meetings on camera 4 h a day + floor calls 4 h | Left of $27.47 in that case |
|---|---|---|---|
| 5 | ~$1.20 | $13.80 | +$14 |
| 8 | ~$1.90 | $22.00 | +$5 |
| 10 | ~$2.40 | $27.60 | about even |
| 15 | ~$3.60 | $41.20 | −$14 |

- **Cost is per person: about $0.25 a month typical, up to ~$2.80 for someone
  on camera all day.** A flat price is a bet on the average, like a gym.
- If one paying office in ten lives on camera and the rest are typical, the
  average is ~$5 a month: **~77% margin** after fees.
- The losses are only big teams that live on camera. That is why Pro holds
  up to 15 (`pricing.md`).
- A free office of three on camera all day costs ~$7 a month. A few hundred
  of those would be real money; the guardrails below are what keep it small.
- The 1 TB free covers roughly eight ten-person teams doing an hour of
  all-camera meetings every working day.

**Revisit the price at 20 paying offices**, with real per-office costs from
`usage_daily` (it counts floor-call minutes and meeting minutes per office).
If the average cost passes ~$8, or many teams are above 10, go to $39 or add
a per-person price past 10. Creem prices apply only to new checkouts, so
raising for new offices is easy; cutting a price that didn't sell is not.

## The guardrails, and what each saves

None of these is visible in normal use. Each is in the code; this is why.

| Rule | Why |
|---|---|
| A meeting receives only the cards on screen: one big, three small | A 25-person meeting costs four streams per person, not 24. |
| Each camera is sent in three layers (720p 800k, 360p 300k, 180p 120k); a viewer gets what its card needs | HD only where it's seen big. |
| No video to a hidden tab, on calls and in meetings | People leave the office open in a background tab all day; probably the biggest saving. |
| Cameras rest after 10 quiet minutes | Working side by side in silence doesn't need video. One press brings it back. |
| Nothing is sent while you're alone in a meeting; a muted mic sends nothing (the slot is emptied, not filled with silence) | Free. |
| Your own camera is shown from your device, never round-tripped | Free. |
| The room refuses more than 6 video tracks per person | A bad client can't run up the bill. |
| Meetings past the fair-use hours carry on voice only | The backstop for the worst case (`pricing.md`). |

## Storage

Image attachments in R2, compressed to ~200 KB WebP in the browser: a
thousand images cost under a cent a month, and R2 has no egress fee. Storage
is not a reason to limit anything.
