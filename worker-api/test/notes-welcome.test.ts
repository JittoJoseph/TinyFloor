import { describe, expect, it } from "vitest";
import { verifyTicket } from "../../shared-protocol/src";
import { env } from "cloudflare:workers";
import { call, makeUser, type TestUser } from "./helpers";

async function officeOf(admin: TestUser, name = "Studio") {
  const { body } = await call<{ office: { id: string } }>(admin, "POST", "/v1/offices", { name });
  return body.office.id;
}

async function joinOffice(admin: TestUser, member: TestUser, officeId: string) {
  const { body } = await call<{ code: string }>(admin, "GET", `/v1/offices/${officeId}/invite`);
  await call(member, "POST", `/v1/invites/${body.code}/accept`);
}

describe("status notes", () => {
  it("keeps a note with the account, cleaned, and clears it", async () => {
    const ana = await makeUser("Ana");
    const set = await call<{ status: unknown }>(ana, "PUT", "/v1/me/status", {
      status: { emoji: "🍜", text: "  Lunch,\n back   at 2 ", until: null },
    });
    expect(set.status).toBe(200);
    expect(set.body.status).toEqual({ emoji: "🍜", text: "Lunch, back at 2", until: null });

    const session = await call<{ user: { status: unknown } }>(ana, "GET", "/v1/session");
    expect(session.body.user.status).toEqual({ emoji: "🍜", text: "Lunch, back at 2", until: null });

    await call(ana, "PUT", "/v1/me/status", { status: null });
    const after = await call<{ user: { status: unknown } }>(ana, "GET", "/v1/session");
    expect(after.body.user.status).toBeNull();
  });

  it("drops what isn't an emoji, and a note that has already ended", async () => {
    const bo = await makeUser("Bo");
    const odd = await call<{ status: unknown }>(bo, "PUT", "/v1/me/status", { status: { emoji: "abc", text: "Focusing", until: null } });
    expect(odd.body.status).toEqual({ emoji: null, text: "Focusing", until: null });

    // A note that ends in the past is no note.
    const ended = await call<{ status: unknown }>(bo, "PUT", "/v1/me/status", { status: { emoji: "🎧", text: "", until: Date.now() - 1000 } });
    expect(ended.body.status).toEqual({ emoji: "🎧", text: "", until: null });
  });

  it("stops showing a note once its time is up", async () => {
    const cy = await makeUser("Cy");
    await call(cy, "PUT", "/v1/me/status", { status: { emoji: "🚶", text: "Back soon", until: Date.now() + 60_000 } });
    // Its time passes.
    await env.DB.prepare("UPDATE users SET status_until = ? WHERE id = ?").bind(Date.now() - 1, cy.id).run();
    const session = await call<{ user: { status: unknown } }>(cy, "GET", "/v1/session");
    expect(session.body.user.status).toBeNull();
  });

  it("walks onto the floor with the note, and People shows it", async () => {
    const dee = await makeUser("Dee");
    const eli = await makeUser("Eli");
    const officeId = await officeOf(dee);
    await joinOffice(dee, eli, officeId);
    await call(eli, "PUT", "/v1/me/status", { status: { emoji: "🌴", text: "On holiday", until: null } });

    const ticket = await call<{ ticket: string }>(eli, "POST", `/v1/offices/${officeId}/ticket`);
    const claims = await verifyTicket(ticket.body.ticket, env.TICKET_SECRET);
    expect(claims?.note).toEqual({ emoji: "🌴", text: "On holiday", until: null });

    const overview = await call<{ members: Array<{ id: string; status: unknown }> }>(dee, "GET", `/v1/offices/${officeId}/overview`);
    expect(overview.body.members.find((member) => member.id === eli.id)?.status).toEqual({ emoji: "🌴", text: "On holiday", until: null });
    expect(overview.body.members.find((member) => member.id === dee.id)?.status).toBeNull();
  });
});

describe("office settings", () => {
  it("lets an admin write a welcome note, signed with their name, and clear it", async () => {
    const fay = await makeUser("Fay");
    const officeId = await officeOf(fay);
    const set = await call<{ office: { welcome: unknown } }>(fay, "PATCH", `/v1/offices/${officeId}`, {
      welcome: "  Hi all!\n\n\n\nStandup at 10 in the meeting room.  ",
    });
    expect(set.status).toBe(200);
    expect(set.body.office.welcome).toEqual({ text: "Hi all!\n\nStandup at 10 in the meeting room.", by: fay.id, byName: "Fay" });

    const cleared = await call<{ office: { welcome: unknown } }>(fay, "PATCH", `/v1/offices/${officeId}`, { welcome: "   " });
    expect(cleared.body.office.welcome).toBeNull();
  });

  it("keeps the welcome note and invite rule to admins", async () => {
    const gus = await makeUser("Gus");
    const hal = await makeUser("Hal");
    const officeId = await officeOf(gus);
    await joinOffice(gus, hal, officeId);
    expect((await call(hal, "PATCH", `/v1/offices/${officeId}`, { welcome: "Hello" })).status).toBe(403);
    expect((await call(hal, "PATCH", `/v1/offices/${officeId}`, { invitePolicy: "admins" })).status).toBe(403);
  });

  it("lets only admins share the invite link when the office says so", async () => {
    const ivy = await makeUser("Ivy");
    const jon = await makeUser("Jon");
    const officeId = await officeOf(ivy);
    await joinOffice(ivy, jon, officeId);

    expect((await call(jon, "GET", `/v1/offices/${officeId}/invite`)).status).toBe(200);
    const set = await call<{ office: { invitePolicy: string } }>(ivy, "PATCH", `/v1/offices/${officeId}`, { invitePolicy: "admins" });
    expect(set.body.office.invitePolicy).toBe("admins");

    const denied = await call<{ error: { code: string } }>(jon, "GET", `/v1/offices/${officeId}/invite`);
    expect(denied.status).toBe(403);
    expect((await call(ivy, "GET", `/v1/offices/${officeId}/invite`)).status).toBe(200);

    expect((await call(ivy, "PATCH", `/v1/offices/${officeId}`, { invitePolicy: "nobody" })).status).toBe(400);
  });

  it("still renames, and says when there's nothing to change", async () => {
    const kim = await makeUser("Kim");
    const officeId = await officeOf(kim);
    const renamed = await call<{ office: { name: string; invitePolicy: string; welcome: unknown } }>(kim, "PATCH", `/v1/offices/${officeId}`, {
      name: "Harbour",
    });
    expect(renamed.body.office).toMatchObject({ name: "Harbour", invitePolicy: "everyone", welcome: null });
    expect((await call(kim, "PATCH", `/v1/offices/${officeId}`, {})).status).toBe(400);
  });
});
