import { describe, expect, it } from "vitest";
import { call, makeUser } from "./helpers";

describe("profile link", () => {
  it("keeps a web address, adds https when it's missing, and clears it when empty", async () => {
    const ada = await makeUser("Ada");
    const set = await call<{ user: { link: string | null } }>(ada, "PATCH", "/v1/me", { link: "ada.dev/work" });
    expect(set.body.user.link).toBe("https://ada.dev/work");
    const cleared = await call<{ user: { link: string | null } }>(ada, "PATCH", "/v1/me", { link: " " });
    expect(cleared.body.user.link).toBeNull();
  });

  it("refuses anything that isn't a web address", async () => {
    const ada = await makeUser("Ada");
    for (const link of ["javascript:alert(1)", "not a link", "ftp://files.example.com", `https://example.com/${"a".repeat(200)}`]) {
      const result = await call<{ error: { code: string; field: string } }>(ada, "PATCH", "/v1/me", { link });
      expect(result.status, link).toBe(400);
      expect(result.body.error).toMatchObject({ code: "bad_link", field: "link" });
    }
  });

  it("shows someone's name and link to anyone with a session, and never a guest's link", async () => {
    const ada = await makeUser("Ada");
    await call(ada, "PATCH", "/v1/me", { link: "https://ada.dev" });
    const guest = await makeUser("Gus", { guest: true });

    const seen = await call<{ person: { displayName: string; link: string | null } }>(guest, "GET", `/v1/people/${ada.id}`);
    expect(seen.body.person).toMatchObject({ displayName: "Ada", link: "https://ada.dev" });
    expect((await call(null, "GET", `/v1/people/${ada.id}`)).status).toBe(401);

    // A guest can't set a link at all.
    await call(guest, "PATCH", "/v1/me", { link: "https://gus.dev" });
    const gus = await call<{ person: { link: string | null; guest: boolean } }>(ada, "GET", `/v1/people/${guest.id}`);
    expect(gus.body.person).toMatchObject({ link: null, guest: true });
  });
});
