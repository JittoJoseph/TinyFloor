# 09. Billing: who takes the money, and how it is built

Checked on 24 September 2026. Nothing here is built.

## The constraint

We sell from India, as an individual (no company yet), to customers all over
the world. That rules out the obvious choice:

- **Stripe is invite-only in India** (since May 2024, still true). No sign-up,
  and invites go to registered businesses. The way round it is a company (an
  Indian Pvt Ltd and hope for an invite, or a US LLC through Stripe Atlas),
  which is cost and paperwork for revenue we do not have yet.
- **Lemon Squeezy** now belongs to Stripe and is moving its sellers to Stripe
  Managed Payments, which needs a Stripe account. Same wall.
- **Razorpay** works for Indians but is a payment gateway, not a reseller: we
  would owe VAT, GST and US sales tax in every country a customer lives in.

So we use a **merchant of record (MoR)**: it sells to the customer in its own
name, collects and pays their sales tax, sends the invoice, handles refunds and
chargebacks, and pays us out. We have one customer (the MoR), not thousands.

## The three that take an Indian individual

| | Paddle | Dodo Payments | Polar |
|---|---|---|---|
| Individual, no company | yes (no business documents asked of sole traders) | yes | yes |
| Fee | **5% + 50¢**, flat | 4% + 40¢, **+1.5%** non-US cards, **+0.5%** subscriptions | 5% + 50¢, **+1.5%** non-US cards |
| On a $19 non-US sale | **$1.45** | $1.54 | $1.74 |
| On a $19 US sale | $1.45 | $1.26 | $1.45 |
| Payout | bank transfer in USD (or EUR, GBP…) | USD, GBP… (INR payouts dropped) | Stripe Connect Express, works in India |
| Indian customers | cards | cards **and UPI in INR** | cards |
| Track record | the long-standing MoR for software | young, Indian | young, open source |

**Use Paddle.** Our customers are mostly outside the US, and Paddle's flat fee
is the cheapest for them and the simplest to reason about. It has the
subscription features we need (plan changes, customer portal, localised
prices) and the longest record.

**Dodo is the fallback** if Paddle's review says no or drags on. Paddle reviews
the site before it goes live: it wants a working product, the pricing page, and
terms, privacy and refund policies on our domain. Have those up before
applying.

Keep the code provider-shaped, not Paddle-shaped (below), so switching is a
new adapter rather than a rewrite.

## Indian side of it (confirm with a CA)

- The MoR pays us in foreign currency, which makes each payout an **export of
  services**. The bank issues a FIRA for each one.
- **From 1 October 2026**, services exporters, freelancers included, must file an
  **Export Declaration Form (EDF)** with their bank for every export invoice
  (FEMA Export and Import of Goods and Services Regulations, 2026). With an MoR
  that means one invoice per payout, not one per customer: about twelve a year.
  Invoices up to ₹10 lakh can usually be settled with a self-declaration.
- **GST**: registration is needed once turnover passes ₹20 lakh a year. Exports
  are zero-rated under a LUT.
- The income is business income in the ITR.
- Worth reading the employment contract for clauses on outside work and IP
  before taking money.

## How LargeFileTransfer does it

The company product uses Stripe, but the shape is provider-neutral and worth
copying:

- **The backend owns the plans.** `GET /subscription/plans` (public) returns
  every plan's price in cents keyed `month` / `year`, and its limits. The pricing
  page, the upgrade dialog and every gate read that one list, so they cannot
  disagree.
- **Entitlements, not flags.** `GET /subscription/entitlements` returns this
  account's plan and limits; the frontend gates on those
  (`useCapabilities()`), never on "is pro".
- **Two POSTs that return a URL**: `/subscription/checkout {plan, interval}` →
  hosted checkout, and `/subscription/portal` → hosted billing portal. The
  frontend only ever redirects.
- **The upgrade opens in place.** Hitting a limit opens one shared upgrade dialog
  (`useUpgrade().open(copy)`) with the same pricing card as `/pricing`, never a
  navigation. The CTA covers three cases: signed out → sign in and come back;
  already on this plan → portal; otherwise → checkout.
- Webhooks, on the backend, are the only thing that changes a plan.
- One currency constant (`BILLING_CURRENCY = "USD"`) that checkout and analytics
  both read.

## Our build

The schema is mostly there: `offices.plan` and `offices.seats` exist, the seat
check happens at invite-accept, and `subscriptions` (one row per office:
provider, customer id, subscription id, plan, status, period end) has been in
D1 since `0001`.

### Worker (`worker-api`)

| Route | Who | Does |
|---|---|---|
| `GET /v1/plans` | anyone | tiers, member limits, prices, table-video allowance. The one source |
| `POST /v1/offices/:id/billing/checkout` `{tier, interval}` | admin | creates a Paddle transaction with `custom_data.office_id`, returns its id for Paddle.js |
| `POST /v1/offices/:id/billing/change` `{tier, interval}` | admin | upgrade or downgrade an existing subscription. **Refuses a downgrade below the current member count** |
| `POST /v1/offices/:id/billing/portal` | admin | Paddle customer-portal session URL (card, invoices, cancel) |
| `POST /v1/billing/webhook` | Paddle | verifies the signature, applies the event |

The webhook is the only writer of `offices.plan`, `offices.seats` and
`subscriptions`:

1. Verify `Paddle-Signature` (HMAC-SHA256 of `ts:body` with the endpoint
   secret, Web Crypto, constant-time compare). Reject old timestamps.
2. Skip events already seen: a small `billing_events (id PRIMARY KEY)` table,
   and the one new migration.
3. `subscription.created` / `updated` → upsert `subscriptions`, set the office's
   plan and seats from the price id.
4. `past_due` → keep the plan, show the admin a banner. Paddle retries the card.
5. `canceled` → at period end, plan back to `free`, seats back to 3. Nobody is
   removed.

Plan changes go through our `change` route, not the portal, so the member-count
check cannot be skipped. Turn plan switching off in Paddle's portal.

Secrets (`wrangler secret put`): `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`.
Preview uses Paddle's sandbox and its own keys, live uses live, the same split
as TURN.

### Frontend (`frontend-nextjs`)

- `usePlans()` from `/v1/plans`; the pricing page and the upgrade dialog render
  the same card from it.
- The upgrade moment in `05-pricing.md`: the fourth person's accept fails with
  `office_full`, and the admin's People view opens the upgrade dialog in place.
- Paddle.js loaded only on the pricing page and the dialog.
- Billing lives in office settings: current tier, members used, next charge,
  "Manage billing" → portal.

### Order

1. `GET /v1/plans`, and the pricing page from it.
2. Metering: count proximity minutes next to table minutes in `usage_daily`.
3. Paddle sandbox: checkout, webhook, the plan landing on the office.
4. Change, cancel, portal, past-due banner.
5. Paddle live review, then switch preview/live keys.

## To decide

- **An office over its limit after cancelling.** A 25-member office goes back to
  3 seats. Suggested: nobody is removed and nobody new can join; after a 14-day
  grace only admins can walk in, and they see "remove members or resubscribe".
- Whether yearly is offered from day one. Suggested yes: one fixed 50¢ fee a year
  instead of twelve, and the money up front.
