# 23. One plan, or a price per person?

Researched 11 October 2026, as a rethink of `22`. **Decided the same day: Free and
one flat Pro plan at $29, built as below** (Creem test product
`prod_2bvC3UGSNphGww4yBDFhl4`; HD for every office; Plus is gone).

## The question

`22` left us two paid plans that differ by headcount (10 / 25), meeting hours
(30 / 60) and video quality (Plus is held to standard video). That is three
things to compare, one of them a deliberately worse product. Per-person pricing
looks simpler: one number, times your team. Is it, for us?

## How the per-person products bill

| | Price | Who counts | Someone joins mid-month | Someone leaves |
|---|---|---|---|---|
| Linear | $10 / $16 | every unsuspended user | monthly: free until next month; yearly: prorated true-up | no credit |
| Slack | ≈$8.75 | only **active** members (used it in 28 days) | prorated, billed next month | prorated credit, automatically |
| Vercel Pro | $20 platform fee incl. 1 seat, +$20 per deploying seat | people who deploy; viewers free | added to the bill | — |
| Gather | $12 | members, not guests | — | — |
| Roam | $19.50 | active members | — | — |
| SoWork | $6–15 | users | — | — |

What the best of them do is soften the per-person tax: Slack and Roam charge
only people who show up, Vercel makes watchers free, Linear doesn't bill a new
person until next month. They do this because **a price per person is a price
per invite**, and a team tool that people hesitate to invite into is worse.

## What Creem can do

- **Per person: yes.** A product's price is per unit; a checkout passes
  `units` (seats), total = price × units. An existing subscription changes
  seats with `POST /v1/subscriptions/{id}` and `items: [{ id, units }]`.
- Proration on a seat change: the docs list `proration-charge-immediately` /
  `proration-none`, but the seat page also says pro-rata charges need Creem's
  team to switch on. **Ask Creem before relying on it.** `proration-none` (the
  new count is charged at renewal, Linear's monthly way) works either way and
  avoids a 3.9% + 40¢ charge for every person who joins.
- Creem doesn't enforce seats; we already do (`seatsUsed`).
- The upgrade endpoint only takes single-item subscriptions, which a one-plan
  setup is.

## Who uses an office like ours

- Our own offices (11 October, live): 28 offices; **22 have one person, 5 have
  two, 1 has three**. None has ever had a fourth.
- Seed-stage startups average 5.3 employees (Carta, H1 2024). The YC 2026
  batch's median team is 2. About 79% of US employer firms have under 10
  employees (Census, 2014).
- Gather's own setup guide has teams add or remove desks to fit their size;
  its custom plan is the one marked for large teams.
- The floor agrees: the map has 25 chairs, 5 desks with computers, 3 seats in
  the office corner. With 25 people standing around it reads as a crowd
  (tested 10 October with 24 bots). It is built for a team of up to ~10–15.

So the realistic paying customer is **4 to 10 people**. A plan built around
25-person teams is built around customers we don't have.

## What it costs us per person

From `12` and `14` (Cloudflare Realtime at $0.05/GB after 1 TB free a month):

- Worst case: a one-hour, all-cameras meeting every working day plus busy
  floor calls ≈ **$0.75 per person a month**. Typical ≈ $0.25.
- Creem: 3.9% + 40¢ per charge; payouts $7 or 1%.

## The options, per office per month (worst-case media)

| Team | Today (Plus $19 / Pro $49) | **One plan, $29, everyone** | Per person, $6 (min 4) |
|---|---|---|---|
| 4 | $19 → $14.9 left | $29 → $24.5 left | $24 → $19.7 left |
| 6 | $19 → $13.4 | $29 → $23.0 | $36 → $29.7 |
| 10 | $19 → $10.4 | $29 → $20.0 | $60 → $49.8 |
| 25 | $49 → $27.9 | $29 → $8.7 (typical $21) | $150 → $125 |

- For the 4–8 people who actually buy, one $29 plan earns as much as or more
  than per-person, and more than today's Plus.
- Per-person only wins at 10+, the size our floor doesn't hold well yet.
- A $29 plan stays positive at 25 even in the worst case, and the meeting
  fair-use (below) bounds it.

## Recommendation: Free, and one plan for the whole team

**Free for up to 3 people. Then one plan, a flat price for the whole office.**

- **One price, no headcount on the pricing page.** "$29 a month for your whole
  team." Nobody does arithmetic, and inviting the next person never changes the
  bill: the presence product's own growth loop is never taxed. It's the
  Basecamp pitch, and nobody in our market makes it; everyone else is $6–20 a
  person.
- **No worse plan.** HD, all the meetings a team needs, priority help: one
  product. Free gets the same quality; its limits are 3 people and 5 meeting
  hours.
- **The ceiling is the floor.** An office seats 25 (it has 25 chairs). That's
  in the FAQ and terms, not on the card. When teams outgrow it, the answer is a
  bigger floor (a second floor, priced per floor or per person then), a real
  feature, not a gate.
- **Meetings: fair use, not a meter.** Keep the room's allowance machinery,
  set at today's Pro level (60 office meeting-hours a month, ~3 hours every working
  day) and invisible until 80%. It's the backstop that keeps the 25-person
  worst case bounded.
- **The 4th person still starts a 14-day trial, no card.** At the end the
  team chooses the one plan; nothing to compare.
- **Price:** $29 (somewhere in $24–29). It sits between today's $19 and $49,
  is about a third of what a 6-person team pays Gather, and is still a card
  purchase nobody needs approval for.

Per-person ($5–6, Slack-style active members, seats synced with
`proration-none`) is the fallback if we later see many teams above 10. It
needs more code (sync units on join/leave, show a changing bill) and a Creem
answer on proration.

## What changes if we do it

- `PLANS`: free (3, 5 h) and one paid plan (25, 60 h fair use); drop
  `TRIAL_PLAN`, `plansOnOffer`, the Plus/Pro cards, the struck-through list,
  the HD gate (`setHd` always true), "Upgrade to Pro" paths, the cancel offer
  of "the plan below".
- Pricing page: two cards (Free, the plan), one table.
- Creem: one product; archive Plus and Pro.

## The floor at 25

Not pricing, but it decides the ceiling. What makes 25 look chaotic:

- Everyone spawns on a random walkable tile and stands where they landed; a
  real office has people at desks.
- Name tags for every standing person, even with the declutter.
- One open hall holds 16 of the 25 chairs.

Fixes, by effect:

1. **Your own desk.** Each member gets a chair when they join the office;
   you arrive seated there, and the floor fills like an office does. Idle people
   are where you expect them; only people moving or talking stand out.
2. **Tags only for people near you, moving or talking**; seated people far
   away keep a dot.
3. **Desks fit the team** (Gather's approach): more desks as the team grows,
   a second room past ~15.
