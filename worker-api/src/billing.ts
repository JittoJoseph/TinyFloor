import { requireOffice, seatsUsed, type Office } from "./access";
import { HttpError, json, readJson } from "./http";
import type { Router } from "./router";
import { requireUser } from "./session";

/**
 * Paid plans, sold through Paddle as the merchant of record (docs/09-billing.md,
 * docs/13). An office's plan and seats change in one place only: here, from a
 * subscription Paddle vouches for, either in a signed webhook or in the reply
 * to a request this worker made itself.
 */

export type PlanId = "free" | "team" | "business";
export type Interval = "month" | "year";

interface Plan {
  id: PlanId;
  seats: number;
  /** Prices in US cents, before tax. The free plan has none. */
  prices: Record<Interval, number> | null;
}

export const PLANS: Plan[] = [
  { id: "free", seats: 3, prices: null },
  { id: "team", seats: 10, prices: { month: 1900, year: 19000 } },
  { id: "business", seats: 25, prices: { month: 4900, year: 49000 } },
];

const FREE = PLANS[0];
const planById = (id: string) => PLANS.find((plan) => plan.id === id);

/** Subscriptions in these states hold their plan; a card being retried still counts. */
const HOLDS_PLAN = new Set(["active", "trialing", "past_due"]);

/** How old a webhook's signature may be. Retries are signed afresh, and replays are deduplicated anyway. */
const SIGNATURE_TOLERANCE_S = 300;

type PriceIds = Partial<Record<Exclude<PlanId, "free">, Record<Interval, string>>>;

interface BillingConfig {
  environment: "sandbox" | "production";
  clientToken: string;
  prices: PriceIds;
}

/**
 * Billing is on where Paddle is configured: the price IDs, the client-side token
 * and the API key. The live system has none until Paddle has verified the
 * account, so it keeps saying "coming soon" while preview sells against the sandbox.
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

function priceFor(billing: BillingConfig, plan: PlanId, interval: Interval): string {
  const id = plan === "free" ? undefined : billing.prices[plan]?.[interval];
  if (!id) throw new HttpError(400, "bad_plan", "No such plan");
  return id;
}

/** Which plan and interval a Paddle price stands for, or null for a price that isn't ours. */
function planForPrice(billing: BillingConfig, priceId: string): { plan: Plan; interval: Interval } | null {
  for (const [id, byInterval] of Object.entries(billing.prices)) {
    for (const interval of ["month", "year"] as const) {
      if (byInterval?.[interval] === priceId) {
        const plan = planById(id);
        if (plan) return { plan, interval };
      }
    }
  }
  return null;
}

function readPlan(body: Record<string, unknown>): { plan: PlanId; interval: Interval } {
  const plan = body.plan;
  const interval = body.interval;
  if ((plan !== "team" && plan !== "business") || (interval !== "month" && interval !== "year")) {
    throw new HttpError(400, "bad_plan", "Pick a plan and how often to pay");
  }
  return { plan, interval };
}

// ---- Paddle's API -----------------------------------------------------------

/** A subscription as Paddle sends it, trimmed to what we read. */
export interface PaddleSubscription {
  id: string;
  status: string;
  customer_id: string;
  custom_data?: { office_id?: string } | null;
  updated_at: string;
  current_billing_period?: { ends_at: string } | null;
  scheduled_change?: { action: string; effective_at: string } | null;
  items: Array<{ price: { id: string } }>;
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
  billing_interval: string | null;
  current_period_end: number | null;
  cancel_at: number | null;
  changed_at: number;
}

async function subscriptionOf(env: Env, officeId: string): Promise<SubscriptionRow | null> {
  return env.DB.prepare(
    `SELECT office_id, provider_customer_id, provider_subscription_id, plan, status, billing_interval,
            current_period_end, cancel_at, changed_at
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
  const plan = holds ? priced.plan : FREE;
  const cancelAt = sub.scheduled_change?.action === "cancel" ? time(sub.scheduled_change.effective_at) : null;

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO subscriptions (office_id, provider, provider_customer_id, provider_subscription_id, plan, status,
         current_period_end, price_id, billing_interval, cancel_at, changed_at, updated_at)
       VALUES (?, 'paddle', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      priced.plan.id,
      sub.status,
      time(sub.current_billing_period?.ends_at),
      sub.items[0].price.id,
      priced.interval,
      cancelAt,
      changedAt,
      Date.now(),
    ),
    env.DB.prepare("UPDATE offices SET plan = ?, seats = ? WHERE id = ?").bind(plan.id, plan.seats, officeId),
  ]);
  return true;
}

/** What the office's billing settings show. */
async function billingJson(env: Env, office: Office) {
  const [row, members] = await Promise.all([subscriptionOf(env, office.id), seatsUsed(env, office.id)]);
  const live = row && row.provider_subscription_id && row.status !== "canceled";
  return {
    plan: office.plan,
    seats: office.seats,
    members,
    subscription: live
      ? {
          plan: row.plan,
          interval: row.billing_interval,
          status: row.status,
          renewsAt: row.cancel_at ? null : row.current_period_end,
          endsAt: row.cancel_at,
        }
      : null,
  };
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

// ---- Routes -----------------------------------------------------------------

export function billingRoutes(router: Router): void {
  router
    // The plans, with prices, and what the site needs to open Paddle's checkout.
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

    // A checkout for a free office, made here so the office it's for can't be forged.
    .add("POST", "/v1/offices/:id/billing/checkout", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const office = await requireOffice(env, params.id, user.id, ["admin"]);
      const billing = requireConfig(env);
      const { plan, interval } = readPlan(await readJson(request));
      if (await liveSubscription(env, office.id)) {
        throw new HttpError(409, "has_subscription", "This office already has a plan; change it instead");
      }
      const earlier = await subscriptionOf(env, office.id);
      const transaction = await paddle<{ id: string }>(env, "POST", "/transactions", {
        items: [{ price_id: priceFor(billing, plan, interval), quantity: 1 }],
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
      const { transactionId } = await readJson(request);
      if (typeof transactionId !== "string" || !/^txn_[a-z\d]{26}$/.test(transactionId)) {
        throw new HttpError(400, "bad_transaction", "No such checkout");
      }
      const transaction = await paddle<{ subscription_id: string | null; custom_data?: { office_id?: string } | null }>(
        env,
        "GET",
        `/transactions/${transactionId}`,
      );
      if (transaction.custom_data?.office_id !== office.id) throw new HttpError(404, "bad_transaction", "No such checkout");
      if (transaction.subscription_id) {
        await applySubscription(env, await paddle<PaddleSubscription>(env, "GET", `/subscriptions/${transaction.subscription_id}`));
      }
      return json(await billingJson(env, await requireOffice(env, office.id, user.id)));
    })

    // Up or down a plan, or between monthly and yearly, paid or credited for the time left.
    .add("POST", "/v1/offices/:id/billing/change", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const office = await requireOffice(env, params.id, user.id, ["admin"]);
      const billing = requireConfig(env);
      const { plan, interval } = readPlan(await readJson(request));
      const target = planById(plan)!;
      const members = await seatsUsed(env, office.id);
      if (members > target.seats) {
        throw new HttpError(409, "too_many_members", `This office has ${members} members; ${plan} holds ${target.seats}`);
      }
      const live = await requireLive(env, office.id);
      const sub = await paddle<PaddleSubscription>(env, "PATCH", `/subscriptions/${live.provider_subscription_id}`, {
        items: [{ price_id: priceFor(billing, plan, interval), quantity: 1 }],
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

    // Paddle's own pages for the card, invoices and receipts, signed in already.
    .add("POST", "/v1/offices/:id/billing/portal", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const office = await requireOffice(env, params.id, user.id, ["admin"]);
      const row = await subscriptionOf(env, office.id);
      if (!row?.provider_customer_id) throw new HttpError(409, "no_subscription", "This office has never had a paid plan");
      const session = await paddle<{ urls: { general: { overview: string } } }>(
        env,
        "POST",
        `/customers/${row.provider_customer_id}/portal-sessions`,
        row.provider_subscription_id ? { subscription_ids: [row.provider_subscription_id] } : {},
      );
      return json({ url: session.urls.general.overview });
    })

    .add("POST", "/v1/billing/webhook", async ({ env, request }) => webhook(env, request));
}
