import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { verifyTicket } from "../../shared-protocol/src";
import { call, fakeRealtime, makeUser, type TestUser } from "./helpers";

async function officeOf(admin: TestUser, name = "Studio") {
  const { status, body } = await call<{ office: { id: string } }>(admin, "POST", "/v1/offices", { name });
  expect(status).toBe(201);
  return body.office.id;
}

async function invite(by: TestUser, officeId: string, extra: Record<string, unknown> = {}) {
  const { status, body } = await call<{ invite: { id: string; token: string } }>(
    by,
    "POST",
    `/v1/offices/${officeId}/invites`,
    extra,
  );
  return { status, ...body.invite };
}

async function join(user: TestUser, token: string) {
  return call(user, "POST", `/v1/invites/${token}/accept`);
}

describe("offices", () => {
  it("makes a free office with the creator as its admin and owner", async () => {
    const olive = await makeUser("Olive");
    const { status, body } = await call<{ office: Record<string, unknown> }>(olive, "POST", "/v1/offices", {
      name: "  Design   Team ",
    });
    expect(status).toBe(201);
    expect(body.office).toMatchObject({
      name: "Design Team",
      plan: "free",
      seats: 3,
      members: 1,
      role: "admin",
      owner: olive.id,
    });

    const me = await call<{ offices: unknown[] }>(olive, "GET", "/v1/me");
    expect(me.body.offices).toEqual([expect.objectContaining({ name: "Design Team", role: "admin", seats: 3 })]);
  });

  it("tells the team's Discord about a new office", async () => {
    const ines = await makeUser("Ines");
    await officeOf(ines, "Harbour");
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(await fakeRealtime().calls()).toContainEqual(["officeCreated", "Harbour", "Ines"]);
  });

  it("gives the dashboard a few faces per office, and who is on each floor as they look", async () => {
    const olive = await makeUser("Olive");
    const officeId = await officeOf(olive, "Faces");
    await fakeRealtime().setPeople(officeId, 1);

    const me = await call<{ offices: Array<{ id: string; faces: { id: string; name: string }[]; here: number }> }>(
      olive,
      "GET",
      "/v1/me",
    );
    expect(me.body.offices.find((office) => office.id === officeId)).toMatchObject({
      faces: [{ id: olive.id, name: "Olive", character: "Adam" }],
      here: 1,
      inNow: [{ id: "here-0", name: "Here 0", character: "Bob", status: "available" }],
    });
  });

  it("hands the People view the office, its members and its invitations at once", async () => {
    const olive = await makeUser("Olive");
    const officeId = await officeOf(olive, "Overview");
    await fakeRealtime().setPeople(officeId, 2);
    const stranger = await makeUser("Sam");

    const { status, body } = await call<{
      office: { name: string; members: number; role: string; seats: number };
      members: { displayName: string }[];
      invites: unknown[];
      people: number;
    }>(olive, "GET", `/v1/offices/${officeId}/overview`);

    expect(status).toBe(200);
    expect(body.office).toMatchObject({ name: "Overview", members: 1, role: "admin", seats: 3 });
    expect(body.members.map((member) => member.displayName)).toEqual(["Olive"]);
    expect(body.people).toBe(2);

    expect((await call(stranger, "GET", `/v1/offices/${officeId}/overview`)).status).toBe(404);
  });

  it("is for accounts, not guests", async () => {
    const guest = await makeUser("Gus", { guest: true });
    expect((await call(guest, "POST", "/v1/offices", { name: "Nope" })).status).toBe(403);
  });

  it("hides offices from outsiders", async () => {
    const olive = await makeUser("Olive");
    const outsider = await makeUser("Otto");
    const id = await officeOf(olive);
    expect((await call(outsider, "GET", `/v1/offices/${id}`)).status).toBe(404);
    expect((await call(outsider, "GET", `/v1/offices/${id}/overview`)).status).toBe(404);
  });

  it("renames, and closes the floor when the owner closes the office", async () => {
    const olive = await makeUser("Olive");
    const id = await officeOf(olive);
    const renamed = await call<{ office: { name: string } }>(olive, "PATCH", `/v1/offices/${id}`, { name: "Second" });
    expect(renamed.body.office.name).toBe("Second");

    expect((await call(olive, "DELETE", `/v1/offices/${id}`)).status).toBe(200);
    expect(await fakeRealtime().calls()).toContainEqual(["forgetOffice", id]);
    expect((await call(olive, "GET", `/v1/offices/${id}`)).status).toBe(404);
  });
});

describe("seats", () => {
  it("counts members, not invitations, and refuses the one that would overfill it", async () => {
    const olive = await makeUser("Olive");
    const id = await officeOf(olive);

    // Three invitations against three seats is fine: an invitation holds nothing.
    const first = await invite(olive, id);
    const second = await invite(olive, id);
    const third = await invite(olive, id);
    expect([first.status, second.status, third.status]).toEqual([201, 201, 201]);

    expect((await join(await makeUser("A"), first.token)).status).toBe(200);
    expect((await join(await makeUser("B"), second.token)).status).toBe(200);
    const refused = await join(await makeUser("C"), third.token);
    expect(refused.status).toBe(409);
    expect(refused.body).toMatchObject({ error: { code: "office_full" } });
  });

  it("frees the seat when someone leaves, and not when they merely go offline", async () => {
    const olive = await makeUser("Olive");
    const ada = await makeUser("Ada");
    const bo = await makeUser("Bo");
    const cy = await makeUser("Cy");
    const id = await officeOf(olive);
    await join(ada, (await invite(olive, id)).token);
    await join(bo, (await invite(olive, id)).token);

    // Full at 3/3.
    expect((await join(cy, (await invite(olive, id)).token)).status).toBe(409);

    expect((await call(bo, "DELETE", `/v1/offices/${id}/members/${bo.id}`)).status).toBe(200);
    expect(await fakeRealtime().calls()).toContainEqual(["removeMember", id, bo.id]);

    expect((await join(cy, (await invite(olive, id)).token)).status).toBe(200);
  });

  it("tells an invitation preview when the office is full", async () => {
    const olive = await makeUser("Olive");
    const id = await officeOf(olive, "Snug");
    const token = (await invite(olive, id)).token;
    expect(
      (await call<{ invite: { full: boolean; officeName: string } }>(null, "GET", `/v1/invites/${token}`)).body.invite,
    ).toMatchObject({ officeId: id, officeName: "Snug", members: 1, full: false });

    await join(await makeUser("A"), (await invite(olive, id)).token);
    await join(await makeUser("B"), (await invite(olive, id)).token);
    expect((await call<{ invite: { full: boolean } }>(null, "GET", `/v1/invites/${token}`)).body.invite.full).toBe(true);
  });
});

describe("invitations and members", () => {
  it("lets someone join through an invitation, once", async () => {
    const olive = await makeUser("Olive");
    const mia = await makeUser("Mia");
    const max = await makeUser("Max");
    const id = await officeOf(olive);
    const { token } = await invite(olive, id);

    const preview = await call(null, "GET", `/v1/invites/${token}`);
    expect(preview.body.invite).toMatchObject({ officeName: "Studio", invitedBy: "Olive", role: "member" });

    expect((await join(mia, token)).status).toBe(200);
    expect((await join(max, token)).status).toBe(404);

    const overview = await call<{ members: { displayName: string; role: string }[] }>(
      mia,
      "GET",
      `/v1/offices/${id}/overview`,
    );
    expect(overview.body.members.map((m) => [m.displayName, m.role])).toEqual([
      ["Olive", "admin"],
      ["Mia", "member"],
    ]);
  });

  it("only lets the named email accept an email invitation", async () => {
    const olive = await makeUser("Olive");
    const right = await makeUser("Rita", { email: "rita@example.com" });
    const wrong = await makeUser("Wes");
    const id = await officeOf(olive);
    const { token } = await invite(olive, id, { email: "Rita@Example.com" });

    expect((await join(wrong, token)).status).toBe(403);
    expect((await join(right, token)).status).toBe(200);
  });

  it("keeps invitations and role changes to admins", async () => {
    const olive = await makeUser("Olive");
    const mia = await makeUser("Mia");
    const id = await officeOf(olive);
    await join(mia, (await invite(olive, id)).token);

    expect((await invite(mia, id)).status).toBe(403);
    expect((await call(mia, "PATCH", `/v1/offices/${id}/members/${mia.id}`, { role: "admin" })).status).toBe(403);
    expect((await call(olive, "PATCH", `/v1/offices/${id}/members/${mia.id}`, { role: "admin" })).status).toBe(200);
    // Now an admin, Mia can invite.
    expect((await invite(mia, id)).status).toBe(201);
  });

  it("lets members leave, admins remove members, and keeps the owner in place", async () => {
    const olive = await makeUser("Olive");
    const ada = await makeUser("Ada");
    const mo = await makeUser("Mo");
    const id = await officeOf(olive);
    await join(ada, (await invite(olive, id, { role: "admin" })).token);
    await join(mo, (await invite(olive, id)).token);

    expect((await call(mo, "DELETE", `/v1/offices/${id}/members/${ada.id}`)).status).toBe(403);
    expect((await call(ada, "DELETE", `/v1/offices/${id}/members/${olive.id}`)).status).toBe(400);
    expect((await call(ada, "DELETE", `/v1/offices/${id}/members/${mo.id}`)).status).toBe(200);
    expect((await call(ada, "DELETE", `/v1/offices/${id}/members/${ada.id}`)).status).toBe(200);
    expect((await call(ada, "GET", `/v1/offices/${id}`)).status).toBe(404);
  });

  it("hands the office over", async () => {
    const olive = await makeUser("Olive");
    const mia = await makeUser("Mia");
    const id = await officeOf(olive);
    await join(mia, (await invite(olive, id)).token);

    expect((await call(mia, "POST", `/v1/offices/${id}/transfer`, { userId: olive.id })).status).toBe(403);
    expect((await call(olive, "POST", `/v1/offices/${id}/transfer`, { userId: mia.id })).status).toBe(200);

    const after = await call<{ office: { owner: string; role: string } }>(mia, "GET", `/v1/offices/${id}`);
    expect(after.body.office).toMatchObject({ owner: mia.id, role: "admin" });
    // The old owner stays an admin, and can no longer close the office.
    expect((await call(olive, "DELETE", `/v1/offices/${id}`)).status).toBe(403);
  });
});

describe("walking in", () => {
  it("gives a member a ticket for the floor, which is the office", async () => {
    const olive = await makeUser("Olive");
    const id = await officeOf(olive);

    const { body } = await call<{ ticket: string; url: string }>(olive, "POST", `/v1/offices/${id}/ticket`);
    expect(body.url).toBe(`ws://localhost:8788/rooms/${id}`);
    expect(await verifyTicket(body.ticket, env.TICKET_SECRET)).toMatchObject({
      room: id,
      sub: olive.id,
      role: "admin",
      cap: 3,
    });
    expect((await call(await makeUser("Otto"), "POST", `/v1/offices/${id}/ticket`)).status).toBe(404);
  });

  it("gives a member a separate ticket for the office's chat", async () => {
    const olive = await makeUser("Olive");
    const id = await officeOf(olive);

    const { body } = await call<{ ticket: string; url: string }>(olive, "POST", `/v1/offices/${id}/chat-ticket`);
    expect(body.url).toBe(`ws://localhost:8788/offices/${id}/chat`);
    expect(await verifyTicket(body.ticket, env.TICKET_SECRET)).toMatchObject({ room: `chat:${id}`, sub: olive.id });
    expect((await call(await makeUser("Otto"), "POST", `/v1/offices/${id}/chat-ticket`)).status).toBe(404);
  });
});

describe("office floors", () => {
  it("let in members only: a guest, or anyone else, is turned away", async () => {
    const olive = await makeUser("Olive");
    const id = await officeOf(olive, "Agency");
    expect((await call(await makeUser("Gus", { guest: true }), "POST", `/v1/offices/${id}/ticket`)).status).toBe(404);
    expect((await call(await makeUser("Otto"), "POST", `/v1/offices/${id}/ticket`)).status).toBe(404);
    const { body } = await call<{ ticket: string }>(olive, "POST", `/v1/offices/${id}/ticket`);
    expect(await verifyTicket(body.ticket, env.TICKET_SECRET)).toMatchObject({ room: id, role: "admin", cap: 3 });
  });
});
