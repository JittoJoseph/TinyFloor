import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

const nextConfig: NextConfig = {
  // The wire protocol lives in ../shared-protocol, shared with the Workers.
  experimental: { externalDir: true },
  // A check build can go elsewhere, so it never trips over a running dev server's .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Bottom left is where the app keeps you (your face on the rail).
  devIndicators: { position: "bottom-right" },
};

export default withNextIntl(nextConfig);
