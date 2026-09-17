import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => ({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          TICKET_SECRET: "test-ticket-secret",
          TURNSTILE_SECRET: "test-turnstile-secret",
          COOKIE_DOMAIN: "",
          REALTIME_URL: "ws://localhost:8788",
          TURN_KEY_ID: "test-turn-key",
          TURN_KEY_API_TOKEN: "test-turn-token",
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
