import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { call, makeUser, SITE, type TestUser } from "./helpers";

const API = "https://api.tinyfloor.com";

async function officeOf(owner: TestUser) {
  const { body } = await call<{ office: { id: string } }>(owner, "POST", "/v1/offices", { name: "Studio" });
  return body.office.id;
}

async function upload(
  user: TestUser,
  officeId: string,
  bytes: BodyInit,
  type: string,
  query = "name=plan.pdf",
  origin: string | null = SITE,
  sentAs = "application/octet-stream",
) {
  const headers: Record<string, string> = { Cookie: user.cookie, "Content-Type": sentAs };
  if (origin) headers.Origin = origin;
  return exports.default.fetch(`${API}/v1/offices/${officeId}/files?${query}&type=${encodeURIComponent(type)}`, { method: "POST", headers, body: bytes });
}

const read = (user: TestUser, key: string) =>
  exports.default.fetch(`${API}/v1/files/${key.slice("att/".length)}`, { headers: { Cookie: user.cookie, Origin: SITE } });

describe("files in chat", () => {
  it("keeps a picture under the office, with its size, and gives it back to members inline", async () => {
    const ana = await makeUser("Ana");
    const officeId = await officeOf(ana);
    const sent = await upload(ana, officeId, new Uint8Array([1, 2, 3]), "image/png", "name=shot.png&width=800&height=600");
    expect(sent.status).toBe(201);
    const { file } = (await sent.json()) as { file: { key: string; name: string; size: number; type: string; width: number; height: number } };
    expect(file).toMatchObject({ name: "shot.png", size: 3, type: "image/png", width: 800, height: 600 });
    expect(file.key).toMatch(new RegExp(`^att/${officeId}/[\\w-]+\\.png$`));

    const back = await read(ana, file.key);
    expect(back.status).toBe(200);
    expect(back.headers.get("Content-Type")).toBe("image/png");
    expect(back.headers.get("Content-Disposition")).toMatch(/^inline/);
    expect(back.headers.get("Cache-Control")).toContain("immutable");
    expect(new Uint8Array(await back.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("downloads anything else, and never serves a page as a page", async () => {
    const bo = await makeUser("Bo");
    const officeId = await officeOf(bo);
    const page = (await (await upload(bo, officeId, "<script>alert(1)</script>", "text/html", "name=evil.html")).json()) as { file: { key: string; width?: number } };
    expect(page.file.width).toBeUndefined();
    const back = await read(bo, page.file.key);
    expect(back.headers.get("Content-Type")).toBe("application/octet-stream");
    expect(back.headers.get("Content-Disposition")).toBe("attachment; filename*=UTF-8''evil.html");
    expect(back.headers.get("Content-Security-Policy")).toContain("sandbox");
  });

  it("is only for people in the office, from the site, and within the size limit", async () => {
    const cy = await makeUser("Cy");
    const dee = await makeUser("Dee");
    const officeId = await officeOf(cy);

    expect((await upload(dee, officeId, "x", "application/pdf")).status).toBe(404);
    expect((await upload(cy, officeId, "x", "application/pdf", "name=a.pdf", null)).status).toBe(403);
    // Only bytes sent the way the site sends them: never a form's own types.
    expect((await upload(cy, officeId, "x", "text/plain", "name=a.txt", SITE, "text/plain")).status).toBe(415);
    expect((await upload(cy, officeId, "x", "text/plain", "name=a.txt", SITE, "multipart/form-data")).status).toBe(415);
    expect((await upload(cy, officeId, "notes", "text/plain", "name=a.txt")).status).toBe(201);
    expect((await upload(cy, officeId, "", "application/pdf")).status).toBe(400);
    expect((await upload(cy, officeId, new Uint8Array(10 * 1024 * 1024 + 1), "application/zip")).status).toBe(413);

    const { file } = (await (await upload(cy, officeId, "x", "application/pdf")).json()) as { file: { key: string } };
    expect((await read(dee, file.key)).status).toBe(404);
    expect((await read(cy, `att/${officeId}/missing.pdf`)).status).toBe(404);
  });

  it("lets whoever sent a file up throw it away, and nobody else", async () => {
    const eve = await makeUser("Eve");
    const officeId = await officeOf(eve);
    const fay = await makeUser("Fay");
    await env.DB.prepare("INSERT INTO memberships (office_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)").bind(officeId, fay.id, Date.now()).run();
    const { file } = (await (await upload(eve, officeId, "x", "application/pdf")).json()) as { file: { key: string } };
    const path = `/v1/files/${file.key.slice("att/".length)}`;

    expect((await call(fay, "DELETE", path)).status).toBe(403);
    expect((await read(eve, file.key)).status).toBe(200);
    expect((await call(eve, "DELETE", path)).status).toBe(200);
    expect((await read(eve, file.key)).status).toBe(404);
    // Already gone is fine.
    expect((await call(eve, "DELETE", path)).status).toBe(200);
  });
});
