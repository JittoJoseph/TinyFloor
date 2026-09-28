# 14. Plans by people and meeting hours

Decided on 28 September 2026 and built the same day. Replaces the seats-only
tiers; the Paddle side in `09` stands.

## Why a second limit

Seats alone let a 5-person team meet all day on the $19 plan: its cost grows
with meetings, its price doesn't. Linear does the opposite of per-seat on its
free tier (unlimited members, 250 issues), and Otter and Riverside sell
monthly pools of minutes or hours. A plan here gets both: **how many people
it holds, and how many meeting hours a month it includes**. A small team that
meets a lot moves up for the hours; a big team that rarely meets moves up for
the seats.

## What counts as a meeting hour

- **Time a meeting has two or more people in it**, by the clock. One hour with
  eight people is one hour. Waiting alone costs nothing (nothing is sent) and
  counts for nothing.
- Only meetings. One-to-one calls on the floor never count.
- Pooled across the office's meetings, per calendar month (UTC). Unused hours
  don't carry over.
- The lobby isn't counted against anyone; it gets its own cap (below).

## The numbers

One meeting-hour costs us, sent to everyone in it (docs/12 rates):

| People in it | Worst (all there, all cameras) | Typical (70% there, half the cameras) |
|---|---|---|
| 3 | $0.05 | $0.02 |
| 10 | $0.16 | $0.06 |
| 25 | $0.40 | $0.15 |

The plans, monthly only:

| Plan | Price | People | Meeting hours a month | Worst case left | Typical left |
|---|---|---|---|---|---|
| Free | $0 | 3 | 5 | −$0.37 | −$0.23 |
| Team | $19 | 10 | 30 | $12.30 (65%) | $15.27 (80%) |
| Business | $49 | 25 | 60 | $20.94 (43%) | $35.75 (73%) |
| Bigger | talk to us | | | | |

- Team's 30 hours is a daily standup with room to spare. Keeping half the price
  even in the worst case would allow ~50; 30 leaves the margin to cover free
  offices.
- A 5-person team meeting 2 hours every working day uses ~44 hours: Business,
  though its seats would fit Team. That's the Linear dynamic, on purpose.
- Free's 5 hours is enough to try meetings properly and to feel the wall.

## When the hours run out

**Meetings carry on, voice only, until the 1st.** Video is what costs money
(~10× voice), so the room stops sending it; calls on the floor are unaffected.
Nobody is cut off mid-sentence, and nothing is billed without asking.

- At 80%: the quiet line on the Meetings page gains "More hours" for admins.
- At 100%: a small note on the Meetings page and the stage, "Video paused ·
  voice only until {date}", with "More hours" for admins.
- Upgrading lifts it at once: the API tells the room the new allowance.
- The room counts in its own SQLite and wakes by alarm when the hours would run
  out at the current rate; it copies the month's total to D1 for the API.

## Showing it, quietly

- **Meetings page:** one grey line under the list, "12 of 30 meeting hours used
  this month". Nothing on the stage until the hours are used.
- **Plan and billing:** a meter beside the members meter.
- **Pricing page:** each card has "Up to 10 people" and "30 meeting hours a
  month", with "Prices are monthly and don't include tax" under them.

## Plan and billing, rebuilt

1. **The plan:** name, price, next charge (date and the exact amount with tax,
   from Paddle), and status: renewing, ending on a date, or a payment problem.
2. **Usage:** members and meeting hours, each a meter, with the reset date.
3. **Plans side by side** with both limits; Choose, Switch, Cancel.
4. **Payment method:** card brand and last four, "Update" opening Paddle's
   checkout for that subscription only.
5. **Billing history:** every payment with date, what for, amount, status
   (paid, refunded, failed) and a PDF invoice.

## Found going over the payments code (all fixed)

- **Closing an office doesn't cancel its plan: Paddle would keep charging.**
  Fix: closing a renewing plan's office is refused (`cancel_plan_first`); once
  cancelled, closing ends the plan in Paddle at once.
- **The customer portal shows the payer's other subscriptions** to any admin
  who opens it. Fix: update the card through the subscription's own checkout,
  and show invoices ourselves; no portal.
- **Yearly** goes: one price per plan, the yearly prices archived in Paddle.
- **Guests:** the pricing cards still say "Guests on a link" and "guests never
  count"; offices have no guests. Both go.
- **Tax:** prices are before tax; the cards and Plan and billing say so.
- **The lobby's meetings** were unmetered and ours to pay for. Each lobby copy
  now gets 2 meeting hours a day (UTC), then voice only.

## How it's built

1. Realtime (`worker-realtime/src/meeting-clock.ts`, `room.ts`): meeting
   seconds with two or more people, per office per month or lobby copy per
   day; the allowance comes with the ticket and from the API on plan changes;
   video subscriptions close past it; totals copied to D1 (`usage_monthly`).
2. API (`worker-api/src/billing.ts`): plans carry hours, monthly prices only
   (`PADDLE_PRICES` is `{"team": "pri_…", "business": "pri_…"}`);
   `GET /billing` has usage; `GET /billing/details` has the next charge, card
   and this office's payments; `GET /billing/invoices/:txn`;
   `POST /billing/payment-method`; no portal; `DELETE /offices/:id` checks
   the plan.
3. Site: the counter and paused note (`components/meetings/MeetingHours.tsx`),
   Plan and billing (`PlanSection.tsx`), pricing cards, FAQ, terms and refunds.
4. Paddle sandbox: yearly prices archived; products describe their hours.
