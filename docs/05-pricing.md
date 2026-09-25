# 05. Pricing

> The tiers and fair-use numbers are settled in
> [08-pricing-decision.md](08-pricing-decision.md); billing in [09-billing.md](09-billing.md).

A proposal, with the arithmetic from `04-costs.md` behind it. Nothing here is
built yet; payments come after the model is agreed.

## The shape

We do not sell features. We sell **an office that holds more people**. Every
office gets the same product; the tier decides how many people can be members
of it. That keeps the free tier honest (it is the whole product, for a small
team) and keeps the upgrade moment obvious (a fourth person wants in).

| Tier | Members | Price | Notes |
|---|---|---|---|
| **Free** | 3 | — | one office, guests welcome, no image attachments |
| **Team** | 10 | $19 / month | attachments, guest links, office admin |
| **Office** | 25 | $39 / month | |
| **Floor** | 50 | $69 / month | |
| Beyond 50 | — | talk to us | |

Annual: pay for ten months, get twelve — a single discount, no second price
list.

Per-seat maths for comparison: $1.90, $1.56 and $1.38 a seat. Gather charges
$12–15 a seat. We are not competing on features with them; we are the thing a
five-person studio actually buys.

### Why not per-seat billing

Per-seat billing means proration, mid-cycle invoices, and a support burden that
a two-person company cannot carry. A flat price per tier is one Stripe
subscription, one number on the page, and one line on the invoice. Moving tier
is an upgrade, not an arithmetic problem.

## What a seat is

**Membership is the seat. An invitation is not, and being online is not.**

- An office at 10/10 members cannot admit an eleventh.
- If Alice *leaves* the office, it is 9/10 and someone else can join.
- If Alice is merely offline, it is still 10/10 and nobody else can join.
- Pending invitations do not hold a seat. Ten invitations sent to a 3-seat
  office is fine; the fourth person to *accept* is refused, and the admin is
  told why.

Guests never take a seat: they arrive on a link, cannot be an admin, and are
gone when the link expires. That is what keeps the free office genuinely
useful — a three-person studio can still hold a call with a client.

## Roles

Two, and no more:

| Role | Can |
|---|---|
| **Admin** | everything a member can, plus: invite and remove members, make another member an admin, rename the office, manage guest links, change room settings, hold the subscription |
| **Member** | be in the office, talk, chat, share, use guest links that already exist |

The person who creates the office is its first admin. The subscription belongs
to the office, not the person, so an admin can hand it over without the office
moving.

## What the free tier gives

Everything except the things that cost us money or invite abuse:

| | Free (3) | Paid |
|---|---|---|
| The office, the floor, walking, proximity calls | yes | yes |
| Meeting table, screen share | yes | yes |
| Chat: channels and direct messages | yes | yes |
| **Image attachments** | no — the button is there and says why | yes |
| Guest links | one at a time | as many as you like |
| Group video hours | fair use (below) | fair use (below) |

The public lobby shows the attachment button too, and says the same thing when
you press it: attachments live in a paid office. Better to show the shape of
the product and name the line than to hide the feature.

## Fair use on group video

From `04-costs.md`: ten people on camera in one meeting is ~7.4 GB an hour;
the same ten with cameras off is 1.3 GB. Unlimited group video at $19 a month
is a bet we would lose on a bad month.

So each office gets **included group-video hours**, and passing them degrades
rather than bills:

| Tier | Included group video | Past it |
|---|---|---|
| Free | 5 hours / month | meeting tables continue with audio + thumbnails |
| Team | 40 hours / month | same |
| Office | 100 hours / month | same |
| Floor | 200 hours / month | same |

Worst case at Team: 40 hours × 7.4 GB = 296 GB, $14.80 at list price against
$19 of revenue — and only if every hour is a full ten-person camera meeting,
which no office does. Typical use is proximity calls: two people through the
TURN relay, about 0.17 GB an hour, a cent an hour at list price.

Three rules make the cap almost never bite:

1. Meeting tables start **audio-first**; turning your camera on is a choice.
2. Thumbnails stay at 150 kbps; only an enlarged card gets 720p.
3. Proximity calls are not counted against the cap — two people through the
   relay cost a fraction of a meeting, and they are what the floor is for.

No overage charges, ever. A surprise bill would cost us more in trust than the
bandwidth costs in money.

## The upgrade moment

The admin invites a fourth person to a free office. The invite is accepted, the
seat check fails, and both sides are told plainly: *"Your office is full at 3
members. Upgrade to Team for 10."* One button, one Stripe checkout, the pending
member joins automatically when it clears.

Downgrade is the same in reverse and must be refused rather than destructive:
an office with 12 members cannot drop to Team (10) until two members are
removed. We never pick who loses their seat.

## What we are not doing

- No per-seat proration, no metered minutes on the invoice.
- No feature paywalls inside the product (except attachments, which is a cost
  and abuse line, and is stated as such).
- No trials that auto-cancel. The free tier is the trial, and it does not
  expire.
