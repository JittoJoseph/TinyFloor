import { env, exports } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";
import { call, makeUser, type TestUser } from "./helpers";

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
  const calls: Array<{ method: string; path: string; body: unknown }> = [];
  const real = globalThis.fetch;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    if (url.hostname !== "sandbox-api.paddle.com") return real(input, init);
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method: init?.method ?? "GET", path: url.pathname, body });
    return Response.json({ data: reply(init?.method ?? "GET", url.pathname, body) });
  });
  return calls;
}

afterEach(() => vi.restoreAllMocks());

describe("billing", () => {
  it("lists the plans, with what the site needs to open a checkout", async () => {
    const { status, body } = await call<{ plans: Array<{ id: string; seats: number }>; billing: unknown }>(null, "GET", "/v1/plans");
    expect(status).toBe(200);
    expect(body.plans.map((plan) => [plan.id, plan.seats])).toEqual([
      ["free", 3],
      ["team", 10],
      ["business", 25],
    ]);
    expect(body.billing).toEqual({ environment: "sandbox", clientToken: "test_client_token" });
  });

  it("makes the checkout itself, for the office the admin is in", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    const calls = paddleApi(() => ({ id: "txn_1" }));

    const { status, body } = await call(ada, "POST", `/v1/offices/${officeId}/billing/checkout`, { plan: "team", interval: "year" });
    expect(status).toBe(200);
    expect(body).toMatchObject({ transactionId: "txn_1" });
    expect(calls).toEqual([
      { method: "POST", path: "/transactions", body: { items: [{ price_id: "pri_team_year", quantity: 1 }], custom_data: { office_id: officeId } } },
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

    expect((await call(bo, "POST", `/v1/offices/${officeId}/billing/checkout`, { plan: "team", interval: "month" })).status).toBe(403);
    expect((await call(ada, "POST", `/v1/offices/${officeId}/billing/checkout`, { plan: "free", interval: "month" })).status).toBe(400);
    expect((await call(ada, "POST", `/v1/offices/${officeId}/billing/checkout`, { plan: "team", interval: "week" })).status).toBe(400);
  });

  it("puts the office on its plan when Paddle says the subscription started", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);

    const { status } = await deliver("subscription.created", subscription(officeId));
    expect(status).toBe(200);
    expect(await officeRow(officeId)).toEqual({ plan: "team", seats: 10 });

    const billing = await call<{ subscription: Record<string, unknown> }>(ada, "GET", `/v1/offices/${officeId}/billing`);
    expect(billing.body.subscription).toMatchObject({ plan: "team", interval: "month", status: "active", renewsAt: Date.parse("2026-10-28T00:00:00Z") });
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
    await deliver("subscription.created", subscription(officeId, { id: `new_${officeId}`, items: [{ price: { id: "pri_business_year" } }] }));
    await deliver("subscription.canceled", subscription(officeId, { id: `old_${officeId}`, status: "canceled" }));
    expect(await officeRow(officeId)).toEqual({ plan: "business", seats: 25 });
  });

  it("won't sell a second plan to an office that has one", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    await deliver("subscription.created", subscription(officeId));
    paddleApi(() => ({ id: "txn_2" }));
    const { status, body } = await call<{ error: { code: string } }>(ada, "POST", `/v1/offices/${officeId}/billing/checkout`, {
      plan: "business",
      interval: "month",
    });
    expect(status).toBe(409);
    expect(body.error.code).toBe("has_subscription");
  });

  it("changes plan through Paddle, and not below the members the office has", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    await deliver("subscription.created", subscription(officeId, { items: [{ price: { id: "pri_business_month" } }] }));
    await addMembers(officeId, 10); // 11 members now

    const tooSmall = await call<{ error: { code: string } }>(ada, "POST", `/v1/offices/${officeId}/billing/change`, { plan: "team", interval: "month" });
    expect(tooSmall.status).toBe(409);
    expect(tooSmall.body.error.code).toBe("too_many_members");

    const calls = paddleApi((_method, _path, body) =>
      subscription(officeId, { items: [{ price: { id: (body as { items: Array<{ price_id: string }> }).items[0].price_id } }], updated_at: new Date(Date.now() + 60_000).toISOString() }),
    );
    const { status, body } = await call<{ plan: string; seats: number }>(ada, "POST", `/v1/offices/${officeId}/billing/change`, {
      plan: "business",
      interval: "year",
    });
    expect(status).toBe(200);
    expect(body).toMatchObject({ plan: "business", seats: 25 });
    expect(calls[0]).toEqual({
      method: "PATCH",
      path: `/subscriptions/sub_${officeId}`,
      body: { items: [{ price_id: "pri_business_year", quantity: 1 }], proration_billing_mode: "prorated_immediately" },
    });
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
    for (const path of ["billing", "billing/cancel", "billing/portal"]) {
      const method = path === "billing" ? "GET" : "POST";
      expect((await call(bo, method, `/v1/offices/${officeId}/${path}`)).status).toBe(403);
    }
  });
});
