#!/usr/bin/env node
/**
 * Decides where a deploy goes, so that only master can ever reach production.
 *
 *   node ../tools/deploy.mjs <production script> <preview script> [--preview]
 *
 * Each package keeps two plain scripts (its production and its preview deploy)
 * and points `deploy` at this. It runs one of them with `pnpm run`:
 *
 * - In Workers Builds, which sets WORKERS_CI_BRANCH, a build of master runs the
 *   production script and a build of any other branch runs the preview one. A
 *   project set up to build dev with the production command can no longer ship
 *   (or, for the API, migrate the production database) from an unmerged branch.
 * - On a laptop it is production, unless `--preview` is given.
 *
 * It also sets CLOUDFLARE_ENV to the target — "" for the top level, "preview"
 * for the preview environment — so Wrangler knows which one was meant and
 * stops warning that several environments exist but none was named. (An empty
 * `--env ""` would say the same, but opennextjs-cloudflare drops it.)
 */
import { spawnSync } from "node:child_process";

const PRODUCTION_BRANCH = "master";

const args = process.argv.slice(2);
const wantsPreview = args.includes("--preview");
const [production, preview] = args.filter((arg) => arg !== "--preview");
if (!production || !preview) {
  console.error("usage: node tools/deploy.mjs <production script> <preview script> [--preview]");
  process.exit(2);
}

const branch = process.env.WORKERS_CI_BRANCH;
const toPreview = wantsPreview || (branch !== undefined && branch !== PRODUCTION_BRANCH);
const script = toPreview ? preview : production;

console.log(
  `deploy: ${toPreview ? "preview" : "production"}` +
    (branch !== undefined ? ` (Workers Builds, branch ${branch})` : "") +
    ` → pnpm run ${script}`,
);

const result = spawnSync("pnpm", ["run", script], {
  stdio: "inherit",
  // pnpm is a .cmd on Windows, which only a shell can start.
  shell: process.platform === "win32",
  env: { ...process.env, CLOUDFLARE_ENV: toPreview ? "preview" : "" },
});
process.exit(result.status ?? 1);
