import { env, exports } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";
import { call, fakeRealtime, makeUser, type TestUser } from "./helpers";

const SECRET = "pdl_ntfset_test";

async function officeOf(admin: TestUser, name = "Studio") {
  const { body } = await call<{ office: { id: string } }>(admin, "POST", "/v1/offices", { name });
  return body.office.id;
}

async function addMembers(officeId: string, count: number) {
  for (let i = 0; i < count; i++) {
    const member = await makeUser(`Member ${i}`);
    await env.DB.prepare("INSERT INTO memberships (office_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)")
      .bind(officeId, member.id, Date.now())
      .run();
  }
}

async function officeRow(officeId: string) {
  return env.DB.prepare("SELECT plan, seats FROM offices WHERE id = ?").bind(officeId).first<{ plan: string; seats: number }>();
}

let events = 0;
function subscription(officeId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: `sub_${officeId}`,
    status: "active",
    customer_id: "ctm_1",
    custom_data: { office_id: officeId },
    updated_at: new Date(Date.now() + events * 1000).toISOString(),
    current_billing_period: { starts_at: "2026-09-28T00:00:00Z", ends_at: "2026-10-28T00:00:00Z" },
    scheduled_change: null,
    items: [{ price: { id: "pri_team_month" }, quantity: 1 }],
    ...overrides,
  };
}

async function sign(body: string, ts = Math.floor(Date.now() / 1000), secret = SECRET) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${ts}:${body}`));
  return `ts=${ts};h1=${[...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/** A webhook as Paddle sends it: no Origin, no cookie, just the signature. */
async function deliver(type: string, data: unknown, options: { eventId?: string; signature?: string } = {}) {
  events++;
  const body = JSON.stringify({ event_id: options.eventId ?? `evt_${events}_${crypto.randomUUID()}`, event_type: type, occurred_at: new Date().toISOString(), data });
  const response = await exports.default.fetch("https://api.tinyfloor.com/v1/billing/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Paddle-Signature": options.signature ?? (await sign(body)) },
    body,
  });
  return { status: response.status, body: response.status === 200 ? await response.json() : null };
}

/** Paddle's API, answered by the test: every call is recorded. */
function paddleApi(reply: (method: string, path: string, body: unknown) => unknown) {
  const calls: Array<{ method: string; path: string; body: unknown; query?: string }> = [];
  const real = globalThis.fetch;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    if (url.hostname !== "sandbox-api.paddle.com") return real(input, init);
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method: init?.method ?? "GET", path: url.pathname, body, ...(url.search ? { query: url.search } : {}) });
    return Response.json({ data: reply(init?.method ?? "GET", url.pathname, body) });
  });
  return calls;
}

afterEach(() => vi.restoreAllMocks());

describe("billing", () => {
  it("lists the plans, with what the site needs to open a checkout", async () => {
    const { status, body } = await call<{ plans: Array<{ id: string; seats: number; meetingHours: number; price: number | null }>; billing: unknown }>(
      null,
      "GET",
      "/v1/plans",
    );
    expect(status).toBe(200);
    expect(body.plans.map((plan) => [plan.id, plan.seats, plan.meetingHours, plan.price])).toEqual([
      ["free", 3, 5, null],
      ["team", 10, 30, 1900],
      ["business", 25, 60, 4900],
    ]);
    expect(body.billing).toEqual({ environment: "sandbox", clientToken: "test_client_token" });
  });

  it("makes the checkout itself, for the office the admin is in", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    const calls = paddleApi(() => ({ id: "txn_1" }));

    const { status, body } = await call(ada, "POST", `/v1/offices/${officeId}/billing/checkout`, { plan: "team" });
    expect(status).toBe(200);
    expect(body).toMatchObject({ transactionId: "txn_1" });
    expect(calls).toEqual([
      { method: "POST", path: "/transactions", body: { items: [{ price_id: "pri_team_month", quantity: 1 }], custom_data: { office_id: officeId } } },
    ]);
  });

  it("lets only admins buy, and only real plans", async () => {
    const ada = await makeUser("Ada");
    const bo = await makeUser("Bo");
    const officeId = await officeOf(ada);
    await env.DB.prepare("INSERT INTO memberships (office_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)")
      .bind(officeId, bo.id, Date.now())
      .run();
    paddleApi(() => ({ id: "txn_1" }));

    expect((await call(bo, "POST", `/v1/offices/${officeId}/billing/checkout`, { plan: "team" })).status).toBe(403);
    expect((await call(ada, "POST", `/v1/offices/${officeId}/billing/checkout`, { plan: "free" })).status).toBe(400);
    expect((await call(ada, "POST", `/v1/offices/${officeId}/billing/checkout`, { plan: "enterprise" })).status).toBe(400);
  });

  it("puts the office on its plan when Paddle says the subscription started", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);

    const { status } = await deliver("subscription.created", subscription(officeId));
    expect(status).toBe(200);
    expect(await officeRow(officeId)).toEqual({ plan: "team", seats: 10 });

    const billing = await call<{ subscription: Record<string, unknown>; meetingHours: number }>(ada, "GET", `/v1/offices/${officeId}/billing`);
    expect(billing.body.subscription).toMatchObject({ plan: "team", status: "active", renewsAt: Date.parse("2026-10-28T00:00:00Z") });
    expect(billing.body.meetingHours).toBe(30);
    // The room hears the plan's hours straight away, so a pause lifts without waiting for a new ticket.
    expect(await fakeRealtime().calls()).toContainEqual(["setMeetingAllowance", officeId, 30]);
  });

  it("shows the meeting hours the office has used this month", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    const month = new Date().toISOString().slice(0, 7);
    await env.DB.prepare("INSERT INTO usage_monthly (office_id, period, meeting_seconds, updated_at) VALUES (?, ?, ?, ?), (?, '2020-01', 999999, 0)")
      .bind(officeId, month, 7200, Date.now(), officeId)
      .run();
    const now = new Date();
    const { body } = await call<{ meetingHours: number; usage: unknown }>(ada, "GET", `/v1/offices/${officeId}/billing`);
    expect(body).toMatchObject({
      meetingHours: 5,
      usage: { seconds: 7200, resetsAt: Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) },
    });
  });

  it("turns away webhooks that aren't signed by Paddle", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    const data = subscription(officeId);

    expect((await deliver("subscription.created", data, { signature: "ts=1;h1=abc" })).status).toBe(401);
    expect((await deliver("subscription.created", data, { signature: await sign("{}") })).status).toBe(401);
    const old = Math.floor(Date.now() / 1000) - 3600;
    const body = JSON.stringify({ event_id: "evt_old", event_type: "subscription.created", data });
    const replay = await exports.default.fetch("https://api.tinyfloor.com/v1/billing/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Paddle-Signature": await sign(body, old) },
      body,
    });
    expect(replay.status).toBe(401);
    expect(await officeRow(officeId)).toEqual({ plan: "free", seats: 3 });
  });

  it("applies each event once, and never lets an older one undo a newer", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    const newer = subscription(officeId, { items: [{ price: { id: "pri_business_month" } }], updated_at: "2026-09-28T12:00:00Z" });
    const older = subscription(officeId, { updated_at: "2026-09-28T11:00:00Z" });

    await deliver("subscription.updated", newer, { eventId: "evt_same" });
    expect((await deliver("subscription.updated", newer, { eventId: "evt_same" })).body).toMatchObject({ duplicate: true });
    await deliver("subscription.updated", older);
    expect(await officeRow(officeId)).toEqual({ plan: "business", seats: 25 });
  });

  it("keeps the plan while a card is retried, and goes back to free once it's cancelled", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    await deliver("subscription.created", subscription(officeId));
    await deliver("subscription.past_due", subscription(officeId, { status: "past_due" }));
    expect(await officeRow(officeId)).toEqual({ plan: "team", seats: 10 });

    await deliver("subscription.canceled", subscription(officeId, { status: "canceled" }));
    expect(await officeRow(officeId)).toEqual({ plan: "free", seats: 3 });
    // Nobody is removed: the office just holds fewer than it has.
    const billing = await call<{ subscription: unknown; members: number }>(ada, "GET", `/v1/offices/${officeId}/billing`);
    expect(billing.body.subscription).toBeNull();
  });

  it("doesn't let an old subscription ending take the plan from the current one", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    await deliver("subscription.created", subscription(officeId, { id: `old_${officeId}` }));
    await deliver("subscription.created", subscription(officeId, { id: `new_${officeId}`, items: [{ price: { id: "pri_business_month" } }] }));
    await deliver("subscription.canceled", subscription(officeId, { id: `old_${officeId}`, status: "canceled" }));
    expect(await officeRow(officeId)).toEqual({ plan: "business", seats: 25 });
  });

  it("won't sell a second plan to an office that has one", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    await deliver("subscription.created", subscription(officeId));
    paddleApi(() => ({ id: "txn_2" }));
    const { status, body } = await call<{ error: { code: string } }>(ada, "POST", `/v1/offices/${officeId}/billing/checkout`, { plan: "business" });
    expect(status).toBe(409);
    expect(body.error.code).toBe("has_subscription");
  });

  it("changes plan through Paddle, and not below the members the office has", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    await deliver("subscription.created", subscription(officeId));

    const calls = paddleApi((_method, _path, body) =>
      subscription(officeId, { items: [{ price: { id: (body as { items: Array<{ price_id: string }> }).items[0].price_id } }], updated_at: new Date(Date.now() + 60_000).toISOString() }),
    );
    const { status, body } = await call<{ plan: string; seats: number; meetingHours: number }>(ada, "POST", `/v1/offices/${officeId}/billing/change`, {
      plan: "business",
    });
    expect(status).toBe(200);
    expect(body).toMatchObject({ plan: "business", seats: 25, meetingHours: 60 });
    expect(calls[0]).toEqual({
      method: "PATCH",
      path: `/subscriptions/sub_${officeId}`,
      body: { items: [{ price_id: "pri_business_month", quantity: 1 }], proration_billing_mode: "prorated_immediately" },
    });

    await addMembers(officeId, 10); // 11 members now
    const tooSmall = await call<{ error: { code: string } }>(ada, "POST", `/v1/offices/${officeId}/billing/change`, { plan: "team" });
    expect(tooSmall.status).toBe(409);
    expect(tooSmall.body.error.code).toBe("too_many_members");
  });

  it("cancels at the end of the period, and can take that back", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    await deliver("subscription.created", subscription(officeId));
    const later = () => new Date(Date.now() + 120_000).toISOString();

    paddleApi(() => subscription(officeId, { scheduled_change: { action: "cancel", effective_at: "2026-10-28T00:00:00Z" }, updated_at: later() }));
    const cancelled = await call<{ plan: string; subscription: Record<string, unknown> }>(ada, "POST", `/v1/offices/${officeId}/billing/cancel`);
    expect(cancelled.body.plan).toBe("team");
    expect(cancelled.body.subscription).toMatchObject({ endsAt: Date.parse("2026-10-28T00:00:00Z"), renewsAt: null });

    vi.restoreAllMocks();
    paddleApi(() => subscription(officeId, { updated_at: new Date(Date.now() + 180_000).toISOString() }));
    const resumed = await call<{ subscription: Record<string, unknown> }>(ada, "POST", `/v1/offices/${officeId}/billing/resume`);
    expect(resumed.body.subscription).toMatchObject({ endsAt: null });
  });

  it("puts the plan on straight after checkout, from Paddle's own record of it", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    const txn = "txn_01m3kh601kc6hcnpyjcn3rqte6";
    paddleApi((_method, path) =>
      path.startsWith("/transactions/") ? { subscription_id: `sub_${officeId}`, custom_data: { office_id: officeId } } : subscription(officeId),
    );
    const { status, body } = await call<{ plan: string; seats: number }>(ada, "POST", `/v1/offices/${officeId}/billing/sync`, { transactionId: txn });
    expect(status).toBe(200);
    expect(body).toMatchObject({ plan: "team", seats: 10 });
  });

  it("won't sync a checkout that was for another office", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    paddleApi(() => ({ subscription_id: "sub_other", custom_data: { office_id: "someone-else" } }));
    const { status } = await call(ada, "POST", `/v1/offices/${officeId}/billing/sync`, { transactionId: "txn_01m3kh601kc6hcnpyjcn3rqte6" });
    expect(status).toBe(404);
    expect(await officeRow(officeId)).toEqual({ plan: "free", seats: 3 });
  });

  it("keeps billing to the office's admins", async () => {
    const ada = await makeUser("Ada");
    const bo = await makeUser("Bo");
    const officeId = await officeOf(ada);
    await env.DB.prepare("INSERT INTO memberships (office_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)")
      .bind(officeId, bo.id, Date.now())
      .run();
    for (const path of ["billing", "billing/details", "billing/invoices/txn_01m3kh601kc6hcnpyjcn3rqte6", "billing/cancel", "billing/payment-method"]) {
      const method = path === "billing/cancel" || path === "billing/payment-method" ? "POST" : "GET";
      expect((await call(bo, method, `/v1/offices/${officeId}/${path}`)).status).toBe(403);
    }
  });

  it("lists this office's payments, its card and the next charge, and nobody else's", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    await deliver("subscription.created", subscription(officeId));
    const payment = (id: string, office: string, overrides: Record<string, unknown> = {}) => ({
      id,
      status: "completed",
      subscription_id: office === officeId ? `sub_${officeId}` : "sub_other",
      custom_data: { office_id: office },
      created_at: "2026-09-28T10:00:00Z",
      billed_at: "2026-09-28T10:00:00Z",
      items: [{ price: { id: "pri_team_month" } }],
      details: { totals: { grand_total: "2280", currency_code: "USD" } },
      adjustments_totals: null,
      payments: [{ status: "captured", method_details: { type: "card", card: { type: "visa", last4: "4242", expiry_month: 3, expiry_year: 2029 } } }],
      ...overrides,
    });
    const calls = paddleApi((_method, path) =>
      path === "/transactions"
        ? [
            payment("txn_refunded", officeId, { adjustments_totals: { breakdown: { refund: "2280" } } }),
            payment("txn_elsewhere", "another-office"),
            payment("txn_card_update", officeId, { details: { totals: { grand_total: "0", currency_code: "USD" } } }),
            payment("txn_first", officeId, { billed_at: "2026-08-28T10:00:00Z" }),
          ]
        : subscription(officeId, {
            next_billed_at: "2026-10-28T00:00:00Z",
            next_transaction: { details: { totals: { grand_total: "2280", currency_code: "USD" } } },
          }),
    );

    const { status, body } = await call<{ nextCharge: unknown; card: unknown; history: Array<Record<string, unknown>> }>(
      ada,
      "GET",
      `/v1/offices/${officeId}/billing/details`,
    );
    expect(status).toBe(200);
    expect(body.nextCharge).toEqual({ at: Date.parse("2026-10-28T00:00:00Z"), amount: 2280, currency: "USD" });
    expect(body.card).toEqual({ brand: "visa", last4: "4242", expires: "03/29" });
    expect(body.history.map((row) => [row.id, row.status, row.plan, row.invoice])).toEqual([
      ["txn_refunded", "refunded", "team", true],
      ["txn_first", "paid", "team", true],
    ]);
    expect(calls.find((one) => one.path === "/transactions")?.query).toContain("customer_id=ctm_1");
  });

  it("hands out invoices for this office's payments only", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    const mine = "txn_01m3kh601kc6hcnpyjcn3rqte6";
    paddleApi((_method, path) =>
      path.endsWith("/invoice")
        ? { url: "https://sandbox-invoice.paddle.com/pdf" }
        : { id: path.split("/")[2], custom_data: { office_id: path.includes(mine) ? officeId : "another-office" } },
    );
    const own = await call<{ url: string }>(ada, "GET", `/v1/offices/${officeId}/billing/invoices/${mine}`);
    expect(own.body).toEqual({ url: "https://sandbox-invoice.paddle.com/pdf" });
    expect((await call(ada, "GET", `/v1/offices/${officeId}/billing/invoices/txn_01m3kh601kc6hcnpyjcn3rqte7`)).status).toBe(404);
    expect((await call(ada, "GET", `/v1/offices/${officeId}/billing/invoices/not-a-payment`)).status).toBe(400);
  });

  it("updates the card through this subscription's own checkout", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    await deliver("subscription.created", subscription(officeId));
    const calls = paddleApi(() => ({ id: "txn_update" }));
    const { body } = await call(ada, "POST", `/v1/offices/${officeId}/billing/payment-method`);
    expect(body).toEqual({ transactionId: "txn_update" });
    expect(calls[0]).toMatchObject({ method: "GET", path: `/subscriptions/sub_${officeId}/update-payment-method-transaction` });
  });

  it("won't close an office whose plan still renews, and stops a cancelled one for good", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    await deliver("subscription.created", subscription(officeId));

    const refused = await call<{ error: { code: string } }>(ada, "DELETE", `/v1/offices/${officeId}`);
    expect(refused.status).toBe(409);
    expect(refused.body.error.code).toBe("cancel_plan_first");

    await deliver("subscription.updated", subscription(officeId, { scheduled_change: { action: "cancel", effective_at: "2026-10-28T00:00:00Z" } }));
    const calls = paddleApi(() => subscription(officeId, { status: "canceled" }));
    expect((await call(ada, "DELETE", `/v1/offices/${officeId}`)).status).toBe(200);
    expect(calls).toEqual([{ method: "POST", path: `/subscriptions/sub_${officeId}/cancel`, body: { effective_from: "immediately" } }]);
    expect(await officeRow(officeId)).toBeNull();
  });
});
