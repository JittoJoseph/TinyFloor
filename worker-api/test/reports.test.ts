import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { call, makeUser } from "./helpers";

interface Yours {
  reports: Array<{ id: string; status: string; place: string; news: boolean; messages: Array<{ fromTeam: boolean; body: string }> }>;
  unseen: number;
}

async function admin() {
  const boss = await makeUser("Boss", { email: "boss@example.com" });
  await env.DB.prepare("UPDATE users SET email_verified = 1 WHERE id = ?").bind(boss.id).run();
  return boss;
}

describe("help and feedback", () => {
  it("goes to the team from an office or the demo office, and only its sender sees it", async () => {
    const owner = await makeUser("Owner");
    const office = (await call<{ office: { id: string } }>(owner, "POST", "/v1/offices", { name: "Report Office" })).body.office.id;

    const sent = await call<Yours>(owner, "POST", "/v1/reports", { body: "  The chat shows messages twice  ", officeId: office, page: "/office/x/chat" });
    expect(sent.status).toBe(201);
    expect(sent.body.reports).toHaveLength(1);
    expect(sent.body.reports[0]).toMatchObject({ status: "open", place: "Report Office", news: false });
    expect(sent.body.reports[0].messages).toEqual([expect.objectContaining({ fromTeam: false, body: "The chat shows messages twice" })]);

    const guest = await makeUser("Visitor", { guest: true });
    const lobby = await call<Yours>(guest, "POST", "/v1/reports", { body: "Hello from the demo" });
    expect(lobby.body.reports[0].place).toBe("Demo office");

    // Nobody else sees it, and an office you're not in can't be named.
    const other = await makeUser("Other");
    expect((await call<Yours>(other, "GET", "/v1/reports")).body.reports).toHaveLength(0);
    expect((await call(other, "POST", "/v1/reports", { body: "Hi", officeId: office })).status).toBe(404);
    expect((await call(owner, "POST", "/v1/reports", { body: "   " })).status).toBe(400);
    expect((await call(null, "POST", "/v1/reports", { body: "Hi" })).status).toBe(401);
  });

  it("shows the team's reply as news until it's seen, and a closed one until it's seen closed", async () => {
    const boss = await admin();
    const sender = await makeUser("Sender");
    const id = (await call<Yours>(sender, "POST", "/v1/reports", { body: "Can't hear anyone" })).body.reports[0].id;

    const listed = await call<{ reports: Array<{ id: string; waiting: boolean; name: string }> }>(boss, "GET", "/v1/admin/reports");
    expect(listed.body.reports.find((one) => one.id === id)).toMatchObject({ waiting: true, name: "Sender" });
    expect((await call(sender, "GET", "/v1/admin/reports")).status).toBe(404);

    expect((await call(boss, "POST", `/v1/admin/reports/${id}/messages`, { body: "Which browser?" })).status).toBe(200);
    let yours = (await call<Yours>(sender, "GET", "/v1/reports")).body;
    expect(yours.unseen).toBe(1);
    expect(yours.reports[0].messages.map((one) => one.fromTeam)).toEqual([false, true]);

    await call(sender, "POST", "/v1/reports/seen");
    expect((await call<Yours>(sender, "GET", "/v1/reports")).body.unseen).toBe(0);

    // Their answer puts it back with the team.
    await call(sender, "POST", `/v1/reports/${id}/messages`, { body: "Firefox" });
    const waiting = await call<{ reports: Array<{ id: string; waiting: boolean }> }>(boss, "GET", "/v1/admin/reports");
    expect(waiting.body.reports.find((one) => one.id === id)?.waiting).toBe(true);

    expect((await call(boss, "PATCH", `/v1/admin/reports/${id}`, { status: "closed" })).status).toBe(200);
    yours = (await call<Yours>(sender, "GET", "/v1/reports")).body;
    expect(yours.reports[0]).toMatchObject({ status: "closed", news: true });
    expect((await call(sender, "POST", `/v1/reports/${id}/messages`, { body: "One more" })).status).toBe(409);

    await call(sender, "POST", "/v1/reports/seen");
    expect((await call<Yours>(sender, "GET", "/v1/reports")).body.reports).toHaveLength(0);
    await env.DB.prepare("DELETE FROM users WHERE email = 'boss@example.com'").run();
  });

  it("keeps a report when its sender's account goes", async () => {
    const boss = await admin();
    const gone = await makeUser("Gone Soon");
    const id = (await call<Yours>(gone, "POST", "/v1/reports", { body: "Bye" })).body.reports[0].id;
    await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(gone.id).run();
    const listed = await call<{ reports: Array<{ id: string; name: string; userId: string | null }> }>(boss, "GET", "/v1/admin/reports");
    expect(listed.body.reports.find((one) => one.id === id)).toMatchObject({ name: "Gone Soon", userId: null });
    await env.DB.prepare("DELETE FROM users WHERE email = 'boss@example.com'").run();
  });
});
