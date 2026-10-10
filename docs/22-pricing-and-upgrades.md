# 22. Pricing, unit economics and how an office moves up

Researched 10 October 2026. Builds on `08` (costs), `09` (Creem), `14` (plans
with meeting hours) and `15` (onboarding).

## Where we are

From the live database on 10 October:

- 55 accounts, 28 offices. Sign-ups are picking up: 21 in the last week.
- **22 of the 28 offices have one member.** 5 have two, 1 has three. No office
  has ever been full.
- 0.7 meeting hours used in all of October, across every office.

Nobody is near a limit, and most offices never get a second person. **The
problem to solve first is getting a team into an office, not where the paywall
sits.** Every number below assumes that gets fixed; until it does, pricing is
not what holds revenue back.

## What the others charge (checked 10 October 2026)

| Product | Free | Paid | Counted by |
|---|---|---|---|
| Gather | 30-day trial | $12 | member |
| Kumospace | 5 members | $16, minimum 5 | member |
| SoWork | 10 members, 30-min meetings | $5.40 / $12 | member |
| WorkAdventure | 10 online at once | from €8 | person online at once |
| oVice | small space | $65 a space (≈10 people), or $16 a user, 20 minimum | space or user |
| flat.social | 5 at once | $6 | seat |
| Roam | 14-day trial | ₹888 (India) | active member |
| SpatialChat | 2 h a day, 12 people | $399 a month (events) | event |
| Slack | 90 days of history, 1:1 huddles | ≈$8.75 | member |
| Zoom | 40-minute meetings | $14–17 | host |
| Linear | 250 issues, 2 teams | $10 / $16 | member |

Everyone in this market charges per person. A 10-person team pays $54 at the
cheapest (SoWork) and $120–160 at Gather or Kumospace. **TinyFloor's $19 for 10
is 65–90% under**, and flat: a 6-person team pays $19, not 6 × $12.

What the free plans gate:

- **Time**: Zoom (40 minutes), SoWork (30 minutes), SpatialChat (2 h a day).
- **History**: Slack (90 days).
- **Volume**: Linear (issues), Loom (videos).
- **People**: Kumospace, flat.social, WorkAdventure.

The ones people talk about fondly (Linear, Slack) gate on something that grows
with use, not on trying the product.

## What one office costs us

Media is the only cost that grows with use: Cloudflare Realtime at **$0.05/GB**
after the first 1,000 GB a month (shared by the meeting server and the call
relay; ingress is free). Everything else rounds to zero; fixed costs are about
$10 a month.

| | Rate |
|---|---|
| Meeting hour, 10 people (worst: all cameras / typical) | $0.16 / $0.06 |
| Meeting hour, 25 people | $0.40 / $0.15 |
| Call on the floor, camera on, per hour | ≈$0.011 (0.22 GB) |
| Creem, per payment | 3.9% + 40¢ |
| Creem, per payout | $7 or 1%, whichever is more |

Per office per month, with every plan's hours used up and calls at the busy end
of `08`:

| Plan | Price | Creem | Meetings (worst / typical) | Calls (busy / typical) | Payout | Left, worst | Left, typical |
|---|---|---|---|---|---|---|---|
| Free (3, 5 h) | $0 | — | $0.25 / $0.10 | $0.22 / $0.10 | — | −$0.47 | −$0.20 |
| Plus (10, 30 h) | $19 | $1.14 | $4.80 / $1.80 | $1.80 / $0.90 | $0.19 | **$11.07 (58%)** | **$14.97 (79%)** |
| Pro (25, 60 h) | $49 | $2.31 | $24.00 / $9.00 | $4.55 / $2.30 | $0.49 | **$17.65 (36%)** | **$34.90 (71%)** |

- **All of it is free until 1 TB a month**: about 100 busy free offices, or 15
  heavily used paid ones, before Cloudflare bills anything.
- One Plus office covers the fixed costs. 100 Plus offices ≈ $1,500 a month left.
- At 5% churn a month (typical for small teams), a Plus office stays ~20 months:
  **≈$300 of margin each**. That is the most a sign-up can cost us to win.
- Pro's worst case is thin, but only if 25 people sit in 60 hours of meetings
  with every camera on. The hours cap bounds it; that is what it is for.
- Withdraw from Creem once a month, not twice: the payout fee is per payout.

## What converts

Benchmarks (vendor reports, so treat them as ranges):

- **Freemium**: 2–5% of free accounts ever pay. ChartMogul's 200-product survey
  puts the median at 8% within six months, with a quarter under 2.5%.
- **Free trial**: 15–25% of trials pay, but fewer people start one.
  Per 1,000 visitors, freemium and trials end up close.
- **Reverse trial** (start on the paid plan, fall back to free): 8–24%. It
  keeps freemium's top of funnel and gives everyone the paid product to lose.

Patterns from products known for good upgrades:

- **Gate what grows with use, not what lets people try** (Linear's issues,
  Slack's history, Loom's video count). Our meeting hours are this.
- **Show the meter before the wall.** Loom counts videos ("18 of 25"), Vercel
  shows usage bars, Linear shows issues used in settings. Nobody should meet a
  limit they never saw coming.
- **Upgrade where the limit is felt, in place.** Zoom's 40-minute warning, and
  Notion's "invite more than 1 guest" prompt, open the upgrade right there.
  Nobody is sent to a settings page to work it out.
- **Every plan side by side, the current one marked.** Linear, Vercel, Raycast
  and Notion all show the whole ladder, never only the next rung.
- **Don't charge before the value.** Notion, Linear and Slack ask for nothing
  until a team is using it. Our onboarding asks for a plan before anyone else
  has joined.

## Recommendation

### Prices: keep them for now

$19 for 10 and $49 for 25 stay. $19 sits under the ~$20 a team lead pays on a
card without asking anyone, and the gap to per-person pricing is the pitch.
Revisit after 20 paying offices: if Plus sells easily, raise it for new offices
first (`08` already found room up to $29 / $59).

### Free for 3, and a team trial when a team moves in

- **Free stays at 3 people and 5 meeting hours**, forever. Enough for someone
  to try TinyFloor with a colleague or two; not enough for a team to live in.
- **The 4th person never meets a wall.** When a free office is full and one
  more person comes to join, the office goes on **Plus for 14 days, no card**,
  instead of turning them away. Everyone after them gets in too (10 seats,
  30 meeting hours).
  - It starts when a team commits, not when two people poke around: pairs and
    trios testing the product stay on free and never spend it.
  - It removes the likely reason people left after trying an office: three
    seats, then a locked door, at the exact moment a team was moving in.
- **When it ends**, without a plan, the office is back on Free. Nobody is
  removed, nothing is deleted, but only 3 can be on the floor at once and no one
  new can join (the existing over-limit rule). A whole team that has moved in
  and built a habit is the strongest reason to pay we can create, and it's
  honest: they keep everything, they just can't all be in at once.
- Once per office; never for an office that has paid. Only where paid plans are
  on sale, so production doesn't hand out a plan it can't sell.

### No card for the trial

A card-up-front trial converts more of its trials, and some revenue would come
from people who forget to cancel. We don't want that revenue:

- Forgotten charges come back as refund requests (we refund within 14 days) and
  chargebacks. Creem charges for disputes, and a store with many can be closed.
- Creem reviews stores for dark patterns.
- It's the opposite of the "one small bill" promise.

### Monthly only

Decided 10 October: no yearly plan. One price per plan, monthly, cancel any
time.

### Free isn't offered inside the office

Inside an office, Plan and billing and the upgrade dialog offer only Plus and
Pro. An office on Free says so at the top; going back to Free is cancelling,
a quiet link at the bottom. Its dialog says what the team would lose (who could
be on the floor at once, the meeting hours), offers the smaller paid plan when
the team fits it, and makes keeping the plan the main button. Cancelling stays
one click away: nothing is hidden or made hard, which would only turn into
refund requests and chargebacks.

### When to ask, and how

| Moment | Who sees it | What they get |
|---|---|---|
| Making an office | the creator | **No plan step.** Name, the invite link, walk in. The note: free for 3; invite more and the team gets Plus free for 14 days. A plan picked on the pricing page still goes to checkout. |
| Free office, 3 of 3 | admins | People and Plan and billing: "Invite more than 3 people and your whole team gets Plus free for 14 days." The invite button stays. |
| 4th person joins | everyone | The trial starts. Plan and billing: "Your team is trying Plus until Oct 24", with Keep Plus. |
| During the trial | everyone | The rail's office menu: "Plus trial · 9 days left"; admins also get "Choose a plan". |
| Inviting past the seats (trial used) | admins | The upgrade dialog, in place: "Northwind is full", the plan with room for everyone marked. |
| Someone can't join (office full) | them | The invite page says the office is full. Telling its admins is still to build. |
| 80% of meeting hours | admins | The meter on Meetings turns amber, with "Get more hours". |
| Hours used up | everyone | "Video paused · voice until Nov 1"; admins get "Get more hours". |
| Any time | admins | Plan and billing: every plan side by side, the current one marked. |

One **upgrade dialog** serves these. It shows all three plans, the current one
marked, the one that fixes the problem marked too, and checkout right there.
Members see the same plans and who can change them.

## What's built (10 October)

- **The upgrade dialog** (`components/billing/Upgrade.tsx`): every plan, the
  one that answers the reason marked, checkout in place. Opened from Meetings
  ("Get more hours", and the paused-video note), People (office full) and the
  rail's office menu.
- **Plan and billing**: the paid plans side by side (`PlanCards.tsx`), the
  current one marked; Choose, Upgrade, Move to. Free isn't offered as a card:
  leaving a plan is Cancel, which lists what the team loses, offers the plan
  below, and keeps Keep as the main button.
- **Meetings**: Meet's "Ready to join?". You on the left, big, with the mic
  (the same switch as in a meeting) and the camera (whether you go in with it
  on, remembered, previewed live with the mic's level). On the right the
  office's meeting, one line of who's in it ("Priya, Ana, 17 others") and Join
  now, built like the doors (a black bezel with a panel set in). Under them,
  other meetings on now and who's free to talk, a meeting with them one press
  away. The month's hours as one quiet line at the page's foot. No floor
  drawing and no explaining how meetings work.
- **In a meeting**: Meet's spotlight. One big card (what you pinned, a shared
  screen, else whoever is talking once the last speaker has paused) and a
  column of four: you, the people who spoke last, and "n others". Only those
  cards' video is received, so a 25-person meeting costs about four streams,
  and yours is never received. One bar under the stage: the time and the
  meeting on the left, the controls in the middle, the people button on the
  right, which opens who's in and "Ask people in", the only way to invite.
  Tiles are flat cards: the circle without glow, a mic-off badge or moving
  bars in the corner, a ring while talking. Nothing pulses. In a meeting: a grid in join order that
  includes you; pin or a shared screen goes big with the rest in a column on
  the right, as many as fit and a count of the rest.
- **People**: one searchable list, you first, then whoever is on the floor;
  the invite link and the seats side by side above it, with "Get more seats"
  on the seats when they're all taken.
- **Onboarding**: name, then the invite link, then the floor. The size and
  plan steps are gone; `/create?plan=` from the pricing page still goes to
  checkout after the name.
- **The team trial**: `TRIAL_DAYS` in `worker-api/src/billing.ts` (0 turns it
  off), `offices.trial_ends_at` (migration 0015). Starts when someone joins a
  full free office that still has it (`startTrialIfFull`); ends in the daily
  run, or the moment the office is next read. `trialOpen` on the office tells
  the app it's waiting.

## Next: make the product worth moving into

Pricing isn't what holds revenue back yet; 22 of 28 offices never got a second
person. The work that matters most now is the first ten minutes:

- What a person alone in a new office sees, and how quickly it gets them to
  send the link.
- What the first colleague sees when they open the link.
- Where people drop off: sign-up, naming, inviting, first call. PostHog has the
  events (`office_created`, `onboarding_invite_shared`, …); a funnel from them
  says where to look first.

## To decide

- The price review after 20 paying offices.
- Whether to say "Plus free for 14 days when your team moves in" on the pricing
  page once paid plans are on sale.
