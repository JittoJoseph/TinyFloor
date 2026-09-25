import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

const nextConfig: NextConfig = {
  // The wire protocol lives in ../shared-protocol, shared with the Workers.
  experimental: {
    externalDir: true,
    // Next 16.3 bundles small prefetch responses together; OpenNext serves a
    // built page's prefetch from its cache only unbundled, and otherwise
    // answers with the whole page, which the router rejects and asks for
    // again, some 20 times a second.
    prefetchInlining: false,
  },
  // A check build can go elsewhere, so it never trips over a running dev server's .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Bottom left is where the app keeps you (your face on the rail).
  devIndicators: { position: "bottom-right" },
  // The floor only ever loads in the browser (ssr: false, or inside an effect),
  // so the server build leaves Phaser out instead of carrying 1.2MB it never runs.
  webpack: (config, { isServer }) => {
    if (isServer) config.resolve.alias = { ...config.resolve.alias, phaser: false };
    return config;
  },
};

export default withNextIntl(nextConfig);
