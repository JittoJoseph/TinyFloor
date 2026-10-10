import { adminRoutes } from "./admin";
import { authRoutes } from "./auth";
import { billingRoutes } from "./billing";
import { callRoutes } from "./calls";
import { allowedOrigin, assertSafeWrite, errorResponse, HttpError, json, preflight, withCors } from "./http";
import { floorRoutes } from "./floor";
import { googleRoutes } from "./google";
import { helpRoutes } from "./help";
import { officeRoutes } from "./offices";
import { runRetention } from "./retention";
import { Router } from "./router";

export { PasswordGuard } from "./password-guard";

const WEBHOOK_PATH = "/v1/billing/webhook";

const router = new Router().add("GET", "/v1/health", async ({ env }) => {
  const database = await env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
  return json({ service: "tinyfloor-api", ok: true, database: database?.ok === 1 });
});
authRoutes(router);
googleRoutes(router);
officeRoutes(router);
floorRoutes(router);
callRoutes(router);
billingRoutes(router);
adminRoutes(router);
helpRoutes(router);

export default {
  async fetch(request, env, ctx) {
    const origin = allowedOrigin(request, env);
    if (request.method === "OPTIONS") return preflight(origin);

    let response: Response;
    try {
      const { pathname } = new URL(request.url);
      // Creem's webhook is the one write that doesn't come from the site: its signature is its proof.
      if (request.method !== "GET" && pathname !== WEBHOOK_PATH) assertSafeWrite(request, origin);
      const match = router.match(request.method, pathname);
      if (!match) throw new HttpError(404, "not_found", "No such endpoint");
      response = await match.handler({ request, env, ctx, params: match.params });
    } catch (error) {
      if (!(error instanceof HttpError)) throw error;
      response = errorResponse(error);
    }
    return withCors(response, origin);
  },

  /** The daily clean-up, at 03:00 UTC. */
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(runRetention(env).then((report) => console.log("retention", JSON.stringify(report))));
  },
} satisfies ExportedHandler<Env>;
