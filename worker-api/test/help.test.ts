import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { call, fakeRealtime, makeUser } from "./helpers";

interface Tickets {
  tickets: Array<{ id: string; title: string; status: string; unread: number }>;
}

interface TicketView {
  ticket: { id: string; title: string; status: string };
  messages: Array<{ mine: boolean; team: boolean; name: string; body: string }>;
}

interface Places {
  places: Array<{ key: string; place: string; officeId: string | null; lobby: boolean; visitor: string | null; open: number; unread: number }>;
}

async function admin() {
  const boss = await makeUser("Boss", { email: "boss@example.com" });
  await env.DB.prepare("UPDATE users SET email_verified = 1 WHERE id = ?").bind(boss.id).run();
  return boss;
}

async function officeWithTwo(name: string) {
  const owner = await makeUser(`${name} Owner`);
  const office = (await call<{ office: { id: string } }>(owner, "POST", "/v1/offices", { name })).body.office.id;
  const mate = await makeUser(`${name} Mate`);
  const { code } = (await call<{ code: string }>(owner, "GET", `/v1/offices/${office}/invite`)).body;
  await call(mate, "POST", `/v1/invites/${code}/accept`);
  return { owner, mate, office };
}

const open = (who: Awaited<ReturnType<typeof makeUser>>, office: string | null, body: string) =>
  call<Tickets & { id: string }>(who, "POST", "/v1/help", { body, ...(office ? { office } : {}), page: "/office/x" });

describe("help and feedback", () => {
  it("opens a ticket the whole office can follow, named after its first line", async () => {
    const { owner, mate, office } = await officeWithTwo("Help Shared");
    const opened = await open(owner, office, "  Messages show twice\nAfter switching language, every message is doubled.  ");
    expect(opened.status).toBe(201);
    expect(opened.body.tickets).toEqual([expect.objectContaining({ id: opened.body.id, title: "Messages show twice", status: "open", unread: 0 })]);

    // The mate sees it in Chat, with nothing new to them until they open it.
    expect((await call<Tickets>(mate, "GET", `/v1/help?office=${office}`)).body.tickets).toEqual([expect.objectContaining({ unread: 0 })]);
    const view = await call<TicketView>(mate, "GET", `/v1/help/${opened.body.id}`);
    expect(view.body.messages).toEqual([expect.objectContaining({ mine: false, name: "Help Shared Owner" })]);
    await call(mate, "POST", `/v1/help/${opened.body.id}/messages`, { body: "Same here" });
    expect((await call<Tickets>(owner, "GET", `/v1/help?office=${office}`)).body.tickets[0].unread).toBe(1);

    // Another issue is another ticket.
    await open(mate, office, "The whiteboard doesn't save");
    expect((await call<Tickets>(owner, "GET", `/v1/help?office=${office}`)).body.tickets).toHaveLength(2);

    const outsider = await makeUser("Outsider");
    expect((await call(outsider, "GET", `/v1/help?office=${office}`)).status).toBe(404);
    expect((await call(outsider, "GET", `/v1/help/${opened.body.id}`)).status).toBe(404);
    expect((await call(outsider, "POST", `/v1/help/${opened.body.id}/messages`, { body: "Hi" })).status).toBe(404);
    expect((await call(owner, "POST", "/v1/help", { office, body: "   " })).status).toBe(400);

    const told = (await fakeRealtime().calls()).filter((one) => one[0] === "helpMessage" && one[1] === "Help Shared");
    expect(told.map((one) => one[4])).toEqual([true, false, true]);
  });

  it("keeps a demo office visitor's tickets to themselves", async () => {
    const guest = await makeUser("Visitor", { guest: true });
    const other = await makeUser("Other Visitor", { guest: true });
    const { id } = (await open(guest, null, "Hello from the demo")).body;
    expect((await call<Tickets>(guest, "GET", "/v1/help")).body.tickets).toHaveLength(1);
    expect((await call<Tickets>(other, "GET", "/v1/help")).body.tickets).toHaveLength(0);
    expect((await call(other, "GET", `/v1/help/${id}`)).status).toBe(404);
  });

  it("shows the team each place with what it hasn't read, and closes a ticket once it's dealt with", async () => {
    const boss = await admin();
    const { owner, mate, office } = await officeWithTwo("Help Answered");
    const { id } = (await open(owner, office, "Can't hear anyone")).body;

    const listed = (await call<Places>(boss, "GET", "/v1/admin/help")).body.places.find((one) => one.officeId === office)!;
    expect(listed).toMatchObject({ key: `office:${office}`, place: "Help Answered", open: 1, unread: 1, lobby: false });
    expect((await call(owner, "GET", "/v1/admin/help")).status).toBe(404);

    const place = await call<{ tickets: Array<{ id: string; messages: Array<{ page: string }> }> }>(boss, "GET", `/v1/admin/help/place?key=office:${office}`);
    expect(place.body.tickets[0].messages[0].page).toBe("/office/x");
    await call(boss, "POST", "/v1/admin/help/read", { key: `office:${office}` });
    expect((await call<Places>(boss, "GET", "/v1/admin/help")).body.places.find((one) => one.officeId === office)?.unread).toBe(0);

    // The answer is new to the opener, not to the mate who never opened it.
    expect((await call(boss, "POST", `/v1/admin/help/${id}/messages`, { body: "Which browser?" })).status).toBe(200);
    const owners = (await call<Tickets>(owner, "GET", `/v1/help?office=${office}`)).body.tickets[0];
    expect(owners.unread).toBe(1);
    expect((await call<Tickets>(mate, "GET", `/v1/help?office=${office}`)).body.tickets[0].unread).toBe(0);
    expect((await call<TicketView>(owner, "GET", `/v1/help/${id}`)).body.messages.at(-1)).toMatchObject({ team: true, name: "TinyFloor" });

    // Closed: it stays for the opener until they've read the last of it, and takes nothing more.
    await call(boss, "PATCH", `/v1/admin/help/${id}`, { status: "closed" });
    expect((await call<Tickets>(owner, "GET", `/v1/help?office=${office}`)).body.tickets).toEqual([expect.objectContaining({ status: "closed" })]);
    expect((await call<Tickets>(mate, "GET", `/v1/help?office=${office}`)).body.tickets).toHaveLength(0);
    expect((await call(owner, "POST", `/v1/help/${id}/messages`, { body: "One more" })).status).toBe(409);
    await call(owner, "POST", `/v1/help/${id}/read`);
    expect((await call<Tickets>(owner, "GET", `/v1/help?office=${office}`)).body.tickets).toHaveLength(0);
    await env.DB.prepare("DELETE FROM users WHERE email = 'boss@example.com'").run();
  });

  it("keeps tickets for the team when their office closes", async () => {
    const boss = await admin();
    const owner = await makeUser("Closing Owner");
    const office = (await call<{ office: { id: string } }>(owner, "POST", "/v1/offices", { name: "Help Closing" })).body.office.id;
    const { id } = (await open(owner, office, "Bye")).body;
    await call(owner, "DELETE", `/v1/offices/${office}`);
    const places = (await call<Places>(boss, "GET", "/v1/admin/help")).body.places;
    expect(places.find((one) => one.key === `ticket:${id}`)).toMatchObject({ place: "Help Closing", officeId: null });
    expect((await call(owner, "GET", `/v1/help/${id}`)).status).toBe(404);
    await env.DB.prepare("DELETE FROM users WHERE email = 'boss@example.com'").run();
  });
});
