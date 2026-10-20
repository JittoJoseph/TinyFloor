import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { call, makeUser } from "./helpers";

const KEYS = { p256dh: "BCjOH3Pf8MfJ7sDBWn2gcYuSXV5FIbZl3vZvJRFb5gDGB9fm3gDAQVwmsNljGBythOR9BWwSJOrtxYJGi2YUT8w", auth: "c2VjcmV0LWF1dGgtMTIzNA" };
const rows = (userId: string) =>
  env.DB.prepare("SELECT endpoint, session_id FROM push_subscriptions WHERE user_id = ?").bind(userId).all<{ endpoint: string; session_id: string }>();

describe("push subscriptions", () => {
  it("keeps a browser's subscription with the session that sent it, and lets it go", async () => {
    const ana = await makeUser("Ana");
    const endpoint = `https://fcm.googleapis.com/fcm/send/${crypto.randomUUID()}`;
    expect((await call(ana, "PUT", "/v1/push", { endpoint, keys: KEYS })).status).toBe(200);
    // Saying it again (every visit does) keeps one row.
    expect((await call(ana, "PUT", "/v1/push", { endpoint, keys: KEYS })).status).toBe(200);
    expect((await rows(ana.id)).results).toHaveLength(1);

    // The same browser signed in as someone else is theirs now.
    const bo = await makeUser("Bo");
    await call(bo, "PUT", "/v1/push", { endpoint, keys: KEYS });
    expect((await rows(ana.id)).results).toHaveLength(0);
    expect((await rows(bo.id)).results).toHaveLength(1);

    expect((await call(bo, "DELETE", "/v1/push", { endpoint })).status).toBe(200);
    expect((await rows(bo.id)).results).toHaveLength(0);
  });

  it("goes when its session does", async () => {
    const cy = await makeUser("Cy");
    await call(cy, "PUT", "/v1/push", { endpoint: `https://web.push.apple.com/${crypto.randomUUID()}`, keys: KEYS });
    expect((await rows(cy.id)).results).toHaveLength(1);
    expect((await call(cy, "POST", "/v1/auth/logout")).status).toBe(200);
    expect((await rows(cy.id)).results).toHaveLength(0);
  });

  it("takes only real push services, and only from an account", async () => {
    const dee = await makeUser("Dee");
    const bad = async (body: unknown) => (await call(dee, "PUT", "/v1/push", body)).status;
    expect(await bad({ endpoint: "https://example.com/hook", keys: KEYS })).toBe(400);
    expect(await bad({ endpoint: "http://fcm.googleapis.com/fcm/send/x", keys: KEYS })).toBe(400);
    expect(await bad({ endpoint: "https://fcm.googleapis.com.evil.com/x", keys: KEYS })).toBe(400);
    expect(await bad({ endpoint: "https://fcm.googleapis.com/fcm/send/x", keys: { p256dh: "x", auth: KEYS.auth } })).toBe(400);
    expect(await bad({ endpoint: "https://wns2-par02p.notify.windows.com/w/?token=abc", keys: KEYS })).toBe(200);

    const guest = await makeUser("Guest", { guest: true });
    expect((await call(guest, "PUT", "/v1/push", { endpoint: "https://fcm.googleapis.com/fcm/send/g", keys: KEYS })).status).toBe(403);
    expect((await call(null, "PUT", "/v1/push", { endpoint: "https://fcm.googleapis.com/fcm/send/n", keys: KEYS })).status).toBe(401);
  });
});
