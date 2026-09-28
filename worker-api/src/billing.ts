import { realtime, requireOffice, seatsUsed, type Office } from "./access";
import { HttpError, json, readJson } from "./http";
import type { Router } from "./router";
import { requireUser } from "./session";

/**
 * Paid plans, sold through Paddle as the merchant of record (docs/09-billing.md,
 * docs/14). A plan is how many people an office holds and how many meeting
 * hours a month it includes. An office's plan changes in one place only: here,
 * from a subscription Paddle vouches for, either in a signed webhook or in the
 * reply to a request this worker made itself.
 */

export type PlanId = "free" | "plus" | "pro";

export interface Plan {
  id: PlanId;
  seats: number;
  /** Meeting hours a month: time a meeting has two or more people in it (docs/14). */
  meetingHours: number;
  /** US cents a month, before tax; null for the free plan. Monthly only. */
  price: number | null;
}

export const PLANS: Plan[] = [
  { id: "free", seats: 3, meetingHours: 5, price: null },
  { id: "plus", seats: 10, meetingHours: 30, price: 1900 },
  { id: "pro", seats: 25, meetingHours: 60, price: 4900 },
];

const FREE = PLANS[0];
export const planById = (id: string) => PLANS.find((plan) => plan.id === id);

/** An office's meeting hours a month, from its plan. */
export const meetingHoursOf = (plan: string) => (planById(plan) ?? FREE).meetingHours;

/** Subscriptions in these states hold their plan; a card being retried still counts. */
const HOLDS_PLAN = new Set(["active", "trialing", "past_due"]);

/** How old a webhook's signature may be. Retries are signed afresh, and replays are deduplicated anyway. */
const SIGNATURE_TOLERANCE_S = 300;

/** How many past payments the billing page lists. */
const HISTORY = 24;

type PriceIds = Partial<Record<Exclude<PlanId, "free">, string>>;

interface BillingConfig {
  environment: "sandbox" | "production";
  clientToken: string;
  prices: PriceIds;
}

/**
 * Billing is on where Paddle is configured: the monthly price IDs, the
 * client-side token and the API key. The live system has none until Paddle has
 * verified the account, so it keeps saying "coming soon" while preview sells
 * against the sandbox.
 */
function config(env: Env): BillingConfig | null {
  if (!env.PADDLE_PRICES || !env.PADDLE_CLIENT_TOKEN || !env.PADDLE_API_KEY) return null;
  let prices: PriceIds;
  try {
    prices = JSON.parse(env.PADDLE_PRICES) as PriceIds;
  } catch {
    return null;
  }
  return {
    environment: env.PADDLE_ENV === "production" ? "production" : "sandbox",
    clientToken: env.PADDLE_CLIENT_TOKEN,
    prices,
  };
}

function requireConfig(env: Env): BillingConfig {
  const found = config(env);
  if (!found) throw new HttpError(503, "billing_off", "Paid plans aren't available yet");
  return found;
}

function priceFor(billing: BillingConfig, plan: PlanId): string {
  const id = plan === "free" ? undefined : billing.prices[plan];
  if (!id) throw new HttpError(400, "bad_plan", "No such plan");
  return id;
}

/** Which plan a Paddle price stands for, or null for a price that isn't ours. */
function planForPrice(billing: BillingConfig, priceId: string): Plan | null {
  const found = Object.entries(billing.prices).find(([, id]) => id === priceId);
  return found ? (planById(found[0]) ?? null) : null;
}

function readPlan(body: Record<string, unknown>): Exclude<PlanId, "free"> {
  if (body.plan !== "plus" && body.plan !== "pro") throw new HttpError(400, "bad_plan", "Pick a plan");
  return body.plan;
}

// ---- Paddle's API -----------------------------------------------------------

/** A subscription as Paddle sends it, trimmed to what we read. */
export interface PaddleSubscription {
  id: string;
  status: string;
  customer_id: string;
  custom_data?: { office_id?: string } | null;
  updated_at: string;
  next_billed_at?: string | null;
  current_billing_period?: { ends_at: string } | null;
  scheduled_change?: { action: string; effective_at: string } | null;
  items: Array<{ price: { id: string } }>;
  next_transaction?: { details?: { totals?: { grand_total?: string; currency_code?: string } } } | null;
}

interface PaddleTransaction {
  id: string;
  status: string;
  subscription_id: string | null;
  custom_data?: { office_id?: string } | null;
  created_at: string;
  billed_at: string | null;
  items?: Array<{ price?: { id: string } }>;
  details?: { totals?: { grand_total?: string; currency_code?: string } };
  adjustments_totals?: { breakdown?: { refund?: string } } | null;
  payments?: Array<{
    status: string;
    method_details?: { type?: string; card?: { type?: string; last4?: string; expiry_month?: number; expiry_year?: number } | null } | null;
  }>;
}

async function paddle<T>(env: Env, method: string, path: string, body?: unknown): Promise<T> {
  const billing = requireConfig(env);
  const base = billing.environment === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.PADDLE_API_KEY}`,
      "Content-Type": "application/json",
      "Paddle-Version": "1",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as { data?: T; error?: { code?: string; detail?: string } } | null;
  if (!response.ok || !payload?.data) {
    console.error("paddle", method, path, response.status, payload?.error?.code, payload?.error?.detail);
    throw new HttpError(502, "billing_unavailable", "Couldn't reach the payment provider. Try again in a moment.");
  }
  return payload.data;
}

// ---- The office's side ------------------------------------------------------

interface SubscriptionRow {
  office_id: string;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  plan: string;
  status: string;
  current_period_end: number | null;
  cancel_at: number | null;
  changed_at: number;
}

async function subscriptionOf(env: Env, officeId: string): Promise<SubscriptionRow | null> {
  return env.DB.prepare(
    `SELECT office_id, provider_customer_id, provider_subscription_id, plan, status, current_period_end, cancel_at, changed_at
     FROM subscriptions WHERE office_id = ?`,
  )
    .bind(officeId)
    .first<SubscriptionRow>();
}

/** The office's live subscription: one that still holds a plan. */
async function liveSubscription(env: Env, officeId: string): Promise<SubscriptionRow | null> {
  const row = await subscriptionOf(env, officeId);
  return row && row.provider_subscription_id && HOLDS_PLAN.has(row.status) ? row : null;
}

async function requireLive(env: Env, officeId: string): Promise<SubscriptionRow & { provider_subscription_id: string }> {
  const row = await liveSubscription(env, officeId);
  if (!row) throw new HttpError(409, "no_subscription", "This office isn't on a paid plan");
  return row as SubscriptionRow & { provider_subscription_id: string };
}

const time = (iso: string | null | undefined) => (iso ? Date.parse(iso) : null);

/**
 * Brings an office in line with a subscription Paddle vouches for. Only the
 * newest state wins: an event that arrives late, or a reply that raced a
 * webhook, never undoes a later change. Returns false when it was ignored.
 */
export async function applySubscription(env: Env, sub: PaddleSubscription): Promise<boolean> {
  const billing = config(env);
  if (!billing) return false;

  const known = await env.DB.prepare("SELECT office_id, changed_at FROM subscriptions WHERE provider_subscription_id = ?")
    .bind(sub.id)
    .first<{ office_id: string; changed_at: number }>();
  const officeId = sub.custom_data?.office_id ?? known?.office_id;
  if (!officeId) {
    console.warn("billing: subscription without an office", sub.id);
    return false;
  }
  const office = await env.DB.prepare("SELECT id FROM offices WHERE id = ?").bind(officeId).first();
  if (!office) return false;

  const changedAt = Date.parse(sub.updated_at) || Date.now();
  const current = await subscriptionOf(env, officeId);
  if (current?.provider_subscription_id === sub.id && current.changed_at > changedAt) return false;

  const holds = HOLDS_PLAN.has(sub.status);
  // A different, older subscription ending must not take the plan from the one
  // the office has now (someone bought twice, then cancelled the first).
  if (current?.provider_subscription_id && current.provider_subscription_id !== sub.id && HOLDS_PLAN.has(current.status) && !holds) {
    return false;
  }

  const priced = planForPrice(billing, sub.items[0]?.price.id ?? "");
  if (!priced) {
    console.warn("billing: subscription on a price that isn't ours", sub.id);
    return false;
  }
  const plan = holds ? priced : FREE;
  const cancelAt = sub.scheduled_change?.action === "cancel" ? time(sub.scheduled_change.effective_at) : null;

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO subscriptions (office_id, provider, provider_customer_id, provider_subscription_id, plan, status,
         current_period_end, price_id, billing_interval, cancel_at, changed_at, updated_at)
       VALUES (?, 'paddle', ?, ?, ?, ?, ?, ?, 'month', ?, ?, ?)
       ON CONFLICT (office_id) DO UPDATE SET
         provider_customer_id = excluded.provider_customer_id,
         provider_subscription_id = excluded.provider_subscription_id,
         plan = excluded.plan, status = excluded.status, current_period_end = excluded.current_period_end,
         price_id = excluded.price_id, billing_interval = excluded.billing_interval, cancel_at = excluded.cancel_at,
         changed_at = excluded.changed_at, updated_at = excluded.updated_at`,
    ).bind(
      officeId,
      sub.customer_id,
      sub.id,
      priced.id,
      sub.status,
      time(sub.current_billing_period?.ends_at),
      sub.items[0].price.id,
      cancelAt,
      changedAt,
      Date.now(),
    ),
    env.DB.prepare("UPDATE offices SET plan = ?, seats = ? WHERE id = ?").bind(plan.id, plan.seats, officeId),
  ]);
  // The room's meeting hours follow the plan straight away: a bigger plan lifts a pause.
  await realtime(env)
    .setMeetingAllowance(officeId, plan.meetingHours)
    .catch((error) => console.error("billing: couldn't tell the room", officeId, error));
  return true;
}

/** This calendar month (UTC), as the rooms count meeting hours. */
function thisMonth(now = Date.now()) {
  const date = new Date(now);
  return {
    key: date.toISOString().slice(0, 7),
    resetsAt: Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1),
  };
}

/** Meeting seconds the office has used this month, as its room last wrote them. */
export async function meetingSecondsThisMonth(env: Env, officeId: string): Promise<number> {
  const row = await env.DB.prepare("SELECT meeting_seconds FROM usage_monthly WHERE office_id = ? AND period = ?")
    .bind(officeId, thisMonth().key)
    .first<{ meeting_seconds: number }>();
  return row?.meeting_seconds ?? 0;
}

/** What the office's billing settings show, from our own records: no call to Paddle. */
async function billingJson(env: Env, office: Office) {
  const [row, members, seconds] = await Promise.all([
    subscriptionOf(env, office.id),
    seatsUsed(env, office.id),
    meetingSecondsThisMonth(env, office.id),
  ]);
  const live = row && row.provider_subscription_id && row.status !== "canceled";
  return {
    plan: office.plan,
    seats: office.seats,
    members,
    meetingHours: meetingHoursOf(office.plan),
    usage: { seconds, resetsAt: thisMonth().resetsAt },
    subscription: live
      ? {
          plan: row.plan,
          status: row.status,
          renewsAt: row.cancel_at ? null : row.current_period_end,
          endsAt: row.cancel_at,
        }
      : null,
  };
}

/** What a payment was, for the history: a payment, a refund, or one that didn't go through. */
function paymentStatus(txn: PaddleTransaction): "paid" | "refunded" | "partly_refunded" | "failed" | "due" {
  const total = Number(txn.details?.totals?.grand_total ?? 0);
  const refunded = Number(txn.adjustments_totals?.breakdown?.refund ?? 0);
  if (refunded > 0) return refunded >= total ? "refunded" : "partly_refunded";
  if (txn.status === "past_due") return "failed";
  if (txn.status === "completed" || txn.status === "paid") return "paid";
  return "due";
}

/**
 * The page's slower half, from Paddle: the next charge with its tax, the card
 * on file, and the office's past payments with their invoices.
 */
async function detailsJson(env: Env, office: Office) {
  const billing = requireConfig(env);
  const row = await subscriptionOf(env, office.id);
  if (!row?.provider_customer_id) return { nextCharge: null, card: null, history: [] };

  const [sub, transactions] = await Promise.all([
    row.provider_subscription_id && HOLDS_PLAN.has(row.status)
      ? paddle<PaddleSubscription>(env, "GET", `/subscriptions/${row.provider_subscription_id}?include=next_transaction`).catch(() => null)
      : Promise.resolve(null),
    paddle<PaddleTransaction[]>(
      env,
      "GET",
      `/transactions?${new URLSearchParams({
        customer_id: row.provider_customer_id,
        status: "completed,paid,past_due",
        order_by: "created_at[DESC]",
        per_page: String(HISTORY),
        include: "adjustments_totals",
      })}`,
    ),
  ]);
  // A payer's transactions for other offices stay theirs; card updates cost nothing and aren't payments.
  const mine = transactions.filter(
    (txn) =>
      (txn.custom_data?.office_id === office.id || (txn.subscription_id !== null && txn.subscription_id === row.provider_subscription_id)) &&
      Number(txn.details?.totals?.grand_total ?? 0) > 0,
  );

  const totals = sub?.next_transaction?.details?.totals;
  const nextCharge =
    sub && !sub.scheduled_change && sub.next_billed_at && totals?.grand_total
      ? { at: Date.parse(sub.next_billed_at), amount: Number(totals.grand_total), currency: totals.currency_code ?? "USD" }
      : null;

  const paidWith = mine.flatMap((txn) => txn.payments ?? []).find((payment) => payment.status === "captured" && payment.method_details);
  const card = paidWith?.method_details?.card
    ? {
        brand: paidWith.method_details.card.type ?? "card",
        last4: paidWith.method_details.card.last4 ?? "",
        expires: paidWith.method_details.card.expiry_month
          ? `${String(paidWith.method_details.card.expiry_month).padStart(2, "0")}/${String(paidWith.method_details.card.expiry_year ?? "").slice(-2)}`
          : null,
      }
    : paidWith?.method_details?.type
      ? { brand: paidWith.method_details.type, last4: "", expires: null }
      : null;

  return {
    nextCharge,
    card,
    history: mine.map((txn) => ({
      id: txn.id,
      at: Date.parse(txn.billed_at ?? txn.created_at),
      plan: planForPrice(billing, txn.items?.[0]?.price?.id ?? "")?.id ?? null,
      amount: Number(txn.details?.totals?.grand_total ?? 0),
      currency: txn.details?.totals?.currency_code ?? "USD",
      status: paymentStatus(txn),
      invoice: txn.status === "completed" || txn.status === "paid",
    })),
  };
}

/**
 * Before an office is closed. A plan still renewing has to be cancelled first
 * (docs/14); one already cancelled ends now, so closing stops every charge.
 */
export async function endBillingForClosing(env: Env, officeId: string): Promise<void> {
  const live = await liveSubscription(env, officeId);
  if (!live?.provider_subscription_id) return;
  if (!live.cancel_at) throw new HttpError(409, "cancel_plan_first", "Cancel this office's plan before closing it");
  await paddle(env, "POST", `/subscriptions/${live.provider_subscription_id}/cancel`, { effective_from: "immediately" });
}

// ---- Webhooks ---------------------------------------------------------------

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Paddle-Signature is `ts=…;h1=…`, with more than one h1 while a secret is being rotated. */
export async function verifySignature(secret: string, header: string | null, body: string, now = Date.now()): Promise<boolean> {
  if (!header) return false;
  const parts = header.split(";").map((part) => part.split("="));
  const ts = parts.find(([key]) => key === "ts")?.[1];
  const signatures = parts.filter(([key]) => key === "h1").map(([, value]) => value ?? "");
  if (!ts || !signatures.length || !/^\d+$/.test(ts)) return false;
  if (Math.abs(now / 1000 - Number(ts)) > SIGNATURE_TOLERANCE_S) return false;
  const expected = await hmacHex(secret, `${ts}:${body}`);
  return signatures.some((signature) => sameText(signature, expected));
}

async function webhook(env: Env, request: Request): Promise<Response> {
  if (!env.PADDLE_WEBHOOK_SECRET) return new Response(null, { status: 503 });
  const body = await request.text();
  if (!(await verifySignature(env.PADDLE_WEBHOOK_SECRET, request.headers.get("Paddle-Signature"), body))) {
    return new Response(null, { status: 401 });
  }
  const event = JSON.parse(body) as { event_id: string; event_type: string; data: unknown };

  // Seen before: done. The row goes in first, so two deliveries at once apply it once.
  const fresh = await env.DB.prepare("INSERT OR IGNORE INTO billing_events (id, type, received_at) VALUES (?, ?, ?)")
    .bind(event.event_id, event.event_type, Date.now())
    .run();
  if (!fresh.meta.changes) return json({ ok: true, duplicate: true });

  try {
    if (event.event_type.startsWith("subscription.")) {
      await applySubscription(env, event.data as PaddleSubscription);
    }
  } catch (error) {
    // Let Paddle retry: forget the event so the retry isn't taken for a duplicate.
    await env.DB.prepare("DELETE FROM billing_events WHERE id = ?").bind(event.event_id).run();
    throw error;
  }
  return json({ ok: true });
}

const TXN = /^txn_[a-z\d]{26}$/;

/** A transaction of this office's, straight from Paddle; anything else is "no such". */
async function officeTransaction(env: Env, officeId: string, transactionId: unknown): Promise<PaddleTransaction> {
  if (typeof transactionId !== "string" || !TXN.test(transactionId)) throw new HttpError(400, "bad_transaction", "No such payment");
  const txn = await paddle<PaddleTransaction>(env, "GET", `/transactions/${transactionId}`);
  if (txn.custom_data?.office_id !== officeId) throw new HttpError(404, "bad_transaction", "No such payment");
  return txn;
}

// ---- Routes -----------------------------------------------------------------

export function billingRoutes(router: Router): void {
  router
    // The plans, with prices and hours, and what the site needs to open Paddle's checkout.
    .add("GET", "/v1/plans", async ({ env }) => {
      const billing = config(env);
      return json({
        plans: PLANS,
        billing: billing ? { environment: billing.environment, clientToken: billing.clientToken } : null,
      });
    })

    .add("GET", "/v1/offices/:id/billing", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const office = await requireOffice(env, params.id, user.id, ["admin"]);
      return json(await billingJson(env, office));
    })

    .add("GET", "/v1/offices/:id/billing/details", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const office = await requireOffice(env, params.id, user.id, ["admin"]);
      return json(await detailsJson(env, office));
    })

    // A payment's invoice: a PDF link from Paddle that lasts an hour.
    .add("GET", "/v1/offices/:id/billing/invoices/:txn", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const office = await requireOffice(env, params.id, user.id, ["admin"]);
      const txn = await officeTransaction(env, office.id, params.txn);
      const invoice = await paddle<{ url: string }>(env, "GET", `/transactions/${txn.id}/invoice`);
      return json({ url: invoice.url });
    })

    // A checkout for a free office, made here so the office it's for can't be forged.
    .add("POST", "/v1/offices/:id/billing/checkout", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const office = await requireOffice(env, params.id, user.id, ["admin"]);
      const billing = requireConfig(env);
      const plan = readPlan(await readJson(request));
      if (await liveSubscription(env, office.id)) {
        throw new HttpError(409, "has_subscription", "This office already has a plan; change it instead");
      }
      const earlier = await subscriptionOf(env, office.id);
      const transaction = await paddle<{ id: string }>(env, "POST", "/transactions", {
        items: [{ price_id: priceFor(billing, plan), quantity: 1 }],
        custom_data: { office_id: office.id },
        ...(earlier?.provider_customer_id ? { customer_id: earlier.provider_customer_id } : {}),
      });
      return json({ transactionId: transaction.id, email: user.email });
    })

    // Straight after paying: the plan lands from Paddle's own record of the checkout,
    // without waiting for the webhook. The webhook still keeps it right afterwards.
    .add("POST", "/v1/offices/:id/billing/sync", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const office = await requireOffice(env, params.id, user.id, ["admin"]);
      const txn = await officeTransaction(env, office.id, (await readJson(request)).transactionId);
      if (txn.subscription_id) {
        await applySubscription(env, await paddle<PaddleSubscription>(env, "GET", `/subscriptions/${txn.subscription_id}`));
      }
      return json(await billingJson(env, await requireOffice(env, office.id, user.id)));
    })

    // Up or down a plan, paid or credited for the time left.
    .add("POST", "/v1/offices/:id/billing/change", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const office = await requireOffice(env, params.id, user.id, ["admin"]);
      const billing = requireConfig(env);
      const plan = readPlan(await readJson(request));
      const target = planById(plan)!;
      const members = await seatsUsed(env, office.id);
      if (members > target.seats) {
        throw new HttpError(409, "too_many_members", `This office has ${members} members; ${plan} holds ${target.seats}`);
      }
      const live = await requireLive(env, office.id);
      const sub = await paddle<PaddleSubscription>(env, "PATCH", `/subscriptions/${live.provider_subscription_id}`, {
        items: [{ price_id: priceFor(billing, plan), quantity: 1 }],
        proration_billing_mode: "prorated_immediately",
      });
      await applySubscription(env, sub);
      return json(await billingJson(env, await requireOffice(env, office.id, user.id)));
    })

    // Stops the next renewal; the plan runs to the end of what was paid for.
    .add("POST", "/v1/offices/:id/billing/cancel", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const office = await requireOffice(env, params.id, user.id, ["admin"]);
      const live = await requireLive(env, office.id);
      const sub = await paddle<PaddleSubscription>(env, "POST", `/subscriptions/${live.provider_subscription_id}/cancel`, {
        effective_from: "next_billing_period",
      });
      await applySubscription(env, sub);
      return json(await billingJson(env, office));
    })

    // Changed their mind before the period ended: the cancellation is withdrawn.
    .add("POST", "/v1/offices/:id/billing/resume", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const office = await requireOffice(env, params.id, user.id, ["admin"]);
      const live = await requireLive(env, office.id);
      const sub = await paddle<PaddleSubscription>(env, "PATCH", `/subscriptions/${live.provider_subscription_id}`, {
        scheduled_change: null,
      });
      await applySubscription(env, sub);
      return json(await billingJson(env, office));
    })

    // A new card for this office's plan only: a zero-amount checkout from Paddle,
    // opened over the page like any other. No customer portal, which would show
    // the payer's other subscriptions to whoever opened it.
    .add("POST", "/v1/offices/:id/billing/payment-method", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const office = await requireOffice(env, params.id, user.id, ["admin"]);
      const live = await requireLive(env, office.id);
      const txn = await paddle<{ id: string }>(env, "GET", `/subscriptions/${live.provider_subscription_id}/update-payment-method-transaction`);
      return json({ transactionId: txn.id });
    })

    .add("POST", "/v1/billing/webhook", async ({ env, request }) => webhook(env, request));
}
