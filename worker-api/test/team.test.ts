import { describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import { workDomain } from "../src/domains";
import { call, makeUser, type TestUser } from "./helpers";

/** A company domain no other test uses, so each test sees only its own offices. */
const company = () => `co-${crypto.randomUUID().slice(0, 8)}.com`;

async function officeOf(owner: TestUser, name = "Studio") {
  const { body } = await call<{ office: { id: string } }>(owner, "POST", "/v1/offices", { name });
  return body.office.id;
}

interface Team {
  domain: string | null;
  offices: Array<{ id: string; name: string; members: number; owner: string; faces: string[]; full: boolean }>;
}

describe("finding your team by your work email", () => {
  it("tells a work address from a personal one", () => {
    expect(workDomain("ana@Lapitopa.com")).toBe("lapitopa.com");
    expect(workDomain("ana@gmail.com")).toBeNull();
    expect(workDomain("ana@uol.com.br")).toBeNull();
    expect(workDomain(null)).toBeNull();
  });

  it("shows a colleague the office at their domain, and lets them walk in", async () => {
    const domain = company();
    const arv = await makeUser("Arv", { email: `arv@${domain}` });
    const officeId = await officeOf(arv, "HRIS Team");
    const bea = await makeUser("Bea", { email: `bea@${domain}` });

    const team = await call<Team>(bea, "GET", "/v1/me/team");
    expect(team.body.domain).toBe(domain);
    expect(team.body.offices).toEqual([{ id: officeId, name: "HRIS Team", members: 1, owner: "Arv", faces: [arv.id], full: false }]);

    const joined = await call<{ officeId: string }>(bea, "POST", `/v1/offices/${officeId}/join`);
    expect(joined.body.officeId).toBe(officeId);
    const office = await call<{ office: { role: string; members: number } }>(bea, "GET", `/v1/offices/${officeId}`);
    expect(office.body.office).toMatchObject({ role: "member", members: 2 });
    // In it now: it's no longer something to find, and joining again is fine.
    expect((await call<Team>(bea, "GET", "/v1/me/team")).body.offices).toEqual([]);
    expect((await call(bea, "POST", `/v1/offices/${officeId}/join`)).status).toBe(200);
  });

  it("finds nothing for a personal address, an unverified one, or someone at another company", async () => {
    const domain = company();
    const arv = await makeUser("Arv", { email: `arv@${domain}` });
    const officeId = await officeOf(arv);

    const gil = await makeUser("Gil", { email: `gil-${crypto.randomUUID()}@gmail.com` });
    expect((await call<Team>(gil, "GET", "/v1/me/team")).body).toEqual({ domain: null, offices: [] });
    expect((await call(gil, "POST", `/v1/offices/${officeId}/join`)).status).toBe(404);

    const una = await makeUser("Una", { email: `una@${domain}` });
    await env.DB.prepare("UPDATE users SET email_verified = 0 WHERE id = ?").bind(una.id).run();
    expect((await call<Team>(una, "GET", "/v1/me/team")).body.offices).toEqual([]);
    expect((await call(una, "POST", `/v1/offices/${officeId}/join`)).status).toBe(404);

    const ola = await makeUser("Ola", { email: `ola@${company()}` });
    expect((await call(ola, "POST", `/v1/offices/${officeId}/join`)).status).toBe(404);

    const guest = await makeUser("Guest", { guest: true });
    expect((await call(guest, "GET", "/v1/me/team")).status).toBe(403);
  });

  it("goes only by the owner's address, never a member's", async () => {
    const domain = company();
    const pat = await makeUser("Pat", { email: `pat-${crypto.randomUUID()}@gmail.com` });
    const officeId = await officeOf(pat);
    const { body } = await call<{ code: string }>(pat, "GET", `/v1/offices/${officeId}/invite`);
    const kim = await makeUser("Kim", { email: `kim@${domain}` });
    await call(kim, "POST", `/v1/invites/${body.code}/accept`);

    const lee = await makeUser("Lee", { email: `lee@${domain}` });
    expect((await call<Team>(lee, "GET", "/v1/me/team")).body.offices).toEqual([]);
  });

  it("lets an admin close it to the domain, and a university's stays closed until opened", async () => {
    const domain = company();
    const arv = await makeUser("Arv", { email: `arv@${domain}` });
    const officeId = await officeOf(arv);
    const own = await call<{ office: { joinDomain: string; domainJoin: boolean } }>(arv, "GET", `/v1/offices/${officeId}`);
    expect(own.body.office).toMatchObject({ joinDomain: domain, domainJoin: true });

    const off = await call<{ office: { domainJoin: boolean } }>(arv, "PATCH", `/v1/offices/${officeId}`, { domainJoin: false });
    expect(off.body.office.domainJoin).toBe(false);
    const bea = await makeUser("Bea", { email: `bea@${domain}` });
    expect((await call<Team>(bea, "GET", "/v1/me/team")).body.offices).toEqual([]);
    expect((await call(bea, "POST", `/v1/offices/${officeId}/join`)).status).toBe(404);
    expect((await call(arv, "PATCH", `/v1/offices/${officeId}`, { domainJoin: "yes" })).status).toBe(400);

    const school = `${crypto.randomUUID().slice(0, 8)}.edu`;
    const pro = await makeUser("Prof", { email: `prof@${school}` });
    const classId = await officeOf(pro);
    const student = await makeUser("Stu", { email: `stu@${school}` });
    expect((await call<Team>(student, "GET", "/v1/me/team")).body.offices).toEqual([]);
    await call(pro, "PATCH", `/v1/offices/${classId}`, { domainJoin: true });
    expect((await call<Team>(student, "GET", "/v1/me/team")).body.offices.map((one) => one.id)).toEqual([classId]);

    // Only an admin decides.
    await call(bea, "POST", `/v1/offices/${officeId}/join`);
    await call(arv, "PATCH", `/v1/offices/${officeId}`, { domainJoin: true });
    await call(bea, "POST", `/v1/offices/${officeId}/join`);
    expect((await call(bea, "PATCH", `/v1/offices/${officeId}`, { domainJoin: false })).status).toBe(403);
  });

  it("starts the team trial for the fourth, as an invite would", async () => {
    const domain = company();
    const arv = await makeUser("Arv", { email: `arv@${domain}` });
    const officeId = await officeOf(arv);
    for (const name of ["Bea", "Paul", "Jp"]) {
      const one = await makeUser(name, { email: `${name.toLowerCase()}@${domain}` });
      expect((await call(one, "POST", `/v1/offices/${officeId}/join`)).status).toBe(200);
    }
    const office = await call<{ office: { plan: string; members: number } }>(arv, "GET", `/v1/offices/${officeId}`);
    expect(office.body.office).toMatchObject({ plan: "pro", members: 4 });

    // A free office already past its trial is full for the next one, and says so before they try.
    await env.DB.prepare("UPDATE offices SET plan = 'free', seats = 3, trial_ends_at = 0 WHERE id = ?").bind(officeId).run();
    const jez = await makeUser("Jez", { email: `jez@${domain}` });
    expect((await call<Team>(jez, "GET", "/v1/me/team")).body.offices[0]).toMatchObject({ id: officeId, full: true });
    expect((await call(jez, "POST", `/v1/offices/${officeId}/join`)).status).toBe(409);
  });
});
