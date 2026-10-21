# Billing: who takes the money

How TinyFloor gets paid, and what isn't obvious from `worker-api/src/billing.ts`.

## Why a merchant of record, and why Creem

We sell from India, as an individual (no company), to customers everywhere:

- **Stripe is invite-only in India** (since May 2024), and invites go to
  registered businesses.
- **Lemon Squeezy** is moving its sellers to Stripe Managed Payments, which
  doesn't take India.
- **Razorpay** is a gateway, not a reseller: we'd owe VAT, GST and US sales
  tax in every customer's country.

So a merchant of record sells in its own name, handles tax, invoices, refunds
and chargebacks, and pays us out. Compared on 9 October 2026:

| | Creem | Dodo Payments | Polar |
|---|---|---|---|
| Fee | **3.9% + 40¢**, nothing extra for non-US cards | 4% + 40¢, +1.5% non-US, +0.5% subscriptions | 5% + 50¢ for new stores, +1.5% non-US |
| Pays out to India | yes (bank transfer) | yes | through Stripe Connect Express |
| Risk for us | bans dating, AI companions and similar | bans "social interaction services", video chat and VoIP | bans services for minors and "community access" |

Creem is Armitage Labs OÜ, Estonia. Dodo is the fallback; ask
compliance@dodopayments.com before applying.

## Paddle said no, and why that matters for copy

Paddle's automated review rejected tinyfloor.com twice on 28 September 2026
as "Personal Websites/Social Networking"; the appeal was rejected too. The
site had invited it: a public lobby to "meet people", coworking "with friends
or strangers", a study room, an #introductions channel. **Keep every word on
the site to one line: offices for teams, joined by invite, paid per office.**
The public lobby is "the demo office", for trying TinyFloor, not for meeting
anyone. Never describe calls as VoIP or the product as social.

## Creem's review

Creem reviews the store before live payments, in 1–2 working days, and a
rejection blocks re-review for three months. What it checks, and where we
stand: a live product; no fake reviews, testimonials or inflated counts;
privacy policy and terms; pricing visible; the support email
(support@tinyfloor.com) on the site, inside the app and on receipts (the
store's contact email); cancelling from inside the product. Its compliance
team may test-buy with a 100% discount code, so live checkout must work
before the review. Submitted 11 October 2026.

## Things about Creem the code assumes

- **Webhook signatures** are HMAC-SHA256 of the raw body, hex, with no
  timestamp, so replays are caught by remembering event IDs
  (`billing_events`). An older event never undoes a newer one, and an older
  subscription ending never takes the plan from the current one.
- **Statuses:** `active`, `trialing`, `past_due` (Creem retrying the card)
  and `scheduled_cancel` keep the plan; anything else puts the office back on
  Free. Nobody is ever removed.
- **The customer portal is the payer's only.** It shows everything that
  customer buys through Creem, so no other admin may open it. Creem's API
  doesn't expose the card or invoice files, so the billing page sends the
  payer to the portal for both.
- **The trial is ours, not Creem's.** Creem's trials are set on the product
  and start at checkout, so they need a card up front; ours needs none
  (`pricing.md`), so it lives in `offices.trial_ends_at` and Creem only ever
  sees a plain subscription. Buying during the trial starts billing that day;
  the days left aren't carried over.
- **Closing an office with a renewing plan is refused** until the plan is
  cancelled; otherwise Creem would keep charging for an office that's gone.
- **Prices apply to new checkouts only.** Changing a product's price never
  touches existing subscriptions.
- **The CLI** (`@creem_io/cli`) fails to log in when any product has a null
  `tax_mode` (dashboard-made products do); set products to `exclusive`, or
  use the REST API with `x-api-key`. Under Git Bash, set `MSYS_NO_PATHCONV=1`
  before passing `/v1/...` arguments.
- Docs for agents: https://docs.creem.io/llms-full.txt.

## Where it's configured

| | Test (preview, local) | Live (production) |
|---|---|---|
| `CREEM_ENV` | `test` | `live` |
| Product | `prod_2bvC3UGSNphGww4yBDFhl4` | `prod_6iSp1sE8bOswtEIbp520VU` |
| Webhook | `wh_test_2USVepwWTthY84IRhUuk7m` → api-preview | `wh_5cS7ul9sdaLN9PFPU6E0Fz` → api.tinyfloor.com |

`CREEM_PRODUCTS` maps `{"pro": …}` in `wrangler.jsonc`; `CREEM_API_KEY` and
`CREEM_WEBHOOK_SECRET` are secrets. Billing is off wherever either is
missing. Live payments went on 11 October 2026.

## The Indian side (confirm with a CA)

- Each payout is an **export of services**; the bank issues a FIRA for it.
- **From 1 October 2026**, services exporters, freelancers included, file an
  **Export Declaration Form** with their bank for every export invoice. With
  a merchant of record, that's one per payout.
- **GST** registration is needed past ₹20 lakh a year; exports are zero-rated
  under a LUT.
- The income is business income in the ITR.
