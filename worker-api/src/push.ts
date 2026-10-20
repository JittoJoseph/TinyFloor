import { HttpError, json, readJson } from "./http";
import type { Router } from "./router";
import { requireAccount } from "./session";

/**
 * A browser saying where it can be reached when TinyFloor is closed
 * (docs/product.md). Kept with the session that said it, so signing out stops
 * it; the realtime worker's chat sends the pushes (worker-realtime's push.ts).
 */

/** The push services browsers use. Anything else would have us posting to wherever a client said. */
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^[a-z0-9.-]+\.push\.apple\.com$/,
  /^[a-z0-9.-]+\.notify\.windows\.com$/,
];

const KEY = /^[A-Za-z0-9_-]{16,200}={0,2}$/;

function endpointOf(value: unknown): string {
  if (typeof value !== "string" || value.length > 1000) throw new HttpError(400, "bad_subscription", "That isn't a push subscription");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new HttpError(400, "bad_subscription", "That isn't a push subscription");
  }
  if (url.protocol !== "https:" || !PUSH_HOSTS.some((host) => host.test(url.hostname))) {
    throw new HttpError(400, "bad_subscription", "That push service isn't one we know");
  }
  return url.href;
}

export function pushRoutes(router: Router): void {
  router
    .add("PUT", "/v1/push", async ({ request, env, ctx }) => {
      const user = await requireAccount(env, request, ctx);
      const body = await readJson(request);
      const endpoint = endpointOf(body.endpoint);
      const keys = (body.keys ?? {}) as Record<string, unknown>;
      if (typeof keys.p256dh !== "string" || typeof keys.auth !== "string" || !KEY.test(keys.p256dh) || !KEY.test(keys.auth)) {
        throw new HttpError(400, "bad_subscription", "That isn't a push subscription");
      }
      // The same browser signing in again, or as someone else, takes the row over.
      await env.DB.prepare(
        `INSERT INTO push_subscriptions (endpoint, user_id, session_id, p256dh, auth, created_at) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (endpoint) DO UPDATE SET user_id = excluded.user_id, session_id = excluded.session_id,
           p256dh = excluded.p256dh, auth = excluded.auth`,
      )
        .bind(endpoint, user.id, user.sessionId, keys.p256dh, keys.auth, Date.now())
        .run();
      return json({ ok: true });
    })
    .add("DELETE", "/v1/push", async ({ request, env, ctx }) => {
      const user = await requireAccount(env, request, ctx);
      const body = await readJson(request);
      if (typeof body.endpoint !== "string") throw new HttpError(400, "bad_subscription", "That isn't a push subscription");
      await env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?").bind(body.endpoint, user.id).run();
      return json({ ok: true });
    });
}
