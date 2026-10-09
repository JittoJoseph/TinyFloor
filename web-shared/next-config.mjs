import path from "node:path";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

/**
 * The Next config both frontends build with, from their own next.config.ts.
 * `serverLeavesOut` names packages the server build leaves out because the code
 * that uses them only ever runs in the browser.
 *
 * @param {{ serverLeavesOut?: string[] }} [options]
 * @returns {import("next").NextConfig}
 */
export function frontendConfig({ serverLeavesOut = [] } = {}) {
  return withNextIntl({
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
    webpack: (config, { isServer }) => {
      // Code in ../web-shared uses the app's packages (its node_modules is a link to the app's, made
      // by fetch-assets.mjs); looking here first keeps it so while both dev servers run, so there is one React.
      config.resolve.modules = [path.join(process.cwd(), "node_modules"), "node_modules"];
      if (isServer && serverLeavesOut.length) {
        config.resolve.alias = { ...config.resolve.alias, ...Object.fromEntries(serverLeavesOut.map((name) => [name, false])) };
      }
      return config;
    },
  });
}
