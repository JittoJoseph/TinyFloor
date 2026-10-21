import { env, exports } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyTicket } from "../../shared-protocol/src";
import { call, fakeRealtime, makeUser, onFree, type TestUser } from "./helpers";

const SECRET = "whsec_test";

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

async function addAdmin(officeId: string, name = "Cy") {
  const admin = await makeUser(name);
  await env.DB.prepare("INSERT INTO memberships (office_id, user_id, role, joined_at) VALUES (?, ?, 'admin', ?)")
    .bind(officeId, admin.id, Date.now())
    .run();
  return admin;
}

async function officeRow(officeId: string) {
  return env.DB.prepare("SELECT plan, seats FROM offices WHERE id = ?").bind(officeId).first<{ plan: string; seats: number }>();
}

let events = 0;
/** A subscription as Creem sends it, with the product and customer expanded. */
function subscription(officeId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: `sub_${officeId}`,
    object: "subscription",
    status: "active",
    product: { id: "prod_pro", price: 2900, currency: "USD" },
    customer: { id: "cust_1", email: "ada@example.com" },
    metadata: { office_id: officeId },
    updated_at: new Date(Date.now() + events * 1000).toISOString(),
    current_period_end_date: "2026-11-10T00:00:00.000Z",
    next_transaction_date: "2026-11-10T00:00:00.000Z",
    ...overrides,
  };
}

async function sign(body: string, secret = SECRET) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** A webhook as Creem sends it: no Origin, no cookie, just the signature. */
async function deliver(type: string, object: unknown, options: { eventId?: string; signature?: string } = {}) {
  events++;
  const body = JSON.stringify({
    id: options.eventId ?? `evt_${events}_${crypto.randomUUID()}`,
    eventType: type,
    created_at: Date.now(),
    object,
  });
  const response = await exports.default.fetch("https://api.tinyfloor.com/v1/billing/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json", "creem-signature": options.signature ?? (await sign(body)) },
    body,
  });
  return { status: response.status, body: response.status === 200 ? await response.json() : null };
}

/** Creem's API, answered by the test: every call is recorded. */
function creemApi(reply: (method: string, path: string, body: unknown, query: URLSearchParams) => unknown) {
  const calls: Array<{ method: string; path: string; body: unknown; query?: string }> = [];
  const real = globalThis.fetch;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    if (url.hostname !== "test-api.creem.io") return real(input, init);
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method: init?.method ?? "GET", path: url.pathname, body, ...(url.search ? { query: url.search } : {}) });
    return Response.json(reply(init?.method ?? "GET", url.pathname, body, url.searchParams));
  });
  return calls;
}

afterEach(() => vi.restoreAllMocks());

describe("billing", () => {
  it("lists the plans, and says paid plans are on sale here", async () => {
    const { status, body } = await call<{
      plans: Array<{ id: string; seats: number; meetingHours: number; price: number | null }>;
      billing: unknown;
    }>(null, "GET", "/v1/plans");
    expect(status).toBe(200);
    expect(body.plans.map((plan) => [plan.id, plan.seats, plan.meetingHours, plan.price])).toEqual([
      ["free", 3, 40, null],
      ["pro", 15, 120, 2900],
    ]);
    expect(body.billing).toEqual({ mode: "test" });
  });

  it("makes the checkout itself, for the office the admin is in", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    const calls = creemApi(() => ({ id: "ch_1abcdefgh", checkout_url: "https://creem.io/test/checkout/prod_pro/ch_1abcdefgh" }));

    const { status, body } = await call(ada, "POST", `/v1/offices/${officeId}/billing/checkout`, { plan: "pro" });
    expect(status).toBe(200);
    expect(body).toEqual({ checkoutId: "ch_1abcdefgh", url: "https://creem.io/test/checkout/prod_pro/ch_1abcdefgh" });
    expect(calls).toEqual([
      {
        method: "POST",
        path: "/v1/checkouts",
        body: {
          product_id: "prod_pro",
          units: 1,
          request_id: officeId,
          metadata: { office_id: officeId, payer_id: ada.id },
          customer: { email: expect.stringContaining("@") },
        },
      },
    ]);
  });

  it("lets only admins buy, and only real plans", async () => {
    const ada = await makeUser("Ada");
    const bo = await makeUser("Bo");
    const officeId = await officeOf(ada);
    await env.DB.prepare("INSERT INTO memberships (office_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)")
      .bind(officeId, bo.id, Date.now())
      .run();
    creemApi(() => ({ id: "ch_1abcdefgh", checkout_url: "https://creem.io/x" }));

    expect((await call(bo, "POST", `/v1/offices/${officeId}/billing/checkout`, { plan: "pro" })).status).toBe(403);
    expect((await call(ada, "POST", `/v1/offices/${officeId}/billing/checkout`, { plan: "free" })).status).toBe(400);
    expect((await call(ada, "POST", `/v1/offices/${officeId}/billing/checkout`, { plan: "enterprise" })).status).toBe(400);
  });

  it("puts the office on its plan when Creem says the subscription started", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);

    const { status } = await deliver("subscription.active", subscription(officeId));
    expect(status).toBe(200);
    expect(await officeRow(officeId)).toEqual({ plan: "pro", seats: 15 });

    const billing = await call<{ subscription: Record<string, unknown>; meetingHours: number }>(
      ada,
      "GET",
      `/v1/offices/${officeId}/billing`,
    );
    expect(billing.body.subscription).toMatchObject({ plan: "pro", status: "active", renewsAt: Date.parse("2026-11-10T00:00:00Z") });
    expect(billing.body.meetingHours).toBe(120);
    // The room hears the plan's hours straight away, so a pause lifts without waiting for a new ticket.
    expect(await fakeRealtime().calls()).toContainEqual(["setMeetingAllowance", officeId, 120]);
  });

  it("takes the office from the checkout when the subscription doesn't carry it", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    await deliver("checkout.completed", {
      id: "ch_1abcdefgh",
      status: "completed",
      metadata: { office_id: officeId, payer_id: ada.id },
      subscription: subscription(officeId, { metadata: {} }),
    });
    expect(await officeRow(officeId)).toEqual({ plan: "pro", seats: 15 });
  });

  it("shows the meeting hours the office has used this month", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    await onFree(officeId);
    const month = new Date().toISOString().slice(0, 7);
    await env.DB.prepare(
      "INSERT INTO usage_monthly (office_id, period, meeting_seconds, updated_at) VALUES (?, ?, ?, ?), (?, '2020-01', 999999, 0)",
    )
      .bind(officeId, month, 7200, Date.now(), officeId)
      .run();
    const now = new Date();
    const { body } = await call<{ meetingHours: number; usage: unknown }>(ada, "GET", `/v1/offices/${officeId}/billing`);
    expect(body).toMatchObject({
      meetingHours: 40,
      usage: { seconds: 7200, resetsAt: Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) },
    });
  });

  it("turns away webhooks that aren't signed by Creem", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    await onFree(officeId);
    const data = subscription(officeId);

    expect((await deliver("subscription.active", data, { signature: "abc" })).status).toBe(401);
    expect((await deliver("subscription.active", data, { signature: await sign("{}") })).status).toBe(401);
    const body = JSON.stringify({ id: "evt_other", eventType: "subscription.active", object: data });
    const wrongKey = await exports.default.fetch("https://api.tinyfloor.com/v1/billing/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json", "creem-signature": await sign(body, "someone-elses-secret") },
      body,
    });
    expect(wrongKey.status).toBe(401);
    expect(await officeRow(officeId)).toEqual({ plan: "free", seats: 3 });
  });

  it("applies each event once, and never lets an older one undo a newer", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    const newer = subscription(officeId, { updated_at: "2026-10-10T12:00:00Z" });
    const older = subscription(officeId, { status: "canceled", updated_at: "2026-10-10T11:00:00Z" });

    await deliver("subscription.update", newer, { eventId: "evt_same" });
    expect((await deliver("subscription.update", newer, { eventId: "evt_same" })).body).toMatchObject({ duplicate: true });
    await deliver("subscription.update", older);
    expect(await officeRow(officeId)).toEqual({ plan: "pro", seats: 15 });
  });

  it("keeps the plan while a card is retried, and goes back to free once it's cancelled", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    await deliver("subscription.active", subscription(officeId));
    await deliver("subscription.past_due", subscription(officeId, { status: "past_due" }));
    expect(await officeRow(officeId)).toEqual({ plan: "pro", seats: 15 });

    await deliver("subscription.canceled", subscription(officeId, { status: "canceled" }));
    expect(await officeRow(officeId)).toEqual({ plan: "free", seats: 3 });
    // Nobody is removed: the office just holds fewer than it has.
    const billing = await call<{ subscription: unknown; members: number }>(ada, "GET", `/v1/offices/${officeId}/billing`);
    expect(billing.body.subscription).toBeNull();
  });

  it("goes back to free when a period ends unpaid, and back up when it's paid after all", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    await deliver("subscription.active", subscription(officeId));
    await deliver("subscription.expired", subscription(officeId, { status: "unpaid" }));
    expect(await officeRow(officeId)).toEqual({ plan: "free", seats: 3 });
    await deliver("subscription.paid", subscription(officeId, { status: "active" }));
    expect(await officeRow(officeId)).toEqual({ plan: "pro", seats: 15 });
  });

  it("doesn't let an old subscription ending take the plan from the current one", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    await deliver("subscription.active", subscription(officeId, { id: `old_${officeId}` }));
    await deliver("subscription.active", subscription(officeId, { id: `new_${officeId}` }));
    await deliver("subscription.canceled", subscription(officeId, { id: `old_${officeId}`, status: "canceled" }));
    expect(await officeRow(officeId)).toEqual({ plan: "pro", seats: 15 });
  });

  it("won't sell a second plan to an office that has one", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    await deliver("subscription.active", subscription(officeId));
    creemApi(() => ({ id: "ch_2abcdefgh", checkout_url: "https://creem.io/x" }));
    const { status, body } = await call<{ error: { code: string } }>(ada, "POST", `/v1/offices/${officeId}/billing/checkout`, {
      plan: "pro",
    });
    expect(status).toBe(409);
    expect(body.error.code).toBe("has_subscription");
  });

  it("cancels at the end of the period, and can take that back", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    await deliver("subscription.active", subscription(officeId));
    const later = (ms: number) => new Date(Date.now() + ms).toISOString();

    const calls = creemApi(() => subscription(officeId, { status: "scheduled_cancel", updated_at: later(120_000) }));
    const cancelled = await call<{ plan: string; subscription: Record<string, unknown> }>(
      ada,
      "POST",
      `/v1/offices/${officeId}/billing/cancel`,
    );
    expect(calls[0]).toEqual({ method: "POST", path: `/v1/subscriptions/sub_${officeId}/cancel`, body: { mode: "scheduled" } });
    // Still on the plan until the period it paid for is over.
    expect(cancelled.body.plan).toBe("pro");
    expect(cancelled.body.subscription).toMatchObject({ endsAt: Date.parse("2026-11-10T00:00:00Z"), renewsAt: null });

    vi.restoreAllMocks();
    creemApi(() => subscription(officeId, { updated_at: later(180_000) }));
    const resumed = await call<{ subscription: Record<string, unknown> }>(ada, "POST", `/v1/offices/${officeId}/billing/resume`);
    expect(resumed.body.subscription).toMatchObject({ endsAt: null });
  });

  it("puts the plan on straight after checkout, from Creem's own record of it", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    creemApi((_method, path) =>
      path === "/v1/checkouts"
        ? { id: "ch_1abcdefgh", status: "completed", metadata: { office_id: officeId }, subscription: `sub_${officeId}` }
        : subscription(officeId),
    );
    const { status, body } = await call<{ plan: string; seats: number }>(ada, "POST", `/v1/offices/${officeId}/billing/sync`, {
      checkoutId: "ch_1abcdefgh",
    });
    expect(status).toBe(200);
    expect(body).toMatchObject({ plan: "pro", seats: 15 });
  });

  it("won't sync a checkout that was for another office", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    await onFree(officeId);
    creemApi(() => ({ id: "ch_1abcdefgh", status: "completed", metadata: { office_id: "someone-else" }, subscription: "sub_other" }));
    const { status } = await call(ada, "POST", `/v1/offices/${officeId}/billing/sync`, { checkoutId: "ch_1abcdefgh" });
    expect(status).toBe(404);
    expect((await call(ada, "POST", `/v1/offices/${officeId}/billing/sync`, { checkoutId: "../products" })).status).toBe(400);
    expect(await officeRow(officeId)).toEqual({ plan: "free", seats: 3 });
  });

  it("keeps billing to the office's admins", async () => {
    const ada = await makeUser("Ada");
    const bo = await makeUser("Bo");
    const officeId = await officeOf(ada);
    await env.DB.prepare("INSERT INTO memberships (office_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)")
      .bind(officeId, bo.id, Date.now())
      .run();
    for (const path of ["billing", "billing/details", "billing/cancel", "billing/portal"]) {
      const method = path === "billing/cancel" || path === "billing/portal" ? "POST" : "GET";
      expect((await call(bo, method, `/v1/offices/${officeId}/${path}`)).status).toBe(403);
    }
  });

  it("lists this subscription's payments and the next charge, and nobody else's", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    await deliver("subscription.active", subscription(officeId));
    const payment = (id: string, sub: string, overrides: Record<string, unknown> = {}) => ({
      id,
      amount: 2280,
      amount_paid: 2280,
      currency: "USD",
      status: "paid",
      subscription: sub,
      customer: "cust_1",
      created_at: Date.parse("2026-10-10T10:00:00Z"),
      ...overrides,
    });
    const calls = creemApi((_method, path) =>
      path === "/v1/transactions/search"
        ? {
            items: [
              payment("tran_first", `sub_${officeId}`, { created_at: Date.parse("2026-09-10T10:00:00Z") }),
              payment("tran_elsewhere", "sub_other"),
              payment("tran_refunded", `sub_${officeId}`, { status: "refunded", refunded_amount: 2280 }),
            ],
          }
        : subscription(officeId),
    );

    const { status, body } = await call<{ nextCharge: unknown; card: unknown; history: Array<Record<string, unknown>> }>(
      ada,
      "GET",
      `/v1/offices/${officeId}/billing/details`,
    );
    expect(status).toBe(200);
    expect(body.nextCharge).toEqual({ at: Date.parse("2026-11-10T00:00:00Z"), amount: 2900, currency: "USD" });
    expect(body.card).toBeNull();
    expect(body.history.map((row) => [row.id, row.status, row.plan, row.invoice])).toEqual([
      ["tran_refunded", "refunded", null, true],
      ["tran_first", "paid", null, true],
    ]);
    expect(calls.find((one) => one.path === "/v1/transactions/search")?.query).toContain("customer_id=cust_1");
  });

  it("opens Creem's billing portal for the person who paid, and no other admin", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    const cy = await addAdmin(officeId);
    await deliver("subscription.active", subscription(officeId, { metadata: { office_id: officeId, payer_id: ada.id } }));
    const calls = creemApi(() => ({ customer_portal_link: "https://creem.io/my-orders/login/xyz" }));

    const own = await call<{ url: string }>(ada, "POST", `/v1/offices/${officeId}/billing/portal`);
    expect(own.body).toEqual({ url: "https://creem.io/my-orders/login/xyz" });
    expect(calls).toEqual([{ method: "POST", path: "/v1/customers/billing", body: { customer_id: "cust_1" } }]);

    const other = await call<{ error: { code: string } }>(cy, "POST", `/v1/offices/${officeId}/billing/portal`);
    expect(other.status).toBe(403);
    expect(other.body.error.code).toBe("not_payer");
  });

  it("starts every office on a 14-day Pro trial, so the whole team can move in", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    expect(await officeRow(officeId)).toEqual({ plan: "pro", seats: 15 });
    const billing = await call<{ trial: { plan: string; endsAt: number } | null; graceEndsAt: number | null }>(
      ada,
      "GET",
      `/v1/offices/${officeId}/billing`,
    );
    expect(billing.body.trial?.plan).toBe("pro");
    expect(billing.body.trial!.endsAt - Date.now()).toBeGreaterThan(13.9 * 86_400_000);
    expect(billing.body.graceEndsAt).toBeNull();

    // Five of them, well past Free's 3, without anyone asking.
    const { body: link } = await call<{ code: string }>(ada, "GET", `/v1/offices/${officeId}/invite`);
    for (const name of ["Bo", "Cy", "Di", "Ed"]) {
      expect((await call(await makeUser(name), "POST", `/v1/invites/${link.code}/accept`)).status).toBe(200);
    }
  });

  it("goes to Free when the trial ends, keeping everyone on the floor for two weeks while nobody new joins", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    await addMembers(officeId, 4);
    const { body: link } = await call<{ code: string }>(ada, "GET", `/v1/offices/${officeId}/invite`);
    const ended = Date.now() - 1000;
    await env.DB.prepare("UPDATE offices SET trial_ends_at = ? WHERE id = ?").bind(ended, officeId).run();

    // Free the moment the office is read; nobody removed, and nobody locked out yet.
    const after = await call<{ plan: string; seats: number; members: number; trial: unknown; graceEndsAt: number }>(
      ada,
      "GET",
      `/v1/offices/${officeId}/billing`,
    );
    expect(after.body).toMatchObject({ plan: "free", seats: 3, members: 5, trial: null });
    expect(after.body.graceEndsAt).toBe(ended + 14 * 86_400_000);
    expect(await fakeRealtime().calls()).toContainEqual(["setMeetingAllowance", officeId, 40]);
    const floor = await call<{ ticket: string }>(ada, "POST", `/v1/offices/${officeId}/ticket`);
    expect(await verifyTicket(floor.body.ticket, env.TICKET_SECRET)).toMatchObject({ cap: 15 });

    // Nobody new, though: the office is over Free's 3.
    expect((await call<{ invite: { full: boolean } }>(null, "GET", `/v1/invites/${link.code}`)).body.invite.full).toBe(true);
    const turned = await call<{ error: { code: string } }>(await makeUser("Fay"), "POST", `/v1/invites/${link.code}/accept`);
    expect(turned.status).toBe(409);
    expect(turned.body.error.code).toBe("office_full");

    // Two weeks on, the floor holds Free's 3 at once; chat stays open to all five.
    await env.DB.prepare("UPDATE offices SET trial_ends_at = ? WHERE id = ?")
      .bind(Date.now() - 15 * 86_400_000, officeId)
      .run();
    const later = await call<{ ticket: string }>(ada, "POST", `/v1/offices/${officeId}/ticket`);
    expect(await verifyTicket(later.body.ticket, env.TICKET_SECRET)).toMatchObject({ cap: 3 });
    const chat = await call<{ ticket: string }>(ada, "POST", `/v1/offices/${officeId}/chat-ticket`);
    expect(await verifyTicket(chat.body.ticket, env.TICKET_SECRET)).toMatchObject({ cap: 15 });
    expect((await call<{ graceEndsAt: number | null }>(ada, "GET", `/v1/offices/${officeId}/billing`)).body.graceEndsAt).toBeNull();
  });

  it("lets the plan bought during the trial replace it", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    await deliver("subscription.active", subscription(officeId));
    expect(await officeRow(officeId)).toEqual({ plan: "pro", seats: 15 });
    const trial = await env.DB.prepare("SELECT trial_ends_at FROM offices WHERE id = ?").bind(officeId).first<{ trial_ends_at: number }>();
    expect(trial?.trial_ends_at).toBe(0);
  });

  it("ends every trial that's over in the daily run", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    await env.DB.prepare("UPDATE offices SET plan = 'pro', seats = 15, trial_ends_at = ? WHERE id = ?")
      .bind(Date.now() - 1000, officeId)
      .run();
    const { endTrials } = await import("../src/billing");
    expect(await endTrials(env)).toBeGreaterThanOrEqual(1);
    expect(await officeRow(officeId)).toEqual({ plan: "free", seats: 3 });
  });

  it("won't close an office whose plan still renews, and stops a cancelled one for good", async () => {
    const ada = await makeUser("Ada");
    const officeId = await officeOf(ada);
    await deliver("subscription.active", subscription(officeId));

    const refused = await call<{ error: { code: string } }>(ada, "DELETE", `/v1/offices/${officeId}`);
    expect(refused.status).toBe(409);
    expect(refused.body.error.code).toBe("cancel_plan_first");

    await deliver("subscription.scheduled_cancel", subscription(officeId, { status: "scheduled_cancel" }));
    const calls = creemApi(() => subscription(officeId, { status: "canceled" }));
    expect((await call(ada, "DELETE", `/v1/offices/${officeId}`)).status).toBe(200);
    expect(calls).toEqual([{ method: "POST", path: `/v1/subscriptions/sub_${officeId}/cancel`, body: { mode: "immediate" } }]);
    expect(await officeRow(officeId)).toBeNull();
  });
});
