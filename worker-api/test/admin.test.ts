import { env, exports } from "cloudflare:workers";
import { describe, expect, it, vi } from "vitest";
import { call, makeUser, SITE } from "./helpers";

/** An account with the admin address, verified the way Google verifies it, or not. */
async function admin(verified = true) {
  const boss = await makeUser("Boss", { email: "boss@example.com" });
  await env.DB.prepare("UPDATE users SET email_verified = ? WHERE id = ?").bind(verified ? 1 : 0, boss.id).run();
  return boss;
}

describe("admin", () => {
  it("is not there for anyone who isn't an admin, or whose address isn't verified", async () => {
    const someone = await makeUser("Someone");
    expect((await call(someone, "GET", "/v1/admin/summary")).status).toBe(404);
    expect((await call(null, "GET", "/v1/admin/users")).status).toBe(401);
    const unverified = await admin(false);
    expect((await call(unverified, "GET", "/v1/admin/offices")).status).toBe(404);
    await env.DB.prepare("DELETE FROM users WHERE email = 'boss@example.com'").run();
  });

  it("counts people, lists them newest first, and finds them by name or email", async () => {
    const boss = await admin();
    await makeUser("Priya Search", { email: "priya.search@example.com" });
    const summary = await call<{ counts: Record<string, number>; signups: number[] }>(boss, "GET", "/v1/admin/summary");
    expect(summary.status).toBe(200);
    expect(summary.body.counts.accounts).toBeGreaterThanOrEqual(2);
    expect(summary.body.signups).toHaveLength(30);

    const found = await call<{ users: Array<{ displayName: string; email: string }> }>(boss, "GET", "/v1/admin/users?q=priya.search");
    expect(found.body.users.map((one) => one.email)).toEqual(["priya.search@example.com"]);
    // LIKE's wildcards are taken literally.
    const literal = await call<{ users: unknown[] }>(boss, "GET", "/v1/admin/users?q=%25");
    expect(literal.body.users).toHaveLength(0);
    await env.DB.prepare("DELETE FROM users WHERE email = 'boss@example.com'").run();
  });

  it("lists offices with their members", async () => {
    const boss = await admin();
    const owner = await makeUser("Owner");
    const made = await call<{ office: { id: string } }>(owner, "POST", "/v1/offices", { name: "Admin Test Office" });
    const offices = await call<{ offices: Array<{ id: string; name: string; members: Array<{ displayName: string; role: string }> }> }>(
      boss,
      "GET",
      "/v1/admin/offices",
    );
    const office = offices.body.offices.find((one) => one.id === made.body.office.id);
    expect(office?.members).toEqual([expect.objectContaining({ displayName: "Owner", role: "admin" })]);
    await env.DB.prepare("DELETE FROM users WHERE email = 'boss@example.com'").run();
  });

  it("notes the country a session starts from, and nothing for an unknown one", async () => {
    const realFetch = globalThis.fetch;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) =>
      String(input instanceof Request ? input.url : input).startsWith("https://challenges.cloudflare.com/")
        ? Response.json({ success: true })
        : realFetch(input, init),
    );
    const guest = async (country: string, ip: string) => {
      const response = await exports.default.fetch("https://api.tinyfloor.com/v1/auth/guest", {
        method: "POST",
        headers: { Origin: SITE, "Content-Type": "application/json", "CF-Connecting-IP": ip },
        body: JSON.stringify({ name: "Kai", character: "Bob", turnstileToken: "t" }),
        cf: { country },
      } as RequestInit);
      const { user } = (await response.json()) as { user: { id: string } };
      return env.DB.prepare("SELECT country FROM users WHERE id = ?").bind(user.id).first<{ country: string | null }>();
    };
    expect((await guest("DE", "10.8.0.1"))?.country).toBe("DE");
    expect((await guest("T1", "10.8.0.2"))?.country).toBeNull();
    vi.restoreAllMocks();
  });
});
