import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { call, fakeRealtime, makeUser } from "./helpers";

interface Conversation {
  messages: Array<{ mine: boolean; team: boolean; name: string; body: string }>;
  unread: number;
}

interface Admin {
  threads: Array<{ id: string; officeId: string | null; place: string; waiting: boolean; messages: Array<{ team: boolean; body: string; name: string }> }>;
  total: number;
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

describe("help and feedback", () => {
  it("is one conversation per office, shared by the people in it and nobody else", async () => {
    const { owner, mate, office } = await officeWithTwo("Help Shared");
    const started = await call<Conversation>(owner, "POST", "/v1/help", { office, body: "  Messages show twice  ", page: "/office/x/chat" });
    expect(started.status).toBe(201);
    expect(started.body.messages).toEqual([expect.objectContaining({ mine: true, team: false, body: "Messages show twice" })]);

    const seen = await call<Conversation>(mate, "GET", `/v1/help?office=${office}`);
    expect(seen.body.messages).toEqual([expect.objectContaining({ mine: false, name: "Help Shared Owner" })]);
    // The mate hasn't taken part, so nothing is new to them.
    expect(seen.body.unread).toBe(0);
    await call(mate, "POST", "/v1/help", { office, body: "Same here" });
    expect((await call<Conversation>(owner, "GET", `/v1/help?office=${office}`)).body.unread).toBe(1);

    const outsider = await makeUser("Outsider");
    expect((await call(outsider, "GET", `/v1/help?office=${office}`)).status).toBe(404);
    expect((await call(outsider, "POST", "/v1/help", { office, body: "Hi" })).status).toBe(404);
    // In the demo office it's their own.
    expect((await call<Conversation>(outsider, "GET", "/v1/help")).body.messages).toHaveLength(0);
    expect((await call(owner, "POST", "/v1/help", { office, body: "   " })).status).toBe(400);
    expect((await call(null, "GET", "/v1/help")).status).toBe(401);

    const told = (await fakeRealtime().calls()).filter((one) => one[0] === "helpMessage" && one[1] === "Help Shared");
    expect(told).toEqual([
      ["helpMessage", "Help Shared", "Help Shared Owner", "Messages show twice", true],
      ["helpMessage", "Help Shared", "Help Shared Mate", "Same here", false],
    ]);
  });

  it("gives every demo office visitor their own, guests too", async () => {
    const guest = await makeUser("Visitor", { guest: true });
    const other = await makeUser("Other Visitor", { guest: true });
    await call(guest, "POST", "/v1/help", { body: "Hello from the demo" });
    expect((await call<Conversation>(guest, "GET", "/v1/help")).body.messages).toHaveLength(1);
    expect((await call<Conversation>(other, "GET", "/v1/help")).body.messages).toHaveLength(0);
  });

  it("lets the team answer, which is new to whoever took part, until they look", async () => {
    const boss = await admin();
    const { owner, mate, office } = await officeWithTwo("Help Answered");
    await call(owner, "POST", "/v1/help", { office, body: "Can't hear anyone" });

    let list = (await call<Admin>(boss, "GET", "/v1/admin/help")).body;
    const thread = list.threads.find((one) => one.officeId === office)!;
    expect(thread).toMatchObject({ place: "Help Answered", waiting: true });
    expect((await call(owner, "GET", "/v1/admin/help")).status).toBe(404);

    expect((await call(boss, "POST", `/v1/admin/help/${thread.id}/messages`, { body: "Which browser?" })).status).toBe(200);
    const owners = (await call<Conversation>(owner, "GET", `/v1/help?office=${office}`)).body;
    expect(owners.unread).toBe(1);
    expect(owners.messages.at(-1)).toMatchObject({ team: true, name: "TinyFloor team", mine: false });
    expect((await call<Conversation>(mate, "GET", `/v1/help?office=${office}`)).body.unread).toBe(0);
    list = (await call<Admin>(boss, "GET", "/v1/admin/help")).body;
    expect(list.threads.some((one) => one.id === thread.id)).toBe(false);

    await call(owner, "POST", "/v1/help/read", { office });
    expect((await call<Conversation>(owner, "GET", `/v1/help?office=${office}`)).body.unread).toBe(0);

    // Done, until they say something more.
    await call(owner, "POST", "/v1/help", { office, body: "Thanks!" });
    expect((await call(boss, "PATCH", `/v1/admin/help/${thread.id}`, { status: "done" })).status).toBe(200);
    expect((await call<Admin>(boss, "GET", "/v1/admin/help")).body.threads.some((one) => one.id === thread.id)).toBe(false);
    expect((await call<Admin>(boss, "GET", "/v1/admin/help?show=all")).body.threads.some((one) => one.id === thread.id)).toBe(true);
    await call(mate, "POST", "/v1/help", { office, body: "One more thing" });
    expect((await call<Admin>(boss, "GET", "/v1/admin/help")).body.threads.find((one) => one.id === thread.id)?.waiting).toBe(true);
    await env.DB.prepare("DELETE FROM users WHERE email = 'boss@example.com'").run();
  });

  it("keeps a conversation when its office closes", async () => {
    const boss = await admin();
    const owner = await makeUser("Closing Owner");
    const office = (await call<{ office: { id: string } }>(owner, "POST", "/v1/offices", { name: "Help Closing" })).body.office.id;
    await call(owner, "POST", "/v1/help", { office, body: "Bye" });
    await call(owner, "DELETE", `/v1/offices/${office}`);
    const list = (await call<Admin>(boss, "GET", "/v1/admin/help?show=all")).body;
    expect(list.threads.find((one) => one.place === "Help Closing")).toMatchObject({ officeId: null });
    await env.DB.prepare("DELETE FROM users WHERE email = 'boss@example.com'").run();
  });
});
