// The marketing site's worker entry (wrangler.jsonc `main`): OpenNext's worker,
// with the built pages served as files first (../web-shared/scripts/static-worker.mjs).
import manifest from "./.open-next/static-pages.json";
import next from "./.open-next/worker.js";
import { withStaticPages } from "../web-shared/scripts/static-worker.mjs";

export { BucketCachePurge, DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";

export default withStaticPages(next, manifest);
