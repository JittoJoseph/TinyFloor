import { realtime, requireOffice, seatsUsed, type Office } from "./access";
import { HttpError, json, readJson } from "./http";
import type { Router } from "./router";
import { requireUser } from "./session";

/**
 * The paid plan, sold through Creem as the merchant of record (docs/billing.md,
 * docs/pricing.md, docs/costs.md). There is one: Free holds 3 people, Pro a small team at one
 * price. Neither shows a meter: meeting hours are a fair-use backstop, high
 * enough that a team meeting all day never meets them. An office's plan changes in one place only: here,
 * from a subscription Creem vouches for, either in a signed webhook or in the
 * reply to a request this worker made itself.
 */

export type PlanId = "free" | "pro";
type PaidPlan = Exclude<PlanId, "free">;

export interface Plan {
  id: PlanId;
  seats: number;
  /** Fair use, never shown: meeting hours a month (time a meeting has two or more people in it), past which meetings are voice only (docs/costs.md). */
  meetingHours: number;
  /** US cents a month, before tax; null for the free plan. Monthly only. */
  price: number | null;
}

export const PLANS: Plan[] = [
  { id: "free", seats: 3, meetingHours: 40, price: null },
  { id: "pro", seats: 15, meetingHours: 120, price: 2900 },
];

const FREE = PLANS[0];
export const planById = (id: string) => PLANS.find((plan) => plan.id === id);

/** An office's meeting hours a month, from its plan. */
export const meetingHoursOf = (plan: string) => (planById(plan) ?? FREE).meetingHours;

/**
 * Subscriptions in these states hold their plan: a card being retried still
 * counts, and so does one cancelled for the end of the period it paid for.
 */
export const HOLDS_PLAN = new Set(["active", "trialing", "past_due", "scheduled_cancel"]);

/** How many past payments the billing page lists. */
const HISTORY = 24;

/**
 * The trial (docs/pricing.md): every office starts on Pro for this many days,
 * without a card, so the whole team moves in before anyone decides. Then it's
 * Free unless a plan was bought. Nobody is removed, and nobody is locked out:
 * an office with more people than Free holds keeps them all on the floor for
 * GRACE_DAYS more, while nobody new joins, and after that the floor holds
 * Free's number at once (chat stays open to everyone). Only where plans are
 * on sale.
 */
export const TRIAL_DAYS = 14;
export const GRACE_DAYS = 14;
const TRIAL_PLAN: PaidPlan = "pro";
const DAY = 24 * 60 * 60 * 1000;
/** The most an office holds, on any plan: Pro's. */
export const MOST_SEATS = planById(TRIAL_PLAN)!.seats;

type ProductIds = Partial<Record<PaidPlan, string>>;

interface BillingConfig {
  mode: "test" | "live";
  products: ProductIds;
}

/**
 * Billing is on where Creem is configured: the plans' product IDs and the API
 * key. The live system has none until Creem has reviewed the store, so it
 * keeps saying "coming soon" while preview sells in Creem's test mode.
 */
function config(env: Env): BillingConfig | null {
  if (!env.CREEM_PRODUCTS || !env.CREEM_API_KEY) return null;
  let products: ProductIds;
  try {
    products = JSON.parse(env.CREEM_PRODUCTS) as ProductIds;
  } catch {
    return null;
  }
  return { mode: env.CREEM_ENV === "live" ? "live" : "test", products };
}

function requireConfig(env: Env): BillingConfig {
  const found = config(env);
  if (!found) throw new HttpError(503, "billing_off", "Paid plans aren't available yet");
  return found;
}

function productFor(billing: BillingConfig, plan: PlanId): string {
  const id = plan === "free" ? undefined : billing.products[plan];
  if (!id) throw new HttpError(400, "bad_plan", "No such plan");
  return id;
}

/** Which plan a Creem product stands for, or null for a product that isn't ours. */
function planForProduct(billing: BillingConfig, productId: string): Plan | null {
  const found = Object.entries(billing.products).find(([, id]) => id === productId);
  return found ? (planById(found[0]) ?? null) : null;
}

function readPlan(body: Record<string, unknown>): PaidPlan {
  if (body.plan !== "pro") throw new HttpError(400, "bad_plan", "Pick a plan");
  return body.plan;
}

// ---- Creem's API ------------------------------------------------------------

/** Creem sends a related object either whole or as its ID. */
type Ref<T> = string | (T & { id: string });
const idOf = (ref: Ref<object> | null | undefined) => (typeof ref === "string" ? ref : ref?.id);

/** A subscription as Creem sends it, trimmed to what we read. */
export interface CreemSubscription {
  id: string;
  status: string;
  product: Ref<{ price?: number; currency?: string }>;
  customer: Ref<{ email?: string }>;
  items?: Array<{ product_id?: string }>;
  /** What the checkout carried: the office it's for and who paid. */
  metadata?: { office_id?: string; payer_id?: string } | null;
  updated_at: string;
  current_period_end_date?: string | null;
  next_transaction_date?: string | null;
}

interface CreemTransaction {
  id: string;
  amount: number;
  amount_paid?: number;
  currency: string;
  status: string;
  refunded_amount?: number;
  subscription?: string | null;
  created_at: number;
}

interface CreemCheckout {
  id: string;
  status: string;
  metadata?: { office_id?: string } | null;
  subscription?: Ref<CreemSubscription> | null;
}

async function creem<T>(env: Env, method: string, path: string, body?: unknown): Promise<T> {
  const billing = requireConfig(env);
  const base = billing.mode === "live" ? "https://api.creem.io" : "https://test-api.creem.io";
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { "x-api-key": env.CREEM_API_KEY!, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as (T & { trace_id?: string; message?: unknown }) | null;
  if (!response.ok || !payload) {
    console.error("creem", method, path, response.status, payload?.trace_id, payload?.message);
    throw new HttpError(502, "billing_unavailable", "Couldn't reach the payment provider. Try again in a moment.");
  }
  return payload;
}

const getSubscription = (env: Env, id: string) =>
  creem<CreemSubscription>(env, "GET", `/v1/subscriptions?${new URLSearchParams({ subscription_id: id })}`);

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
  payer_id: string | null;
}

async function subscriptionOf(env: Env, officeId: string): Promise<SubscriptionRow | null> {
  return env.DB.prepare(
    `SELECT office_id, provider_customer_id, provider_subscription_id, plan, status, current_period_end, cancel_at, changed_at, payer_id
     FROM subscriptions WHERE office_id = ?`,
  )
    .bind(officeId)
    .first<SubscriptionRow>();
}

/** The office's live subscription: one that still holds a plan. */
export async function liveSubscription(env: Env, officeId: string): Promise<SubscriptionRow | null> {
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
 * Brings an office in line with a subscription Creem vouches for. Only the
 * newest state wins: an event that arrives late, or a reply that raced a
 * webhook, never undoes a later change. `forOffice` is the office a checkout
 * we checked was for, when the subscription doesn't say. Returns false when
 * it was ignored.
 */
export async function applySubscription(env: Env, sub: CreemSubscription, forOffice?: string): Promise<boolean> {
  const billing = config(env);
  if (!billing) return false;

  const known = await env.DB.prepare("SELECT office_id FROM subscriptions WHERE provider_subscription_id = ?")
    .bind(sub.id)
    .first<{ office_id: string }>();
  const officeId = sub.metadata?.office_id ?? forOffice ?? known?.office_id;
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

  const productId = idOf(sub.product) ?? sub.items?.[0]?.product_id ?? "";
  const priced = planForProduct(billing, productId);
  if (!priced) {
    console.warn("billing: subscription on a product that isn't ours", sub.id);
    return false;
  }
  const plan = holds ? priced : FREE;
  const cancelAt = sub.status === "scheduled_cancel" ? time(sub.current_period_end_date) : null;
  const payer = sub.metadata?.payer_id ?? (current?.provider_subscription_id === sub.id ? current.payer_id : null);

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO subscriptions (office_id, provider, provider_customer_id, provider_subscription_id, plan, status,
         current_period_end, price_id, billing_interval, cancel_at, changed_at, payer_id, updated_at)
       VALUES (?, 'creem', ?, ?, ?, ?, ?, ?, 'month', ?, ?, ?, ?)
       ON CONFLICT (office_id) DO UPDATE SET
         provider = excluded.provider,
         provider_customer_id = excluded.provider_customer_id,
         provider_subscription_id = excluded.provider_subscription_id,
         plan = excluded.plan, status = excluded.status, current_period_end = excluded.current_period_end,
         price_id = excluded.price_id, billing_interval = excluded.billing_interval, cancel_at = excluded.cancel_at,
         changed_at = excluded.changed_at, payer_id = excluded.payer_id, updated_at = excluded.updated_at`,
    ).bind(
      officeId,
      idOf(sub.customer) ?? null,
      sub.id,
      priced.id,
      sub.status,
      time(sub.current_period_end_date),
      productId,
      cancelAt,
      changedAt,
      payer,
      Date.now(),
    ),
    // A plan from Creem replaces a trial that was running.
    env.DB.prepare(
      `UPDATE offices SET plan = ?, seats = ?, trial_ends_at = CASE WHEN trial_ends_at IS NULL THEN NULL ELSE 0 END WHERE id = ?`,
    ).bind(plan.id, plan.seats, officeId),
  ]);
  // The room's meeting hours follow the plan straight away: a bigger plan lifts a pause.
  await realtime(env)
    .setMeetingAllowance(officeId, plan.meetingHours)
    .catch((error) => console.error("billing: couldn't tell the room", officeId, error));
  return true;
}

/** This calendar month (UTC), as the rooms count meeting hours. */
export function thisMonth(now = Date.now()) {
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

/** What the office's billing settings show, from our own records: no call to Creem. */
async function billingJson(env: Env, office: Office) {
  const [row, members, seconds, trial] = await Promise.all([
    subscriptionOf(env, office.id),
    seatsUsed(env, office.id),
    meetingSecondsThisMonth(env, office.id),
    trialOf(env, office.id),
  ]);
  const live = row && row.provider_subscription_id && HOLDS_PLAN.has(row.status);
  return {
    plan: office.plan,
    seats: office.seats,
    members,
    meetingHours: meetingHoursOf(office.plan),
    usage: { seconds, resetsAt: thisMonth().resetsAt },
    trial: live ? null : trial,
    trialEndedAt: office.trialEndedAt,
    graceEndsAt: office.graceEndsAt,
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
function paymentStatus(txn: CreemTransaction): "paid" | "refunded" | "partly_refunded" | "failed" | "due" {
  const refunded = txn.refunded_amount ?? 0;
  if (txn.status === "refunded" || (refunded > 0 && refunded >= txn.amount)) return "refunded";
  if (txn.status === "partialRefund" || refunded > 0) return "partly_refunded";
  if (txn.status === "declined" || txn.status === "uncollectible" || txn.status === "chargedBack") return "failed";
  if (txn.status === "paid") return "paid";
  return "due";
}

/**
 * The page's slower half, from Creem: the next charge and the office's past
 * payments. Creem keeps the card and the invoices in its customer portal.
 */
async function detailsJson(env: Env, office: Office) {
  requireConfig(env);
  const row = await subscriptionOf(env, office.id);
  if (!row?.provider_customer_id) return { nextCharge: null, card: null, history: [] };

  const [sub, transactions] = await Promise.all([
    row.provider_subscription_id && HOLDS_PLAN.has(row.status)
      ? getSubscription(env, row.provider_subscription_id).catch(() => null)
      : Promise.resolve(null),
    creem<{ items: CreemTransaction[] }>(
      env,
      "GET",
      `/v1/transactions/search?${new URLSearchParams({ customer_id: row.provider_customer_id, page_size: String(HISTORY) })}`,
    ),
  ]);
  // A payer's payments for other offices stay theirs.
  const mine = transactions.items.filter((txn) => txn.subscription === row.provider_subscription_id && txn.amount > 0);

  const product = sub && typeof sub.product === "object" ? sub.product : null;
  const nextCharge =
    sub && sub.status !== "scheduled_cancel" && sub.next_transaction_date && product?.price
      ? { at: Date.parse(sub.next_transaction_date), amount: product.price, currency: product.currency ?? "USD" }
      : null;
  return {
    nextCharge,
    card: null,
    history: mine
      .sort((a, b) => b.created_at - a.created_at)
      .map((txn) => ({
        id: txn.id,
        at: txn.created_at,
        // Creem's payments don't say which plan they were for (one can be a
        // proration between two), so the history doesn't guess.
        plan: null,
        amount: txn.amount_paid ?? txn.amount,
        currency: txn.currency,
        status: paymentStatus(txn),
        invoice: txn.status === "paid" || txn.status === "refunded" || txn.status === "partialRefund",
      })),
  };
}

/**
 * A plan given by hand, from the admin view: no payment, no Creem. Only for an
 * office that isn't paying through Creem, so the two never disagree; a paid
 * plan is changed or cancelled the way its admins would.
 */
export async function givePlan(env: Env, officeId: string, planId: string): Promise<void> {
  const plan = planById(planId);
  if (!plan) throw new HttpError(400, "bad_plan", "No such plan");
  if (await liveSubscription(env, officeId)) {
    throw new HttpError(409, "has_subscription", "This office pays through Creem; change its plan there");
  }
  await env.DB.prepare(
    `UPDATE offices SET plan = ?, seats = ?, trial_ends_at = CASE WHEN trial_ends_at IS NULL THEN NULL ELSE 0 END WHERE id = ?`,
  )
    .bind(plan.id, plan.seats, officeId)
    .run();
  await realtime(env)
    .setMeetingAllowance(officeId, plan.meetingHours)
    .catch((error) => console.error("admin: couldn't tell the room", officeId, error));
}

/** A new office's plan: the trial where plans are on sale, Free elsewhere. */
export function startingPlan(env: Env, now = Date.now()): { plan: PlanId; seats: number; trialEndsAt: number | null } {
  if (!config(env)) return { plan: FREE.id, seats: FREE.seats, trialEndsAt: null };
  return { plan: TRIAL_PLAN, seats: MOST_SEATS, trialEndsAt: now + TRIAL_DAYS * DAY };
}

/**
 * Trials past their end go to Free: every office's daily, or one office's the
 * moment it's read after its trial ended. Nobody is removed. The end stays
 * recorded (trial_ends_at), since the grace runs from it; a plan bought or
 * given clears it to 0.
 */
const TRIAL_OVER = "trial_ends_at > 0 AND trial_ends_at <= ? AND plan <> 'free'";
export async function endTrials(env: Env, officeId?: string, now = Date.now()): Promise<number> {
  const { results } = await (
    officeId
      ? env.DB.prepare(`SELECT id FROM offices WHERE id = ? AND ${TRIAL_OVER}`).bind(officeId, now)
      : env.DB.prepare(`SELECT id FROM offices WHERE ${TRIAL_OVER}`).bind(now)
  ).all<{ id: string }>();
  for (const { id } of results) {
    await env.DB.prepare(`UPDATE offices SET plan = 'free', seats = ? WHERE id = ? AND ${TRIAL_OVER}`)
      .bind(FREE.seats, id, now)
      .run();
    await realtime(env)
      .setMeetingAllowance(id, FREE.meetingHours)
      .catch((error) => console.error("trial: couldn't tell the room", id, error));
  }
  return results.length;
}

/**
 * When the trial ended, while nothing has been chosen since: neither a plan
 * bought nor Free settled on. Every office is asked, whatever its size.
 */
export function trialEnd(plan: string, trialEndsAt: number | null, now = Date.now()): number | null {
  return plan === FREE.id && trialEndsAt && trialEndsAt > 0 && trialEndsAt <= now ? trialEndsAt : null;
}

/**
 * When the grace after an ended trial runs out, while it runs: a Free office
 * whose trial ended less than GRACE_DAYS ago keeps everyone on the floor.
 */
export function graceEnd(plan: string, trialEndsAt: number | null, now = Date.now()): number | null {
  if (plan !== FREE.id || !trialEndsAt || trialEndsAt > now) return null;
  const end = trialEndsAt + GRACE_DAYS * DAY;
  return end > now ? end : null;
}

/** How many can be on the floor at once: the plan's, or everyone while an ended trial's grace runs. */
export const floorCap = (office: Pick<Office, "seats" | "graceEndsAt">) => (office.graceEndsAt ? MOST_SEATS : office.seats);

/** The trial running for an office, if one is. */
async function trialOf(env: Env, officeId: string, now = Date.now()): Promise<{ plan: PaidPlan; endsAt: number } | null> {
  const row = await env.DB.prepare("SELECT trial_ends_at FROM offices WHERE id = ?")
    .bind(officeId)
    .first<{ trial_ends_at: number | null }>();
  return row?.trial_ends_at && row.trial_ends_at > now ? { plan: TRIAL_PLAN, endsAt: row.trial_ends_at } : null;
}

/**
 * Before an office is closed. A plan still renewing has to be cancelled first
 * (docs/billing.md); one already cancelled ends now, so closing stops every charge.
 */
export async function endBillingForClosing(env: Env, officeId: string): Promise<void> {
  const live = await liveSubscription(env, officeId);
  if (!live?.provider_subscription_id) return;
  if (!live.cancel_at) throw new HttpError(409, "cancel_plan_first", "Cancel this office's plan before closing it");
  await creem(env, "POST", `/v1/subscriptions/${live.provider_subscription_id}/cancel`, { mode: "immediate" });
}

// ---- Webhooks ---------------------------------------------------------------

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * `creem-signature` is the HMAC-SHA256 of the raw body, in hex. It carries no
 * time, so a replayed delivery is caught by its event ID instead (below).
 */
export async function verifySignature(secret: string, header: string | null, body: string): Promise<boolean> {
  if (!header) return false;
  return sameText(header.trim().toLowerCase(), await hmacHex(secret, body));
}

interface CreemEvent {
  id: string;
  eventType: string;
  object: unknown;
}

async function webhook(env: Env, request: Request): Promise<Response> {
  if (!env.CREEM_WEBHOOK_SECRET) return new Response(null, { status: 503 });
  const body = await request.text();
  if (!(await verifySignature(env.CREEM_WEBHOOK_SECRET, request.headers.get("creem-signature"), body))) {
    return new Response(null, { status: 401 });
  }
  const event = JSON.parse(body) as CreemEvent;

  // Seen before: done. The row goes in first, so two deliveries at once apply it once.
  const fresh = await env.DB.prepare("INSERT OR IGNORE INTO billing_events (id, type, received_at) VALUES (?, ?, ?)")
    .bind(event.id, event.eventType, Date.now())
    .run();
  if (!fresh.meta.changes) return json({ ok: true, duplicate: true });

  try {
    if (event.eventType.startsWith("subscription.")) {
      await applySubscription(env, event.object as CreemSubscription);
    } else if (event.eventType === "checkout.completed") {
      // The first word of a new subscription, with the office it was bought for.
      const checkout = event.object as CreemCheckout;
      if (checkout.subscription && typeof checkout.subscription === "object") {
        await applySubscription(env, checkout.subscription, checkout.metadata?.office_id);
      }
    }
  } catch (error) {
    // Let Creem retry: forget the event so the retry isn't taken for a duplicate.
    await env.DB.prepare("DELETE FROM billing_events WHERE id = ?").bind(event.id).run();
    throw error;
  }
  return json({ ok: true });
}

const CHECKOUT = /^ch_[A-Za-z\d]{8,40}$/;

// ---- Routes -----------------------------------------------------------------

export function billingRoutes(router: Router): void {
  router
    // The plans, with prices and hours, and whether they're on sale here.
    .add("GET", "/v1/plans", async ({ env }) => {
      const billing = config(env);
      return json({
        plans: PLANS,
        billing: billing ? { mode: billing.mode } : null,
        trialDays: billing ? TRIAL_DAYS : 0,
        trialPlan: billing && TRIAL_DAYS ? TRIAL_PLAN : null,
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
      const customer =
        earlier?.provider_customer_id && earlier.payer_id === user.id
          ? { id: earlier.provider_customer_id }
          : user.email
            ? { email: user.email }
            : undefined;
      const checkout = await creem<{ id: string; checkout_url: string }>(env, "POST", "/v1/checkouts", {
        product_id: productFor(billing, plan),
        units: 1,
        request_id: office.id,
        metadata: { office_id: office.id, payer_id: user.id },
        ...(customer ? { customer } : {}),
      });
      return json({ checkoutId: checkout.id, url: checkout.checkout_url });
    })

    // Straight after paying: the plan lands from Creem's own record of the checkout,
    // without waiting for the webhook. The webhook still keeps it right afterwards.
    .add("POST", "/v1/offices/:id/billing/sync", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const office = await requireOffice(env, params.id, user.id, ["admin"]);
      const checkoutId = (await readJson(request)).checkoutId;
      if (typeof checkoutId !== "string" || !CHECKOUT.test(checkoutId)) throw new HttpError(400, "bad_checkout", "No such checkout");
      const checkout = await creem<CreemCheckout>(env, "GET", `/v1/checkouts?${new URLSearchParams({ checkout_id: checkoutId })}`);
      if (checkout.metadata?.office_id !== office.id) throw new HttpError(404, "bad_checkout", "No such checkout");
      const subscriptionId = idOf(checkout.subscription);
      if (subscriptionId) await applySubscription(env, await getSubscription(env, subscriptionId), office.id);
      return json(await billingJson(env, await requireOffice(env, office.id, user.id)));
    })

    // After the trial, staying on Free on purpose: the question is answered, and an
    // office with more people than Free holds gives up the rest of its grace.
    .add("POST", "/v1/offices/:id/billing/free", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const office = await requireOffice(env, params.id, user.id, ["admin"]);
      await env.DB.prepare("UPDATE offices SET trial_ends_at = 0 WHERE id = ? AND plan = 'free' AND trial_ends_at > 0").bind(office.id).run();
      return json(await billingJson(env, await requireOffice(env, office.id, user.id)));
    })

    // Stops the next renewal; the plan runs to the end of what was paid for.
    .add("POST", "/v1/offices/:id/billing/cancel", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const office = await requireOffice(env, params.id, user.id, ["admin"]);
      const live = await requireLive(env, office.id);
      const sub = await creem<CreemSubscription>(env, "POST", `/v1/subscriptions/${live.provider_subscription_id}/cancel`, {
        mode: "scheduled",
      });
      await applySubscription(env, sub, office.id);
      return json(await billingJson(env, office));
    })

    // Changed their mind before the period ended: the cancellation is withdrawn.
    .add("POST", "/v1/offices/:id/billing/resume", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const office = await requireOffice(env, params.id, user.id, ["admin"]);
      const live = await requireLive(env, office.id);
      const sub = await creem<CreemSubscription>(env, "POST", `/v1/subscriptions/${live.provider_subscription_id}/resume`);
      await applySubscription(env, sub, office.id);
      return json(await billingJson(env, office));
    })

    // The card and the invoices, in Creem's customer portal. The portal shows
    // everything its customer buys through Creem, so only the person who paid
    // for this office's plan opens it, not every admin.
    .add("POST", "/v1/offices/:id/billing/portal", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const office = await requireOffice(env, params.id, user.id, ["admin"]);
      const row = await subscriptionOf(env, office.id);
      if (!row?.provider_customer_id) throw new HttpError(409, "no_subscription", "This office isn't on a paid plan");
      if (row.payer_id !== user.id) throw new HttpError(403, "not_payer", "Only the person who pays for this plan can open its billing");
      const links = await creem<{ customer_portal_link: string }>(env, "POST", "/v1/customers/billing", {
        customer_id: row.provider_customer_id,
      });
      return json({ url: links.customer_portal_link });
    })

    .add("POST", "/v1/billing/webhook", async ({ env, request }) => webhook(env, request));
}
