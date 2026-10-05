import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { call, fakeRealtime, makeUser, type TestUser } from "./helpers";

type Open = { ticket: { id: string; unread: number } | null };
type View = { id: string; status: string; messages: Array<{ mine: boolean; team: boolean; name: string; body: string }> };
type AdminList = { tickets: Array<{ id: string; place: string; name: string; unread: number; last: string }>; total: number };
type AdminView = { ticket: { id: string; name: string; page: string; status: string }; messages: Array<{ team: boolean; body: string }> };

async function admin() {
  const boss = await makeUser("Boss", { email: "boss@example.com" });
  await env.DB.prepare("UPDATE users SET email_verified = 1 WHERE id = ?").bind(boss.id).run();
  return boss;
}
const dropAdmin = () => env.DB.prepare("DELETE FROM users WHERE email = 'boss@example.com'").run();

async function officeWithTwo(name: string) {
  const owner = await makeUser(`${name} Owner`);
  const office = (await call<{ office: { id: string } }>(owner, "POST", "/v1/offices", { name })).body.office.id;
  const mate = await makeUser(`${name} Mate`);
  const { code } = (await call<{ code: string }>(owner, "GET", `/v1/offices/${office}/invite`)).body;
  await call(mate, "POST", `/v1/invites/${code}/accept`);
  return { owner, mate, office };
}

const say = (who: TestUser, office: string | null, body: string) =>
  call<{ id: string }>(who, "POST", "/v1/help", { body, ...(office ? { office } : {}), page: "/office/x" });
const openHere = (who: TestUser, office?: string) => call<Open>(who, "GET", `/v1/help${office ? `?office=${office}` : ""}`);

describe("help and feedback", () => {
  it("keeps one open ticket per office, which everyone in it shares", async () => {
    const { owner, mate, office } = await officeWithTwo("Help Shared");
    expect((await openHere(owner, office)).body.ticket).toBeNull();

    const first = await say(owner, office, "Messages show twice");
    expect(first.status).toBe(201);
    // Writing again, from anyone in the office, adds to the same one.
    expect((await say(mate, office, "Same here")).body.id).toBe(first.body.id);
    expect((await openHere(owner, office)).body.ticket).toEqual({ id: first.body.id, unread: 1 });
    // The mate wrote in it, so it's read for them.
    expect((await openHere(mate, office)).body.ticket?.unread).toBe(0);

    const view = await call<View>(owner, "GET", `/v1/help/${first.body.id}`);
    expect(view.body.messages.map((one) => [one.name, one.mine])).toEqual([
      ["Help Shared Owner", true],
      ["Help Shared Mate", false],
    ]);
    // Reading it is what makes it read.
    expect((await openHere(owner, office)).body.ticket?.unread).toBe(0);

    const outsider = await makeUser("Outsider");
    expect((await openHere(outsider, office)).status).toBe(404);
    expect((await call(outsider, "GET", `/v1/help/${first.body.id}`)).status).toBe(404);
    expect((await say(owner, office, "   ")).status).toBe(400);

    const told = (await fakeRealtime().calls()).filter((one) => one[0] === "helpMessage" && one[1] === "Help Shared");
    expect(told.map((one) => one[4])).toEqual([true, false]);
  });

  it("gives every demo office visitor their own", async () => {
    const guest = await makeUser("Visitor", { guest: true });
    const other = await makeUser("Other Visitor", { guest: true });
    const { id } = (await say(guest, null, "Hello from the demo")).body;
    expect((await openHere(guest)).body.ticket?.id).toBe(id);
    expect((await openHere(other)).body.ticket).toBeNull();
    expect((await call(other, "GET", `/v1/help/${id}`)).status).toBe(404);
  });

  it("lets the team answer and close it, after which the next message opens a new one", async () => {
    const boss = await admin();
    const { owner, office } = await officeWithTwo("Help Answered");
    const { id } = (await say(owner, office, "Can't hear anyone")).body;

    const open = (await call<AdminList>(boss, "GET", "/v1/admin/help")).body.tickets.find((one) => one.id === id);
    expect(open).toMatchObject({ place: "Help Answered", name: "Help Answered Owner", unread: 1, last: "Can't hear anyone" });
    expect((await call(owner, "GET", "/v1/admin/help")).status).toBe(404);

    const full = await call<AdminView>(boss, "GET", `/v1/admin/help/${id}`);
    expect(full.body.ticket).toMatchObject({ page: "/office/x", status: "open" });
    expect((await call<AdminList>(boss, "GET", "/v1/admin/help")).body.tickets.find((one) => one.id === id)?.unread).toBe(0);

    await call(boss, "POST", `/v1/admin/help/${id}/messages`, { body: "Which browser?" });
    expect((await openHere(owner, office)).body.ticket?.unread).toBe(1);
    // The office's chat is told at once, so the count turns up without waiting for the next look.
    expect(await fakeRealtime().calls()).toContainEqual(["helpChanged", office]);
    expect((await call<View>(owner, "GET", `/v1/help/${id}`)).body.messages.at(-1)).toMatchObject({ team: true, name: "TinyFloor" });

    expect((await call(boss, "POST", `/v1/admin/help/${id}/close`)).status).toBe(200);
    expect((await openHere(owner, office)).body.ticket).toBeNull();
    expect((await call<View>(owner, "GET", `/v1/help/${id}`)).body.status).toBe("closed");
    expect((await call(boss, "POST", `/v1/admin/help/${id}/messages`, { body: "Too late" })).status).toBe(404);
    expect((await call<AdminList>(boss, "GET", "/v1/admin/help?status=closed")).body.tickets.some((one) => one.id === id)).toBe(true);

    const next = (await say(owner, office, "Something else now")).body.id;
    expect(next).not.toBe(id);
    await dropAdmin();
  });

  it("keeps tickets for the team when their office closes", async () => {
    const boss = await admin();
    const owner = await makeUser("Closing Owner");
    const office = (await call<{ office: { id: string } }>(owner, "POST", "/v1/offices", { name: "Help Closing" })).body.office.id;
    const { id } = (await say(owner, office, "Bye")).body;
    await call(owner, "DELETE", `/v1/offices/${office}`);
    expect((await call<AdminView>(boss, "GET", `/v1/admin/help/${id}`)).body.ticket.name).toBe("Closing Owner");
    expect((await call(owner, "GET", `/v1/help/${id}`)).status).toBe(404);
    await dropAdmin();
  });
});
