import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: { bindings: { TICKET_SECRET: "test-ticket-secret", DISCORD_WEBHOOK_URL: "", REALTIME_APP_ID: "test-app", REALTIME_APP_SECRET: "test-secret" } },
    }),
  ],
});
