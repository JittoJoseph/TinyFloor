import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => ({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          // The origins the tests call from, rather than the live site's.
          SITE_ORIGINS: "http://localhost:3000",
          TICKET_SECRET: "test-ticket-secret",
          TURNSTILE_SECRET: "test-turnstile-secret",
          GOOGLE_CLIENT_ID: "test-client.apps.googleusercontent.com",
          GOOGLE_CLIENT_SECRET: "test-google-secret",
          ADMIN_EMAILS: "boss@example.com",
          COOKIE_DOMAIN: "",
          REALTIME_URL: "ws://localhost:8788",
          TURN_KEY_ID: "test-turn-key",
          TURN_KEY_API_TOKEN: "test-turn-token",
          // Billing against a Creem that the tests stand in for (test/billing.test.ts).
          CREEM_ENV: "test",
          CREEM_API_KEY: "creem_test_key",
          CREEM_WEBHOOK_SECRET: "whsec_test",
          CREEM_PRODUCTS: JSON.stringify({ plus: "prod_plus", pro: "prod_pro" }),
          TEST_MIGRATIONS: await readD1Migrations("./migrations"),
        },
        workers: [
          {
            name: "tinyfloor-realtime",
            modules: true,
            scriptPath: "./test/fake-realtime.js",
            compatibilityDate: "2026-09-01",
          },
        ],
      },
    }),
  ],
  test: { setupFiles: ["./test/apply-migrations.ts"] },
}));
