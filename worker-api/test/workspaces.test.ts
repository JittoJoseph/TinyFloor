import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { verifyTicket } from "../../shared-protocol/src";
import { call, fakeRealtime, makeUser, type TestUser } from "./helpers";

async function workspaceOf(owner: TestUser, name = "Studio") {
  const { status, body } = await call<{ workspace: { id: string } }>(owner, "POST", "/v1/workspaces", { name });
  expect(status).toBe(201);
  return body.workspace.id;
}

async function invite(by: TestUser, workspaceId: string, extra: Record<string, unknown> = {}) {
  const { status, body } = await call<{ invite: { id: string; token: string } }>(
    by,
    "POST",
    `/v1/workspaces/${workspaceId}/invites`,
    extra,
  );
  return { status, ...body.invite };
}

async function join(user: TestUser, token: string) {
  return call(user, "POST", `/v1/invites/${token}/accept`);
}

describe("workspaces", () => {
  it("creates a free workspace with the creator as owner", async () => {
    const owner = await makeUser("Olive");
    const { status, body } = await call(owner, "POST", "/v1/workspaces", { name: "  Design   Team " });
    expect(status).toBe(201);
    expect(body.workspace).toMatchObject({ name: "Design Team", plan: "free", memberLimit: 3, members: 1, role: "owner" });

    const me = await call<{ workspaces: unknown[] }>(owner, "GET", "/v1/me");
    expect(me.body.workspaces).toEqual([expect.objectContaining({ name: "Design Team", role: "owner" })]);
  });

  it("is for accounts, not guests", async () => {
    const guest = await makeUser("Gus", { guest: true });
    expect((await call(guest, "POST", "/v1/workspaces", { name: "Nope" })).status).toBe(403);
  });

  it("hides workspaces from outsiders", async () => {
    const owner = await makeUser("Olive");
    const outsider = await makeUser("Otto");
    const id = await workspaceOf(owner);
    expect((await call(outsider, "GET", `/v1/workspaces/${id}`)).status).toBe(404);
    expect((await call(outsider, "GET", `/v1/workspaces/${id}/rooms`)).status).toBe(404);
  });
});

describe("invites and members", () => {
  it("lets someone join through an invite, once", async () => {
    const owner = await makeUser("Olive");
    const mia = await makeUser("Mia");
    const max = await makeUser("Max");
    const id = await workspaceOf(owner);
    const { token } = await invite(owner, id);

    const preview = await call(null, "GET", `/v1/invites/${token}`);
    expect(preview.body.invite).toMatchObject({ workspaceName: "Studio", invitedBy: "Olive", role: "member" });

    expect((await join(mia, token)).status).toBe(200);
    expect((await join(max, token)).status).toBe(404);

    const members = await call<{ members: { displayName: string; role: string }[] }>(mia, "GET", `/v1/workspaces/${id}/members`);
    expect(members.body.members.map((m) => [m.displayName, m.role])).toEqual([
      ["Olive", "owner"],
      ["Mia", "member"],
    ]);
  });

  it("only lets the named email accept an email invite", async () => {
    const owner = await makeUser("Olive");
    const right = await makeUser("Rita", { email: "rita@example.com" });
    const wrong = await makeUser("Wes");
    const id = await workspaceOf(owner);
    const { token } = await invite(owner, id, { email: "Rita@Example.com" });

    expect((await join(wrong, token)).status).toBe(403);
    expect((await join(right, token)).status).toBe(200);
  });

  it("stops at the plan's member limit", async () => {
    const owner = await makeUser("Olive");
    const id = await workspaceOf(owner);
    for (const name of ["A", "B"]) {
      const { token } = await invite(owner, id);
      expect((await join(await makeUser(name), token)).status).toBe(200);
    }
    expect((await invite(owner, id)).status).toBe(409);
  });

  it("refuses an invite once the workspace filled up after it was made", async () => {
    const owner = await makeUser("Olive");
    const id = await workspaceOf(owner);
    const first = await invite(owner, id);
    const second = await invite(owner, id);
    const third = await invite(owner, id);
    await join(await makeUser("A"), first.token);
    await join(await makeUser("B"), second.token);
    expect((await join(await makeUser("C"), third.token)).status).toBe(409);
  });

  it("keeps role changes with the owner and lets admins invite members only", async () => {
    const owner = await makeUser("Olive");
    const ada = await makeUser("Ada");
    const id = await workspaceOf(owner);
    await join(ada, (await invite(owner, id, { role: "admin" })).token);

    expect((await invite(ada, id, { role: "admin" })).status).toBe(403);
    expect((await invite(ada, id, { role: "member" })).status).toBe(201);
    expect((await call(ada, "PATCH", `/v1/workspaces/${id}/members/${owner.id}`, { role: "member" })).status).toBe(403);
    expect((await call(owner, "PATCH", `/v1/workspaces/${id}/members/${ada.id}`, { role: "member" })).status).toBe(200);
  });

  it("lets members leave, admins remove members, and never removes the owner", async () => {
    const owner = await makeUser("Olive");
    const ada = await makeUser("Ada");
    const mo = await makeUser("Mo");
    const id = await workspaceOf(owner);
    await join(ada, (await invite(owner, id, { role: "admin" })).token);
    await join(mo, (await invite(owner, id)).token);

    expect((await call(mo, "DELETE", `/v1/workspaces/${id}/members/${ada.id}`)).status).toBe(403);
    expect((await call(ada, "DELETE", `/v1/workspaces/${id}/members/${owner.id}`)).status).toBe(400);
    expect((await call(owner, "DELETE", `/v1/workspaces/${id}/members/${owner.id}`)).status).toBe(400);
    expect((await call(ada, "DELETE", `/v1/workspaces/${id}/members/${mo.id}`)).status).toBe(200);
    expect((await call(ada, "DELETE", `/v1/workspaces/${id}/members/${ada.id}`)).status).toBe(200);
    expect((await call(ada, "GET", `/v1/workspaces/${id}`)).status).toBe(404);
  });

  it("transfers ownership", async () => {
    const owner = await makeUser("Olive");
    const mia = await makeUser("Mia");
    const id = await workspaceOf(owner);
    await join(mia, (await invite(owner, id)).token);

    expect((await call(owner, "POST", `/v1/workspaces/${id}/transfer`, { userId: mia.id })).status).toBe(200);
    expect((await call<{ workspace: { role: string } }>(mia, "GET", `/v1/workspaces/${id}`)).body.workspace.role).toBe("owner");
    expect((await call<{ workspace: { role: string } }>(owner, "GET", `/v1/workspaces/${id}`)).body.workspace.role).toBe("admin");
  });
});

describe("rooms", () => {
  it("creates rooms and lists them with how many people are in each", async () => {
    const owner = await makeUser("Olive");
    const id = await workspaceOf(owner);
    const created = await call<{ room: { id: string } }>(owner, "POST", `/v1/workspaces/${id}/rooms`, {
      name: "Standup",
      capacity: 8,
    });
    expect(created.status).toBe(201);
    await fakeRealtime().setPeople(created.body.room.id, 3);

    const list = await call(owner, "GET", `/v1/workspaces/${id}/rooms`);
    expect(list.body.rooms).toEqual([{ id: created.body.room.id, name: "Standup", capacity: 8, people: 3 }]);

    expect((await call(owner, "POST", `/v1/workspaces/${id}/rooms`, { name: "Huge", capacity: 21 })).status).toBe(400);
  });

  it("lets only owners and admins manage rooms", async () => {
    const owner = await makeUser("Olive");
    const mia = await makeUser("Mia");
    const id = await workspaceOf(owner);
    await join(mia, (await invite(owner, id)).token);
    expect((await call(mia, "POST", `/v1/workspaces/${id}/rooms`, { name: "Mine" })).status).toBe(403);
  });

  it("gives members a ticket for the room", async () => {
    const owner = await makeUser("Olive");
    const id = await workspaceOf(owner);
    const room = (await call<{ room: { id: string } }>(owner, "POST", `/v1/workspaces/${id}/rooms`, { name: "Desk", capacity: 5 }))
      .body.room;

    const { body } = await call<{ ticket: string; url: string }>(owner, "POST", `/v1/rooms/${room.id}/ticket`);
    expect(body.url).toBe(`ws://localhost:8788/rooms/${room.id}`);
    expect(await verifyTicket(body.ticket, env.TICKET_SECRET)).toMatchObject({
      room: room.id,
      sub: owner.id,
      role: "owner",
      cap: 5,
    });
    expect((await call(await makeUser("Otto"), "POST", `/v1/rooms/${room.id}/ticket`)).status).toBe(404);
  });

  it("archives a room, closing it for the people inside", async () => {
    const owner = await makeUser("Olive");
    const id = await workspaceOf(owner);
    const room = (await call<{ room: { id: string } }>(owner, "POST", `/v1/workspaces/${id}/rooms`, { name: "Old" })).body.room;

    expect((await call(owner, "DELETE", `/v1/rooms/${room.id}`)).status).toBe(200);
    expect(await fakeRealtime().calls()).toContainEqual(["closeRoom", room.id]);
    expect((await call(owner, "POST", `/v1/rooms/${room.id}/ticket`)).status).toBe(404);
  });

  it("deletes a workspace with its rooms", async () => {
    const owner = await makeUser("Olive");
    const id = await workspaceOf(owner);
    const room = (await call<{ room: { id: string } }>(owner, "POST", `/v1/workspaces/${id}/rooms`, { name: "Gone" })).body.room;

    expect((await call(owner, "DELETE", `/v1/workspaces/${id}`)).status).toBe(200);
    expect(await fakeRealtime().calls()).toContainEqual(["closeRoom", room.id]);
    const left = await env.DB.prepare("SELECT COUNT(*) AS n FROM rooms WHERE id = ?").bind(room.id).first<{ n: number }>();
    expect(left?.n).toBe(0);
  });
});

describe("guest links", () => {
  async function roomWithLink() {
    const owner = await makeUser("Olive");
    const id = await workspaceOf(owner, "Agency");
    const room = (await call<{ room: { id: string } }>(owner, "POST", `/v1/workspaces/${id}/rooms`, { name: "Client call" }))
      .body.room;
    const link = (
      await call<{ guestLink: { id: string; token: string } }>(owner, "POST", `/v1/rooms/${room.id}/guest-links`, {
        expiresIn: "1d",
      })
    ).body.guestLink;
    return { owner, room, link };
  }

  it("previews the room and lets a guest in, tied to the link", async () => {
    const { room, link } = await roomWithLink();
    const preview = await call(null, "GET", `/v1/guest-links/${link.token}`);
    expect(preview.body.guestLink).toEqual({ roomName: "Client call", workspaceName: "Agency" });

    const guest = await makeUser("Gus", { guest: true });
    const { body } = await call<{ ticket: string }>(guest, "POST", `/v1/guest-links/${link.token}/ticket`);
    expect(await verifyTicket(body.ticket, env.TICKET_SECRET)).toMatchObject({
      room: room.id,
      role: "guest",
      link: link.id,
    });
  });

  it("lets a member through a guest link keep their own role", async () => {
    const { owner, link } = await roomWithLink();
    const { body } = await call<{ ticket: string }>(owner, "POST", `/v1/guest-links/${link.token}/ticket`);
    const claims = await verifyTicket(body.ticket, env.TICKET_SECRET);
    expect(claims?.role).toBe("owner");
    expect(claims?.link).toBeUndefined();
  });

  it("revoking a link stops new tickets and removes its guests", async () => {
    const { owner, room, link } = await roomWithLink();
    expect((await call(owner, "DELETE", `/v1/rooms/${room.id}/guest-links/${link.id}`)).status).toBe(200);
    expect(await fakeRealtime().calls()).toContainEqual(["revokeGuestLink", room.id, link.id]);

    const guest = await makeUser("Gus", { guest: true });
    expect((await call(guest, "POST", `/v1/guest-links/${link.token}/ticket`)).status).toBe(404);
    expect((await call(owner, "GET", `/v1/rooms/${room.id}/guest-links`)).body.guestLinks).toEqual([]);
  });
});
