import { describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import { workDomain } from "../src/domains";
import { call, makeUser, onFree, type TestUser } from "./helpers";

/** A company domain no other test uses, so each test sees only its own offices. */
const company = () => `co-${crypto.randomUUID().slice(0, 8)}.com`;

async function officeOf(owner: TestUser, name = "Studio") {
  const { body } = await call<{ office: { id: string } }>(owner, "POST", "/v1/offices", { name });
  return body.office.id;
}

interface Team {
  domain: string | null;
  offices: Array<{ id: string; name: string; members: number; owner: string; faces: string[]; access: string; asked: boolean; full: boolean }>;
}

type Requests = Array<{ id: string; displayName: string; email: string | null; askedAt: number }>;

const team = async (user: TestUser) => (await call<Team>(user, "GET", "/v1/me/team")).body;
const roleIn = async (user: TestUser, officeId: string) =>
  (await call<{ office?: { role: string } }>(user, "GET", `/v1/offices/${officeId}`)).body.office?.role ?? null;

describe("finding your team by your work email", () => {
  it("tells a work address from a personal one", () => {
    expect(workDomain("ana@Lapitopa.com")).toBe("lapitopa.com");
    expect(workDomain("ana@gmail.com")).toBeNull();
    expect(workDomain("ana@uol.com.br")).toBeNull();
    expect(workDomain(null)).toBeNull();
  });

  it("lets a colleague ask to join where an admin wants that, until they're let in", async () => {
    const domain = company();
    const arv = await makeUser("Arv", { email: `arv@${domain}` });
    const officeId = await officeOf(arv, "HRIS Team");
    await call(arv, "PATCH", `/v1/offices/${officeId}`, { domainJoin: "ask" });
    const bea = await makeUser("Bea", { email: `bea@${domain}` });

    expect(await team(bea)).toEqual({
      domain,
      offices: [{ id: officeId, name: "HRIS Team", members: 1, owner: "Arv", faces: [arv.id], access: "ask", asked: false, full: false }],
    });

    const asked = await call<{ joined: boolean }>(bea, "POST", `/v1/offices/${officeId}/join`);
    expect(asked.body.joined).toBe(false);
    expect(await roleIn(bea, officeId)).toBeNull();
    expect((await team(bea)).offices[0].asked).toBe(true);

    // The admin sees who's asking, with the overview; members don't.
    const overview = await call<{ requests: Requests }>(arv, "GET", `/v1/offices/${officeId}/overview`);
    expect(overview.body.requests.map((one) => [one.id, one.displayName])).toEqual([[bea.id, "Bea"]]);

    const let_in = await call<{ requests: Requests }>(arv, "POST", `/v1/offices/${officeId}/requests/${bea.id}`, { approve: true });
    expect(let_in.body.requests).toEqual([]);
    expect(await roleIn(bea, officeId)).toBe("member");
    expect((await team(bea)).offices).toEqual([]);
    const asMember = await call<{ requests: Requests }>(bea, "GET", `/v1/offices/${officeId}/overview`);
    expect(asMember.body.requests).toEqual([]);
  });

  it("lets an admin turn someone away, and the asker take it back", async () => {
    const domain = company();
    const arv = await makeUser("Arv", { email: `arv@${domain}` });
    const officeId = await officeOf(arv);
    await call(arv, "PATCH", `/v1/offices/${officeId}`, { domainJoin: "ask" });
    const cy = await makeUser("Cy", { email: `cy@${domain}` });
    const dee = await makeUser("Dee", { email: `dee@${domain}` });
    await call(cy, "POST", `/v1/offices/${officeId}/join`);
    await call(dee, "POST", `/v1/offices/${officeId}/join`);

    // Only an admin answers.
    expect((await call(cy, "POST", `/v1/offices/${officeId}/requests/${dee.id}`, { approve: true })).status).toBe(404);
    const declined = await call<{ requests: Requests }>(arv, "POST", `/v1/offices/${officeId}/requests/${cy.id}`, { approve: false });
    expect(declined.body.requests.map((one) => one.id)).toEqual([dee.id]);
    expect(await roleIn(cy, officeId)).toBeNull();
    expect((await team(cy)).offices[0].asked).toBe(false);

    await call(dee, "DELETE", `/v1/offices/${officeId}/join`);
    const none = await call<{ requests: Requests }>(arv, "GET", `/v1/offices/${officeId}/overview`);
    expect(none.body.requests).toEqual([]);
    expect((await call(arv, "POST", `/v1/offices/${officeId}/requests/${dee.id}`, { approve: true })).status).toBe(404);
  });

  it("lets colleagues walk straight in by default, and hides the office where an admin turned it off", async () => {
    const domain = company();
    const arv = await makeUser("Arv", { email: `arv@${domain}` });
    const officeId = await officeOf(arv);
    const own = await call<{ office: { joinDomain: string; domainJoin: string } }>(arv, "GET", `/v1/offices/${officeId}`);
    expect(own.body.office).toMatchObject({ joinDomain: domain, domainJoin: "open" });

    const bea = await makeUser("Bea", { email: `bea@${domain}` });
    expect((await team(bea)).offices[0].access).toBe("open");
    expect((await call<{ joined: boolean }>(bea, "POST", `/v1/offices/${officeId}/join`)).body.joined).toBe(true);
    expect(await roleIn(bea, officeId)).toBe("member");

    await call(arv, "PATCH", `/v1/offices/${officeId}`, { domainJoin: "off" });
    const cy = await makeUser("Cy", { email: `cy@${domain}` });
    expect((await team(cy)).offices).toEqual([]);
    expect((await call(cy, "POST", `/v1/offices/${officeId}/join`)).status).toBe(404);

    expect((await call(arv, "PATCH", `/v1/offices/${officeId}`, { domainJoin: "yes" })).status).toBe(400);
    expect((await call(bea, "PATCH", `/v1/offices/${officeId}`, { domainJoin: "open" })).status).toBe(403);
  });

  it("finds nothing for a personal address, an unverified one, or someone at another company", async () => {
    const domain = company();
    const arv = await makeUser("Arv", { email: `arv@${domain}` });
    const officeId = await officeOf(arv);

    const gil = await makeUser("Gil", { email: `gil-${crypto.randomUUID()}@gmail.com` });
    expect(await team(gil)).toEqual({ domain: null, offices: [] });
    expect((await call(gil, "POST", `/v1/offices/${officeId}/join`)).status).toBe(404);

    const una = await makeUser("Una", { email: `una@${domain}` });
    await env.DB.prepare("UPDATE users SET email_verified = 0 WHERE id = ?").bind(una.id).run();
    expect((await team(una)).offices).toEqual([]);
    expect((await call(una, "POST", `/v1/offices/${officeId}/join`)).status).toBe(404);

    const ola = await makeUser("Ola", { email: `ola@${company()}` });
    expect((await call(ola, "POST", `/v1/offices/${officeId}/join`)).status).toBe(404);

    const guest = await makeUser("Guest", { guest: true });
    expect((await call(guest, "GET", "/v1/me/team")).status).toBe(403);
  });

  it("goes only by the owner's address, never a member's, and keeps a university's out of sight", async () => {
    const domain = company();
    const pat = await makeUser("Pat", { email: `pat-${crypto.randomUUID()}@gmail.com` });
    const officeId = await officeOf(pat);
    const { body } = await call<{ code: string }>(pat, "GET", `/v1/offices/${officeId}/invite`);
    const kim = await makeUser("Kim", { email: `kim@${domain}` });
    await call(kim, "POST", `/v1/invites/${body.code}/accept`);
    const lee = await makeUser("Lee", { email: `lee@${domain}` });
    expect((await team(lee)).offices).toEqual([]);

    const school = `${crypto.randomUUID().slice(0, 8)}.edu`;
    const prof = await makeUser("Prof", { email: `prof@${school}` });
    const classId = await officeOf(prof);
    const stu = await makeUser("Stu", { email: `stu@${school}` });
    expect((await team(stu)).offices).toEqual([]);
    await call(prof, "PATCH", `/v1/offices/${classId}`, { domainJoin: "open" });
    expect((await team(stu)).offices.map((one) => one.id)).toEqual([classId]);
  });

  it("lets colleagues in past Free's 3 during the trial, and not once the office is over Free", async () => {
    const domain = company();
    const arv = await makeUser("Arv", { email: `arv@${domain}` });
    const officeId = await officeOf(arv);
    await call(arv, "PATCH", `/v1/offices/${officeId}`, { domainJoin: "ask" });
    for (const name of ["Bea", "Paul", "Jp"]) {
      const one = await makeUser(name, { email: `${name.toLowerCase()}@${domain}` });
      await call(one, "POST", `/v1/offices/${officeId}/join`);
      expect((await call(arv, "POST", `/v1/offices/${officeId}/requests/${one.id}`, { approve: true })).status).toBe(200);
    }
    const office = await call<{ office: { plan: string; members: number } }>(arv, "GET", `/v1/offices/${officeId}`);
    expect(office.body.office).toMatchObject({ plan: "pro", members: 4 });

    // On Free, past its trial, the office is full for the next one, and says so before they ask.
    await onFree(officeId);
    const jez = await makeUser("Jez", { email: `jez@${domain}` });
    expect((await team(jez)).offices[0]).toMatchObject({ id: officeId, full: true });
    await call(jez, "POST", `/v1/offices/${officeId}/join`);
    expect((await call(arv, "POST", `/v1/offices/${officeId}/requests/${jez.id}`, { approve: true })).status).toBe(409);
  });
});
