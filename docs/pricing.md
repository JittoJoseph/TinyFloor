# Pricing, and why it is what it is

Every office starts on **Pro, free for 14 days**. Then **Pro: $29 a month for
the whole team** (the founding price, $39 for new subscriptions from 1 March
2027), or Free for up to 3 people. Monthly only. The plans were decided on 11
October 2026 and the trial and founding price on 21 October. The numbers
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
| Kumospace | 5 members | $16, minimum 5 | member |
| SoWork | 10 members, 30-min meetings | $5.40 / $12 | member |
| WorkAdventure | 10 online at once | from €8 | person online |
| oVice | small space | $65 a space (~10 people), or $16 a user, 20 minimum | space or user |
| Roam | 14-day trial | ₹888 (India) | active member |
| Slack | 90 days of history | ≈$8.75 | member |
| Linear | 250 issues | $10 / $16 | member |

Everyone in the category charges per person: a team of 10 pays $54 at the
cheapest and $120–160 at the best-known ones. Nobody sells a flat price for a
team, so that's the pitch.

The per-person products all soften the per-invite tax: Slack charges only
people active in the last 28 days, Vercel makes viewers free, Linear doesn't
bill a new person until next month. Creem can bill per seat (`units` on a
checkout, changed with `POST /v1/subscriptions/{id}`), but whether it
prorates a seat change needs Creem's team to switch it on. If per-person
ever comes back, use `proration-none` (charged at renewal, Linear's way) and
ask Creem first.

## Why each part is the way it is

- **$29.** About a third of what a six-person team pays per person elsewhere, more than
  per-person would earn from the 4–8 people who actually buy, and still a
  card purchase nobody needs approval for. $19 was below the ~$20 a team lead
  pays without asking; $29 earned more without crossing anything.
- **Free for 3, forever.** The whole product, HD included, for a small group.
  The one limit is people, and it lands exactly when the product becomes
  valuable: the team arriving.
- **Every office starts on a 14-day Pro trial, no card (21 October).** The
  first trial started only when a 4th person joined a full free office. On
  21 October, of 43 offices, 34 had one person, 7 two and 2 three: none had
  ever reached four, so no team had seen Pro, and nobody had paid. Starting
  on Pro shows the whole product from the first minute, room for everyone
  included, and paying becomes keeping something rather than buying it (a
  "reverse trial"; reported conversion 7–21%, against 3–15% for freemium,
  vendor figures). 14 days, not 7: the one large randomised test favoured 7,
  but for single-user products; a team needs invites to land and a working
  week of use. The clock starts when the office is made: simpler, and
  nothing is lost by a solo tester running it down. Offices that had never
  had a trial got one on 21 October (migration 0026).
- **When the trial ends: soft, never locked.** Admins hear in its last 3
  days, on the floor ("Your Pro trial ends on Friday"). Then it's Free. Up to
  3 people, nothing changes. More than 3: nobody is removed and everyone
  keeps coming in for 14 more days while nobody new joins, with a daily
  dismissible line on the floor (admins: "Keep Pro"; members: what's
  happening, so they ask). After that the floor holds 3 at once; chat stays
  open to everyone. Admins' and members' lines differ on purpose: the admin
  pays, the team asks.
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
- **A founding price, said with a real date (21 October).** $29 a month for
  offices that subscribe before 1 March 2027, kept for as long as they stay
  subscribed; new subscriptions after that pay $39. Not "$49, now $39" and
  not "limited time" without an end: a crossed-out price must be one actually
  charged for a substantial time (FTC, 16 CFR 233.1), we had charged nothing,
  and Creem reviews stores for exactly that. A real date and a real later
  price give the same pull honestly, and reward the first customers. $29 and
  not $39 now: no paying customers yet, and $29 stays under what a team lead
  puts on a card without asking. **On 1 March 2027:** raise the live Creem
  product to $39 (subscriptions keep the price they started with), set
  `FOUNDING` in `web-shared/src/lib/founding.ts` and the site's $29 copy
  accordingly; the founding lines hide themselves after the date.

## How the price is said

All of it true, nothing invented (`components/billing/PlanCards.tsx`, the
pricing page):

| Lever | What it says |
|---|---|
| Per person, for their team | "For your 6 people, that's $4.84 each." |
| Per day, before there's a team | "That's under $1 a day." |
| An anchor beside it, never crossed out | "Per-person tools would charge about $72 a month for the same team." |
| Price on the button, risk reversal under it | "Get Pro · $29 a month" / "Cancel any time. Full refund within 14 days." |
| A real later price, until 1 March 2027 | "Founding price: yours for as long as you stay subscribed. Offices that subscribe from 1 March 2027 pay $39." |

Not used on purpose: countdowns, crossed-out "was" prices, "most popular"
badges, invented testimonials. They'd be false with one plan and few
customers, and Creem reviews stores for exactly these.

## Conversion benchmarks, for later

Vendor reports, so ranges: freemium converts 2–5% of free accounts (median 8%
within six months in ChartMogul's survey); free trials 15–25% of trials, from
fewer starts; reverse trials (start on paid, fall back to free) 8–24%. Our
team trial is a reverse trial that starts only when a team commits.

The funnel that matters is: a new office (on the trial) → an invite sent on
the first day → a second person arrives → the team settles in → Pro before
the trial ends. Price only matters at the last step.
