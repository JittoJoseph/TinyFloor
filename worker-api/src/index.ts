import { authRoutes } from "./auth";
import { callRoutes } from "./calls";
import { allowedOrigin, assertSafeWrite, errorResponse, HttpError, json, preflight, withCors } from "./http";
import { floorRoutes } from "./floor";
import { googleRoutes } from "./google";
import { officeRoutes } from "./offices";
import { runRetention } from "./retention";
import { Router } from "./router";

export { PasswordGuard } from "./password-guard";

const router = new Router().add("GET", "/v1/health", async ({ env }) => {
  const database = await env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
  return json({ service: "tinyfloor-api", ok: true, database: database?.ok === 1 });
});
authRoutes(router);
googleRoutes(router);
officeRoutes(router);
floorRoutes(router);
callRoutes(router);

export default {
  async fetch(request, env, ctx) {
    const origin = allowedOrigin(request, env);
    if (request.method === "OPTIONS") return preflight(origin);

    let response: Response;
    try {
      if (request.method !== "GET") assertSafeWrite(request, origin);
      const match = router.match(request.method, new URL(request.url).pathname);
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
