import { HttpError, json } from "./http";
import type { Router } from "./router";
import { requireUser } from "./session";

const CREDENTIAL_TTL_SECONDS = 4 * 60 * 60;
/** Each person gets one set of credentials an hour at most, which also rate limits calls to Cloudflare. */
const CACHE_SECONDS = 60 * 60;

export function callRoutes(router: Router): void {
  router.add("POST", "/v1/calls/ice-servers", async ({ request, env, ctx }) => {
    const user = await requireUser(env, request, ctx);

    // The Cache API needs a URL key; this one is never fetched.
    const cacheKey = new Request(`https://ice-servers.internal/${user.id}`);
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) return json(await cached.json());

    const response = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ttl: CREDENTIAL_TTL_SECONDS }),
      },
    );
    if (!response.ok) throw new HttpError(502, "turn_unavailable", "Calls are unavailable right now");

    const { iceServers } = (await response.json()) as { iceServers: RTCIceServer[] };
    const body = { iceServers, expiresAt: Date.now() + CREDENTIAL_TTL_SECONDS * 1000 };
    ctx.waitUntil(
      cache.put(
        cacheKey,
        Response.json(body, { headers: { "Cache-Control": `max-age=${CACHE_SECONDS}` } }),
      ),
    );
    return json(body);
  });
}

interface RTCIceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}
