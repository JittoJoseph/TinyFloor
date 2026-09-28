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
          // Billing against a Paddle that the tests stand in for (test/billing.test.ts).
          PADDLE_ENV: "sandbox",
          PADDLE_CLIENT_TOKEN: "test_client_token",
          PADDLE_API_KEY: "test-paddle-key",
          PADDLE_WEBHOOK_SECRET: "pdl_ntfset_test",
          PADDLE_PRICES: JSON.stringify({
            team: { month: "pri_team_month", year: "pri_team_year" },
            business: { month: "pri_business_month", year: "pri_business_year" },
          }),
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
