import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

/** A VAPID key for the tests' pushes: any P-256 key does, as a private JWK like the real secret. */
async function testVapidKey(): Promise<string> {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  return JSON.stringify(await crypto.subtle.exportKey("jwk", pair.privateKey));
}

export default defineConfig(async () => ({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          SITE_ORIGINS: "http://localhost:3000",
          TICKET_SECRET: "test-ticket-secret",
          DISCORD_WEBHOOK_URL: "",
          REALTIME_APP_ID: "test-app",
          REALTIME_APP_SECRET: "test-secret",
          VAPID_KEY: await testVapidKey(),
          TEST_MIGRATIONS: await readD1Migrations("../worker-api/migrations"),
        },
      },
    }),
  ],
  // Two files at a time: the room tests time sockets and floods, and on a busy machine (dev servers
  // running beside them) more workers starve each other into timeouts that never happen in the room itself.
  test: { setupFiles: ["./test/apply-migrations.ts"], maxWorkers: 2 },
}));
