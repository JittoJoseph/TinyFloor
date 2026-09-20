import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const API_DIR = fileURLToPath(new URL("../../worker-api/", import.meta.url));
const WRANGLER = fileURLToPath(new URL("../../worker-api/node_modules/wrangler/bin/wrangler.js", import.meta.url));

/** Runs `wrangler d1 execute tinyfloor-db` from worker-api, without a shell in between. */
export function d1(target, args, options = {}) {
  return execFileSync(process.execPath, [WRANGLER, "d1", "execute", "tinyfloor-db", target, ...args], {
    cwd: API_DIR,
    ...options,
  });
}
