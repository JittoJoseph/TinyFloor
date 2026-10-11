# Pricing, and why it is what it is

Free for up to 3 people, then **Pro: $29 a month for the whole team**,
monthly only. Decided 11 October 2026 after three earlier shapes. The numbers
behind it are in `costs.md`.

## What we tried first, and why it went

| Shape | Why it went |
|---|---|
| Tiers by headcount: Team 10 / Office 25 / Floor 50 (Sept) | Three numbers to compare; no tier fitted the teams we actually got. |
| Plus $19 (10 people, 30 meeting hours) and Pro $49 (25, 60 h, HD), with a meeting-hours meter (28 Sept – 10 Oct) | A deliberately worse product (Plus without HD), three things to compare, and a meter people could watch run down. |
| A price per person | A price per person is a price per invite, and a presence product is worth less with every person who isn't invited. |

## Who actually buys

- Our offices on 11 October: 28 offices; **22 had one person**, 5 two, 1
  three, none ever four. These are people trying it alone who didn't stay,
  not one-person companies.
- Seed-stage startups average 5.3 employees (Carta, H1 2024); the YC 2026
  batch's median team is 2; ~79% of US employer firms have under 10 people
  (Census).
- **The floor looks like chaos at 25.** Tested on 10 October with 24 bots:
  it reads as a crowd, not an office. It works for up to ~10–15.

So the customer is **a team of 4 to 10**, and the plan is built for them.

## What the others charge (checked 10 October 2026)

| Product | Free | Paid | Counted by |
|---|---|---|---|
| Gather | 30-day trial | $12 | member |
| Kumospace | 5 members | $16, minimum 5 | member |
| SoWork | 10 members, 30-min meetings | $5.40 / $12 | member |
| WorkAdventure | 10 online at once | from €8 | person online |
| oVice | small space | $65 a space (~10 people), or $16 a user, 20 minimum | space or user |
| Roam | 14-day trial | ₹888 (India) | active member |
| Slack | 90 days of history | ≈$8.75 | member |
| Linear | 250 issues | $10 / $16 | member |

Everyone in the category charges per person: a team of 10 pays $54 at the
cheapest and $120–160 at Gather or Kumospace. Nobody sells a flat price for a
team, so that's the pitch.

The per-person products all soften the per-invite tax: Slack charges only
people active in the last 28 days, Vercel makes viewers free, Linear doesn't
bill a new person until next month. Creem can bill per seat (`units` on a
checkout, changed with `POST /v1/subscriptions/{id}`), but whether it
prorates a seat change needs Creem's team to switch it on. If per-person
ever comes back, use `proration-none` (charged at renewal, Linear's way) and
ask Creem first.

## Why each part is the way it is

- **$29.** About a third of what a six-person team pays Gather, more than
  per-person would earn from the 4–8 people who actually buy, and still a
  card purchase nobody needs approval for. $19 was below the ~$20 a team lead
  pays without asking; $29 earned more without crossing anything.
- **Free for 3, forever.** The whole product, HD included, for a small group.
  The one limit is people, and it lands exactly when the product becomes
  valuable: the team arriving.
- **The 4th person starts a 14-day Pro trial, no card.** Before the trial, a
  team of four met a locked door at the moment it moved in, which is the
  likeliest reason people left. With it, the team lives in Pro before anyone
  decides, so paying is keeping something, not buying something. Once per
  office; never for one that has paid.
- **No card for the trial.** A card-up-front trial converts more of its
  trials, but forgotten charges come back as refunds and chargebacks; Creem
  charges for disputes, can close a store with many, and reviews stores for
  dark patterns.
- **Up to 15, said but never pitched.** Small offices are cheaper (`costs.md`)
  and better on the floor. It's in the FAQ, the pricing page's notes and the
  terms ("Made for small teams: up to 15 people"); the cards, the offer and
  the checkout say "your whole team". Hiding a limit someone pays for brings
  refunds, and Creem reviews for it. In the app, paid offices see the seat
  count only when they're two from full.
- **No meters anywhere.** People overpay for a flat price to avoid feeling a
  meter run (the "taxi-meter effect": Lambrecht & Skiera, 2006), and use less
  when each use feels like it costs (Prelec & Loewenstein, 1998). For a
  presence product, less use means less value means churn.
- **Fair use in the terms only.** Past 120 meeting hours a month on Pro (40 on
  Free), meetings carry on voice only until the 1st. That's 5½ hours of
  meetings every working day; nobody normal gets near it. The room counts
  seconds a meeting has two or more people in it, per office per calendar
  month (UTC), and wakes by alarm when the hours would run out
  (`worker-realtime/src/meeting-clock.ts`). Floor calls are counted but never
  limited. Each copy of the public lobby gets 2 meeting hours a day, since
  nobody pays for it.
- **Monthly only.** One price, cancel any time, full refund within 14 days.

## How the price is said

All of it true, nothing invented (`components/billing/PlanCards.tsx`, the
pricing page):

| Lever | What it says |
|---|---|
| Per person, for their team | "For your 6 people, that's $4.84 each." |
| Per day, before there's a team | "That's under $1 a day." |
| An anchor beside it, never crossed out | "Per-person tools would charge about $72 a month for the same team." |
| Price on the button, risk reversal under it | "Get Pro · $29 a month" / "Cancel any time. Full refund within 14 days." |

Not used on purpose: countdowns, crossed-out "was" prices, "most popular"
badges, invented testimonials. They'd be false with one plan and few
customers, and Creem reviews stores for exactly these.

## Conversion benchmarks, for later

Vendor reports, so ranges: freemium converts 2–5% of free accounts (median 8%
within six months in ChartMogul's survey); free trials 15–25% of trials, from
fewer starts; reverse trials (start on paid, fall back to free) 8–24%. Our
team trial is a reverse trial that starts only when a team commits.

The funnel that matters is: a new office → an invite sent on the first day →
a second person arrives → a fourth (the trial) → Pro. Price only matters at
the last step.
