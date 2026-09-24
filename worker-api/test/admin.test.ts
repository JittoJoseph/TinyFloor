import { env, exports } from "cloudflare:workers";
import { describe, expect, it, vi } from "vitest";
import { call, fakeRealtime, makeUser, SITE } from "./helpers";

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

    // Sign-ups land on the viewer's own calendar days, and today's are counted today.
    type Days = { signups: number[]; signupDays: string[] };
    const zone = "Pacific/Kiritimati";
    const local = await call<Days>(boss, "GET", `/v1/admin/summary?tz=${encodeURIComponent(zone)}`);
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(Date.now());
    expect(local.body.signupDays).toHaveLength(30);
    expect(local.body.signupDays.at(-1)).toBe(today);
    expect(local.body.signups.at(-1)).toBeGreaterThanOrEqual(2);
    // A zone the runtime doesn't know counts in UTC.
    const unknown = await call<Days>(boss, "GET", "/v1/admin/summary?tz=Nowhere%2FAtAll");
    expect(unknown.body.signupDays.at(-1)).toBe(new Date().toISOString().slice(0, 10));

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
    await env.DB.prepare("UPDATE users SET country = 'NL' WHERE id = ?").bind(owner.id).run();
    const offices = await call<{
      offices: Array<{ id: string; name: string; ownerId: string; ownerCountry: string; members: Array<{ displayName: string; role: string }> }>;
    }>(boss, "GET", "/v1/admin/offices");
    const office = offices.body.offices.find((one) => one.id === made.body.office.id);
    expect(office?.members).toEqual([expect.objectContaining({ displayName: "Owner", role: "admin" })]);
    // The owner comes with where they are, for the list.
    expect(office).toMatchObject({ ownerId: owner.id, ownerCountry: "NL" });
    await env.DB.prepare("DELETE FROM users WHERE email = 'boss@example.com'").run();
  });

  it("notes the country someone walks onto a floor from, not the one they signed up from", async () => {
    const realFetch = globalThis.fetch;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) =>
      String(input instanceof Request ? input.url : input).startsWith("https://challenges.cloudflare.com/")
        ? Response.json({ success: true })
        : realFetch(input, init),
    );
    const response = await exports.default.fetch("https://api.tinyfloor.com/v1/auth/guest", {
      method: "POST",
      headers: { Origin: SITE, "Content-Type": "application/json", "CF-Connecting-IP": "10.8.0.1" },
      body: JSON.stringify({ name: "Kai", character: "Bob", turnstileToken: "t" }),
      cf: { country: "DE" },
    } as RequestInit);
    vi.restoreAllMocks();
    const { user } = (await response.json()) as { user: { id: string } };
    const cookie = response.headers.get("Set-Cookie")!.split(";")[0];
    const countryNow = async () =>
      (await env.DB.prepare("SELECT country FROM users WHERE id = ?").bind(user.id).first<{ country: string | null }>())?.country;
    expect(await countryNow()).toBeNull();

    const walkIn = (country: string) =>
      exports.default.fetch("https://api.tinyfloor.com/v1/lobby/ticket", {
        method: "POST",
        headers: { Origin: SITE, "Content-Type": "application/json", Cookie: cookie },
        body: "{}",
        cf: { country },
      } as RequestInit);
    expect((await walkIn("IN")).status).toBe(200);
    expect(await countryNow()).toBe("IN");
    // Unknown and Tor leave the last one where it was.
    await walkIn("T1");
    expect(await countryNow()).toBe("IN");
  });

  it("reads the lobby's chat, and changes or takes down messages in it, for the admin only", async () => {
    const boss = await admin();
    const someone = await makeUser("Someone Else");
    expect((await call(someone, "DELETE", "/v1/admin/lobby-chat/5")).status).toBe(404);

    const page = await call<{ channel: string }>(boss, "GET", "/v1/admin/lobby-chat?channel=general&before=10");
    expect(page.status).toBe(200);
    expect(page.body.channel).toBe("general");
    expect((await call(boss, "PATCH", "/v1/admin/lobby-chat/5", { body: "kinder words" })).status).toBe(200);
    expect((await call(boss, "PATCH", "/v1/admin/lobby-chat/5", { body: "  " })).status).toBe(400);
    expect((await call(boss, "DELETE", "/v1/admin/lobby-chat/5")).status).toBe(200);
    expect((await call(boss, "DELETE", "/v1/admin/lobby-chat/404")).status).toBe(404);
    expect((await call(boss, "DELETE", "/v1/admin/lobby-chat/nope")).status).toBe(400);
    const calls = await fakeRealtime().calls();
    expect(calls).toContainEqual(["lobbyChat", "general", 10]);
    expect(calls).toContainEqual(["moderateLobbyChat", 5, { body: "kinder words" }]);
    expect(calls).toContainEqual(["moderateLobbyChat", 5, { remove: true }]);
    await env.DB.prepare("DELETE FROM users WHERE email = 'boss@example.com'").run();
  });
});
