// Tells IndexNow (Bing, Yandex, Seznam, Naver, Yep, and ChatGPT search and
// Copilot, which read Bing) which pages changed, so they are crawled again in
// minutes instead of whenever the crawler comes back.
//
// A production deploy runs it twice (package.json `worker:production`):
//
//   node scripts/indexnow.mjs before   reads the live site's sitemap and page
//                                      fingerprints, before the deploy
//   node scripts/indexnow.mjs after    once the new version answers, submits
//                                      the pages whose fingerprint changed,
//                                      the new ones and the removed ones
//
// The fingerprints are hashes of what a crawler reads on each page, written by
// scripts/static-pages.mjs to /page-fingerprints.json, so a deploy that only
// changes code or styles submits nothing. IndexNow asks for exactly that: only
// URLs whose content changed.
//
// By hand: `pnpm run indexnow all` submits every URL in the live sitemap, and
// `pnpm run indexnow /pricing /de/pricing` submits just those. INDEXNOW_DRY=1
// prints what would be submitted instead.
//
// It never fails a deploy: the site is already live when it runs, so a
// problem here is printed and the deploy still counts.
import { mkdir, readFile, writeFile } from "node:fs/promises";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.tinyfloor.com").replace(/\/+$/, "");
/** Also served as public/<key>.txt, which is how IndexNow knows the submissions are ours. */
const KEY = "6537fa0233c5dc0cca20f9d1f56be989";
const ENDPOINT = "https://api.indexnow.org/indexnow";
/** IndexNow takes up to 10,000 URLs a request. */
const BATCH = 10_000;
const BEFORE = new URL("../.open-next/indexnow-before.json", import.meta.url);
const BUILT = new URL("../.open-next/assets/page-fingerprints.json", import.meta.url);

/** What IndexNow's answers mean. */
const MEANING = {
  200: "accepted",
  202: "accepted, key being checked",
  400: "bad request",
  403: "key not valid for this site",
  422: "URLs not on this site, or the key does not match",
  429: "too many requests",
};

const [mode = "all", ...paths] = process.argv.slice(2);

try {
  if (mode === "before") await before();
  else if (mode === "after") await after();
  else if (mode === "all") await submit(await sitemap(), "every URL in the sitemap");
  else await submit([mode, ...paths].map((path) => new URL(path, SITE).href), "the URLs given");
} catch (error) {
  console.warn(`indexnow: ${error instanceof Error ? error.message : error}; nothing submitted`);
}

async function before() {
  const [urls, fingerprints] = await Promise.all([sitemap().catch(() => null), liveFingerprints().catch(() => null)]);
  await mkdir(new URL(".", BEFORE), { recursive: true });
  await writeFile(BEFORE, JSON.stringify({ urls, fingerprints }));
  console.log(
    `indexnow: before the deploy, ${urls?.length ?? "no"} URLs in the sitemap, ` +
      (fingerprints ? `${Object.keys(fingerprints).length} fingerprints` : "no fingerprints (every URL goes in after)"),
  );
}

async function after() {
  const previous = JSON.parse(await readFile(BEFORE, "utf8").catch(() => "{}"));
  const built = JSON.parse(await readFile(BUILT, "utf8")).pages;
  await waitForDeploy(built);
  const urls = await sitemap();

  if (!previous.fingerprints || !previous.urls) return submit(urls, "every URL, as there was nothing to compare with");

  const was = new Set(previous.urls);
  const is = new Set(urls);
  const path = (url) => new URL(url).pathname;
  const added = urls.filter((url) => !was.has(url));
  const removed = previous.urls.filter((url) => !is.has(url));
  const changed = urls.filter((url) => was.has(url) && previous.fingerprints[path(url)] !== built[path(url)]);
  await submit([...added, ...changed, ...removed], `${added.length} new, ${changed.length} changed, ${removed.length} removed`);
}

/** Waits until the site serves this build's fingerprints, so crawlers sent now see the new pages. */
async function waitForDeploy(built) {
  const deadline = Date.now() + 5 * 60_000;
  for (;;) {
    const live = await liveFingerprints().catch(() => null);
    if (live && JSON.stringify(live) === JSON.stringify(built)) return;
    if (Date.now() > deadline) throw new Error("the new version did not show up within 5 minutes");
    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
}

async function submit(urls, why) {
  if (!urls.length) return console.log(`indexnow: no pages changed (${why})`);
  if (process.env.INDEXNOW_DRY) {
    console.log(`indexnow: would submit ${urls.length} URLs (${why})`);
    for (const url of urls) console.log(`  ${url}`);
    return;
  }
  await checkKey();
  for (let i = 0; i < urls.length; i += BATCH) {
    const urlList = urls.slice(i, i + BATCH);
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList }),
    });
    console.log(`indexnow: ${response.status} ${MEANING[response.status] ?? response.statusText} for ${urlList.length} URLs (${why})`);
  }
  if (urls.length <= 20) for (const url of urls) console.log(`  ${url}`);
}

/** The key file must be served at the site's root, holding the key, or every submission is refused. */
async function checkKey() {
  const response = await fetch(`${SITE}/${KEY}.txt`, { cache: "no-store" });
  const body = (await response.text()).trim();
  if (!response.ok || body !== KEY) throw new Error(`${SITE}/${KEY}.txt answers ${response.status} without the key`);
}

async function sitemap() {
  const response = await fetch(`${SITE}/sitemap.xml`, { cache: "no-store" });
  if (!response.ok) throw new Error(`the sitemap answers ${response.status}`);
  return [...(await response.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

async function liveFingerprints() {
  const response = await fetch(`${SITE}/page-fingerprints.json`, { cache: "no-store" });
  if (!response.ok) throw new Error(`/page-fingerprints.json answers ${response.status}`);
  return (await response.json()).pages;
}
