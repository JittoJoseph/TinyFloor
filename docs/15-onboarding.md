# 15. Onboarding, the invite link, and choosing a plan

Decided and built on 28 September 2026. How someone gets from the landing page
to a floor with their team on it, and where the first chance to pay sits.

## Office, not workspace

We keep **office**. The whole product is the metaphor: a floor, desks, walking
over to someone. "Workspace" is Slack's and Notion's word, abstract, and it
reads as software to people who aren't technical. "Virtual office" is also
what people search for. The plans are no longer named after offices (below),
so "office" means only the place.

## Plan names: Free, Plus, Pro

Team and Business named the plans after how big the company is, and "Team
office" or "Business office" read oddly. Tier names say which is higher
without saying who it's for:

| Plan | Price | People | Meeting hours a month |
|---|---|---|---|
| Free | $0 | 3 | 5 |
| Plus | $19 | 10 | 30 |
| Pro | $49 | 25 | 60 |

Plus below Pro is the order people already know (ChatGPT, Google, Apple).
"Premium" was dropped: nobody agrees whether it sits above or below Pro. The
ids changed too (`plus`, `pro`; migration 0011), and so did the Paddle
products' names.

## Signing up

1. **Sign in, Google first.** Google is one tap and gives us a verified email
   and a real name. The email form waits behind "Continue with email" instead
   of competing with it: two equal choices slow people down.
2. **Name, then character**, as two steps of one door. Each step asks one
   thing. The name starts filled in from Google, so most people just press
   Continue.
3. **Dashboard.** With no office yet, it has one thing to do, "Create your
   office", with pasting an invite link and the public lobby below it and
   quieter.

Someone who already walked in as a guest in this browser keeps the name and
character they chose then, and skips step 2.

## The invite link

Each office has **one link**, the same for everyone in it, good for as many
people as there are seats (migration 0012, `offices.invite_code`). Anyone in
the office can share it, from People, the floor's Invite button or chat.
Admins can reset it, and the old link stops working at once.

This replaces one-use invitations that were made on every click of Invite.
Those piled up in a list nobody read, and a link sent to a group chat only
worked for the first person. Invitations made before the change still work
until they expire (a week at most).

**Only the public lobby has guests.** Joining an office always needs an
account.

**Joining from a link:**

1. The door shows the office: its mark, its name, how many are in it.
2. Sign in, Google first.
3. Name, then character, for someone new.
4. They're in: the office is joined automatically and waiting on their
   dashboard, with Walk in as the main button.

Someone signed in with a character already joins with one press. A full
office says so on the door instead of failing after sign-up.

## Making an office, and the plan

Three steps in one door, each asking one thing:

1. **Name.** The office is created as soon as it has a name. A small preview of
   the floor shows their own character already at a desk: that is what the
   name is for. Leaving at any point after this still leaves them an office on
   Free.
2. **How many people will work here?** 2–3, 4–10, 11–25, 26+. This is the most
   useful question we can ask:
   - It makes the free plan's limit concrete without spelling it out.
     Someone who answers 4–10 has just said that Free doesn't fit.
   - Asking before showing prices is what Slack, Notion and Linear do. An
     answer given is a small commitment, and it lets us recommend one plan
     instead of showing a menu.
3. **The plan.**
   - **The plan that fits is already picked** and marked "Best fit": Plus for
     up to 10, Pro above. A plan that is too small for the size they gave
     shows its limit in amber.
   - **Two cards, Plus and Pro, not three.** Free is a quiet line under the
     button: "Start on Free instead · only 3 people can join" (or "…for up to
     3 people" for 2–3). Free is always there, never the obvious choice.
   - **The price per person** under each price ($1.90 on Plus, $1.96 on Pro).
     Next to per-seat competitors at $8–16 a person, that is the number that
     sells.
   - **The main button says what it buys**: "Get Plus · $19/month". It opens
     Paddle's checkout over the door. Paid, the plan lands and they walk in.
     Closed, they are back on the same step.
   - **Meeting hours are behind "What's included"**, next to "walk-up calls,
     never counted". Most teams won't come near the limit, so a number that
     looks like a cap shouldn't be the first thing they read. It is still one
     tap away, and on the pricing page, Paddle's checkout and the terms.

Where paid plans aren't on yet (production, until Paddle approves the
account), naming the office is the only step.

## Rules every door follows

- **The main button never moves.** Every step is the same height, and the
  button sits at the bottom, so people can keep pressing the same place, on a
  phone with their thumb. The quiet line under it keeps its space even when
  empty, and anything that doesn't fit scrolls inside the step, never pushing
  the button.
- **One question per step**, a line under it saying why, and a Back link above
  it from the second step on.
- **Dots for where they are**, in the door's header.
- **On a phone the door is a sheet at the bottom of the screen**, where thumbs
  are. Centred on a wider screen.
- **Errors appear under the question** and scroll themselves into view.

## What to measure

The events are already sent (PostHog):

- `office_created`
- `onboarding_checkout_opened` (with the plan)
- `onboarding_plan_bought` (with the plan and team size)
- `onboarding_stayed_free` (with the team size)
- `office_invite_shared`
- `office_invite_accepted`

The rate to watch is checkouts opened per office created, split by team size.
If 4–10 teams still mostly choose Free, the next thing to try is a 14-day
trial of Plus, card up front, through Paddle's trial prices.
