// The app's worker entry (wrangler.jsonc `main`): OpenNext's worker, with the
// built pages served as files first (../web-shared/scripts/static-worker.mjs).
import manifest from "./.open-next/static-pages.json";
import next from "./.open-next/worker.js";
import { withStaticPages } from "../web-shared/scripts/static-worker.mjs";

export { BucketCachePurge, DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";

export default withStaticPages(next, manifest, {
  // Every office is one page, built for an office called `_` and handed out for
  // all of them; so is every conversation. The address says which, and the page
  // reads it in the browser. The payloads name `_` too, so the app's router sees
  // one page throughout and never rebuilds the shell as you move around an office.
  sharedPages: [
    [/^(\/[a-z]{2}\/office\/)[^/]+\/chat\/[^/]+$/, "$1_/chat/_"],
    [/^(\/[a-z]{2}\/office\/)[^/]+(\/(?:chat|people|meetings|settings))?$/, "$1_$2"],
    [/^(\/[a-z]{2}\/lobby\/chat\/)[^/]+$/, "$1_"],
  ],
  // As the middleware says it: only the lobby is for search engines.
  noindex: (route) => !/^\/[a-z]{2}\/lobby$/.test(route),
});
