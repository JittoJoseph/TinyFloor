import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("../web-shared/src/lib/i18n/request.ts");

const nextConfig: NextConfig = {
  // The wire protocol lives in ../shared-protocol, shared with the Workers; what the two
  // frontends share (components, translations, styles) lives in ../web-shared.
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
    // Code in ../web-shared has no node_modules of its own: it uses this app's, so there is one React.
    config.resolve.modules = [path.join(process.cwd(), "node_modules"), "node_modules"];
    // tsconfig's "*" path is there for TypeScript, for the same reason. Webpack must not use it: a
    // package found as a folder loses its export conditions, and the server gets next-intl's client build.
    for (const plugin of config.resolve.plugins ?? []) {
      if (plugin && "jsConfigPlugin" in plugin && plugin.paths?.["*"]) {
        plugin.paths = Object.fromEntries(Object.entries(plugin.paths).filter(([pattern]) => pattern !== "*"));
      }
    }
    if (isServer) config.resolve.alias = { ...config.resolve.alias, phaser: false };
    return config;
  },
};

export default withNextIntl(nextConfig);
