import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => ({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          TICKET_SECRET: "test-ticket-secret",
          DISCORD_WEBHOOK_URL: "",
          REALTIME_APP_ID: "test-app",
          REALTIME_APP_SECRET: "test-secret",
          TEST_MIGRATIONS: await readD1Migrations("../worker-api/migrations"),
        },
      },
    }),
  ],
  test: { setupFiles: ["./test/apply-migrations.ts"] },
}));
