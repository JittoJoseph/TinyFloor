import { availableParallelism } from "node:os";
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
  const repository = path.join(process.cwd(), "..");
  return withNextIntl({
    // The wire protocol lives in ../shared-protocol, shared with the Workers; what the two
    // frontends share (components, translations, styles) lives in ../web-shared.
    experimental: {
      // Next builds pages with one worker fewer than the machine has cores, which on
      // Workers Builds' two is one, with the second core idle. Two keep both busy.
      cpus: Math.max(2, availableParallelism() - 1),
      // Next 16.3 bundles small prefetch responses together; OpenNext serves a
      // built page's prefetch from its cache only unbundled, and otherwise
      // answers with the whole page, which the router rejects and asks for
      // again, some 20 times a second.
      prefetchInlining: false,
    },
    // The middleware strips trailing slashes itself (lib/edge.ts screen), so
    // PostHog's paths keep theirs on the way through the relay.
    skipTrailingSlashRedirect: true,
    // A check build can go elsewhere, so it never trips over a running dev server's .next.
    distDir: process.env.NEXT_DIST_DIR || ".next",
    // Bottom left is where the app keeps you (your face on the rail).
    devIndicators: { position: "bottom-right" },
    // Built with Turbopack. The frontends and web-shared are one pnpm workspace (pnpm-workspace.yaml
    // at the root), so its root is the repository's, and every package is one copy for all three.
    turbopack: {
      root: repository,
      // The server build gets an empty module for these instead (empty.cjs: named imports are undefined).
      resolveAlias: Object.fromEntries(serverLeavesOut.map((name) => [name, { browser: name, default: "../web-shared/empty.cjs" }])),
    },
    // What the server needs is traced from the same root, so OpenNext finds the workspace's packages.
    outputFileTracingRoot: repository,
  });
}
