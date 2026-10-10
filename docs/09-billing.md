# 09. Billing: who takes the money, and how it is built

First written 24 September 2026 for Paddle. Rewritten 10 October 2026, when
billing moved to Creem.

## The constraint

We sell from India, as an individual (no company yet), to customers all over
the world. That rules out the obvious choices:

- **Stripe is invite-only in India** (since May 2024, still true). No sign-up,
  and invites go to registered businesses.
- **Lemon Squeezy** belongs to Stripe and is moving its sellers to Stripe
  Managed Payments, which doesn't take India.
- **Razorpay** works for Indians but is a payment gateway, not a reseller: we
  would owe VAT, GST and US sales tax in every country a customer lives in.

So we use a **merchant of record (MoR)**: it sells to the customer in its own
name, collects and pays their sales tax, sends the invoice, handles refunds and
chargebacks, and pays us out. We have one customer (the MoR), not thousands.

## Why Creem, not Paddle

Paddle was the first pick. Its automated review rejected tinyfloor.com twice on
28 September 2026 as "Personal Websites/Social Networking", and the appeal was
turned down too. The MoRs that take an Indian individual, as checked on
9 October 2026:

| | Creem | Dodo Payments | Polar |
|---|---|---|---|
| Fee | **3.9% + 40¢**, no extra for non-US cards | 4% + 40¢, +1.5% non-US, +0.5% subscriptions | 5% + 50¢ for new stores, +1.5% non-US |
| On a $19 non-US sale | **$1.14** | $1.54 | $1.74 |
| Pays out to India | yes (bank transfer, 1st and 15th) | yes | through Stripe Connect Express |
| Would it take us | its bans are dating, AI companions and the like | bans "social interaction services", including video chat, plus VoIP | bans services for minors and "community access" |

**Creem**: cheapest, pays out to India, and nothing it bans resembles the
reason Paddle gave. **Dodo** is the fallback; ask compliance@dodopayments.com
before applying. Creem is Armitage Labs OÜ, in Estonia.

Before Creem's live review: the site has to read as team software (the
classroom and study room pages are gone), show prices, link the terms,
privacy and refund pages, and show a support email.

## Indian side of it (confirm with a CA)

- The MoR pays us in foreign currency, which makes each payout an **export of
  services**. The bank issues a FIRA for each one.
- **From 1 October 2026**, services exporters, freelancers included, must file an
  **Export Declaration Form (EDF)** with their bank for every export invoice.
  With an MoR that means one per payout, not one per customer.
- **GST**: registration is needed once turnover passes ₹20 lakh a year. Exports
  are zero-rated under a LUT.
- The income is business income in the ITR.

## Our build

The backend owns the plans (`GET /v1/plans`); the pricing page, the upgrade
dialog and every limit read that one list. Gates check limits, never "is pro".
`subscriptions` keeps one row per office: provider, customer, subscription,
plan, status, period end, cancel date, who paid.

### Worker (`worker-api/src/billing.ts`)

| Route | Who | Does |
|---|---|---|
| `GET /v1/plans` | anyone | plans, member limits, meeting hours, prices, and whether they're on sale here |
| `GET /v1/offices/:id/billing` | admin | plan, members, meeting hours used this month, subscription status |
| `GET /v1/offices/:id/billing/details` | admin | next charge, and this subscription's payments (from Creem) |
| `POST /v1/offices/:id/billing/checkout` `{plan}` | admin | a Creem checkout with `metadata.office_id` and `payer_id`; returns its URL |
| `POST /v1/offices/:id/billing/sync` `{checkoutId}` | admin | right after paying: the subscription from Creem's record of that checkout |
| `POST /v1/offices/:id/billing/change` `{plan}` | admin | upgrade or downgrade, prorated now. **Refuses a downgrade below the current member count** |
| `POST /v1/offices/:id/billing/cancel`, `/resume` | admin | cancel at the end of the period, or take that back |
| `POST /v1/offices/:id/billing/portal` | **the payer** | Creem's customer portal: the card and the invoices |
| `POST /v1/billing/webhook` | Creem | verifies the signature, applies the event |

The webhook and the worker's own calls are the only writers of `offices.plan`,
`offices.seats` and `subscriptions`:

1. Verify `creem-signature`: HMAC-SHA256 of the raw body with the endpoint
   secret, in hex, compared in constant time. It carries no timestamp, so
   replays are caught by the event ID.
2. Skip events already seen (`billing_events`).
3. `subscription.*` → upsert `subscriptions`, set the office's plan and seats
   from the product. `checkout.completed` does the same, with the office from
   the checkout's metadata.
4. `active`, `trialing`, `past_due` (Creem retrying the card) and
   `scheduled_cancel` hold the plan. Anything else (`canceled`, `unpaid`,
   `paused`) puts the office back on free, 3 seats. Nobody is removed.
5. An older event never undoes a newer one (`changed_at` from `updated_at`), and
   an older subscription ending never takes the plan from the current one.

**The portal is the payer's only.** Creem's portal shows everything its
customer buys through Creem, so another admin of the office mustn't open it.
Creem's API doesn't expose the card or invoice files, so the billing page's
card row and invoice buttons open the portal.

Config: `CREEM_ENV` (`test` or `live`), `CREEM_PRODUCTS` (`{"plus": "prod_…",
"pro": "prod_…"}`), and the secrets `CREEM_API_KEY` and `CREEM_WEBHOOK_SECRET`.
Billing is off wherever the products or the key are missing. Preview runs
against Creem's test mode; live stays off until Creem has reviewed the store.

### Frontend

- `usePlans()` (`web-shared/src/lib/billing.ts`) from `/v1/plans`.
- The checkout opens over the page with `@creem_io/embed`
  (`app-frontend/src/lib/checkout.ts`). Paid, the app asks `sync` until the plan
  has landed. Only the app sells; the site links to `/create?plan=`.
- Billing lives in office settings (`PlanSection.tsx`).

### Tools

- Creem CLI: `npm i -g @creem_io/cli`, then `creem whoami`, `creem
  subscriptions list --json`, `creem listen --forward-to …` for webhooks on a
  local server.
- Creem's MCP server ships in its SDK: `npx -y --package creem -- mcp start
  --api-key … --server test`. `--server test` is needed for test keys.
- Agent guide: https://creem.io/SKILL.md; full docs:
  https://docs.creem.io/llms-full.txt.

## To decide

- **An office over its limit after cancelling.** Nobody is removed and nobody
  new can join; after a 14-day grace only admins can walk in.
- **Yearly.** Not offered yet.
