# 08. Pricing: what others charge, what we cost, what we charge

Checked on 24 September 2026. This replaces the numbers in `04-costs.md` and
`05-pricing.md` where they disagree; the shape of `05` (flat tiers, membership
is the seat) stands.

## What the others charge

All per member, per month, on yearly billing unless it says otherwise.

| Product | Free | Paid |
|---|---|---|
| Gather | 30-day trial only | **$12** (one plan) |
| Kumospace | 5 members | **$16**, minimum 5 |
| SoWork | 10 members, 30-min meetings | **$5.40** Basic, **$12** Premium |
| WorkAdventure | 10 people online at once | **from $9** |
| Roam | 14-day trial | **₹888** per active member (India price, in INR) |

Everyone charges per member. Nobody sells a flat price for a team size, so a
ten-person team pays $54 at the cheapest (SoWork Basic) and $120–160 at
Gather or Kumospace.

## What we actually cost

From `usage_daily` (live D1) and Cloudflare's Realtime analytics, 17–24 Sep.
35 users, 6 offices, all on the free plan, never more than 3 people in one place.

| Day | Offices used | Peak | Person-min | Table-min | TURN egress | SFU egress |
|---|---|---|---|---|---|---|
| 17 Sep | 1 | 2 | 28 | 2 | 0.03 MB | 5.2 MB |
| 18 Sep | 1 | 2 | 41 | 2 | 0.03 MB | 2.8 MB |
| 19 Sep | 1 | 2 | 165 | 22 | 164.7 MB | 39.4 MB |
| 20 Sep | 1 | 2 | 142 | 0 | 0.01 MB | 0 |
| 21 Sep | 2 | 3 | 114 | 4 | 0.64 MB | 0 |
| 22 Sep | 4 | 1 | 80 | 2 | 0.02 MB | 0 |
| 23 Sep | 4 | 2 | 229 | 4 | 11.1 MB | 0.13 MB |
| 24 Sep | 3 | 2 | 125 | 0 | 0 | 0 |

(`usage_daily` days and Cloudflare days are both UTC. Table minutes with one
person at the table cost nothing: there is nobody to send to.)

The two rates to plan against:

| | Measured | Rate |
|---|---|---|
| Meeting table (SFU), per subscribed stream | 39.4 MB over 22 participant-min in a 2-person meeting | **~0.1 GB per stream-hour** (~230 kbps, camera + audio, thumbnail quality) |
| Proximity call (TURN, always relayed) | 129.6 MB in the busiest hour, one 2-person call | **~0.13 GB per call-hour** |

Things `04-costs.md` had wrong or did not know:

- **The 1,000 GB free allowance is shared** between TURN and the SFU, not
  1,000 GB each. After it, $0.05/GB egress. Ingress is free.
- **The meeting table has 6 chairs**, so a table meeting is at most 6 × 5 = 30
  streams: ~3 GB an hour with every camera on, not the 7.4 GB a 10-person
  meeting would be. There is one table per office, so this is also the ceiling.
- Proximity calls are still not counted in `usage_daily` (only table minutes
  are), so we cannot tie TURN traffic to an office yet. That has to exist before
  any fair-use rule can be enforced.

Compute, D1, Durable Objects and storage stay a rounding error (see `04`); once
past 100k requests a day we need the Workers paid plan, **$5 a month**.

## What an office will cost at scale

A busy office, per month (22 working days):

- every member spends 1.5 hours a day in one-to-one proximity calls;
- the table holds a full meeting, cameras on, for 1 hour a day per 10 members
  (at least 1).

| Office | Proximity | Table | Total egress | At $0.05/GB |
|---|---|---|---|---|
| 3 members | 6 GB | 13 GB | ~20 GB | **$1.00** |
| 10 members | 21 GB | 66 GB | ~87 GB | **$4.35** |
| 25 members | 53 GB | 165 GB | ~218 GB | **$10.90** |
| 50 members | 105 GB | 330 GB | ~435 GB | **$21.75** |

About **$0.45 per member per month at the busy end**, and half that for a
normal week. The free 1 TB covers about a dozen busy ten-person offices, or
twenty-odd normal ones, before we pay anything for media.

The ceiling for one office is the table running all day with cameras on
(3 GB × 8 h × 22 d ≈ 530 GB, **~$26**) plus everyone paired up all day. That
is what fair use is for; nobody else is capable of costing us more than that.

Two risks the model does not cover:

- **Proximity groups have no size limit.** Five people standing together is a
  5-way mesh through TURN, 20 streams. Cap a proximity group at ~5 and send
  bigger ones to the table, or to the SFU.
- **The public lobby is free and open.** Its calls cost the same as anyone's.
  Worth a per-lobby cap on video.

## What we charge

Flat price per office, by how many members it holds. Guests never count.

| Tier | Members | Monthly | Yearly |
|---|---|---|---|
| **Free** | 3 | $0 | — |
| **Team** | 10 | **$19** | $190 |
| **Office** | 25 | **$39** | $390 |
| **Floor** | 50 | **$69** | $690 |
| Bigger | — | talk to us | |

Yearly is ten months for twelve. Prices in USD; the payment provider shows the
buyer's local currency.

### How far under the others that is

| Team size | TinyFloor | SoWork Basic | WorkAdventure | Gather | Kumospace |
|---|---|---|---|---|---|
| 10 | $19 | $54 | $90 | $120 | $160 |
| 25 | $39 | $135 | $225 | $300 | $400 |
| 50 | $69 | $270 | $450 | $600 | $800 |

65–90% cheaper, and more so for a team that is not full: a 6-person team on
Team pays $19, not 6 × $12.

### Whether it survives

Per full office per month, at the busy end, after the payment provider's cut
(~5% + 50¢, see `09-billing.md`):

| Tier | Price | Media | Fees | Left |
|---|---|---|---|---|
| Team (10) | $19 | $4.35 | $1.45 | **$13.20** (69%) |
| Office (25) | $39 | $10.90 | $2.45 | **$25.65** (66%) |
| Floor (50) | $69 | $21.75 | $3.95 | **$43.30** (63%) |

Fixed costs are about $10 a month (Workers paid, domain). One paying office
covers them. $1,000 a month in margin is ~75 Team offices.

There is room to go higher. At $29 / $59 / $99 we would still be 45–90% under
everyone, so if the $19 tier sells easily, raise it for new offices rather than
cutting a free tier later.

### Fair use

Only the table can run away with money, so the allowance is on table video:

| Tier | Table video included |
|---|---|
| Free | 10 hours / month |
| Team | 60 hours / month |
| Office | 120 hours / month |
| Floor | 200 hours / month |

Past it, the table carries on audio-only (~0.4 GB an hour with six people). No
overage bills. Proximity calls are not counted.

Launch **metering only**: count table and proximity minutes per office, alert
when an office passes its allowance, and turn on the audio-only fallback only
when someone actually does.

## Decided

- Flat tiers by member count, no per-seat billing.
- Free stays at 3 members. Kumospace gives 5 and SoWork 10, but ours has no
  meeting-length or time limit, and three is where a small studio feels the
  wall.
- Price in USD. Regional pricing (Roam charges India in INR) comes later, if
  sign-ups show it matters.

## Still to decide

- What happens to an office over its limit after a subscription ends (see
  `09-billing.md`).
- The proximity group cap, and the lobby video cap.
