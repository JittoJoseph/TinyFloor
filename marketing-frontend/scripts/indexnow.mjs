// Tells IndexNow (Bing, Yandex, Seznam, Naver, Yep, and ChatGPT search and
// Copilot, which read Bing) which pages changed, so they are crawled again in
// minutes instead of whenever the crawler comes back. Run by hand once a
// deploy that changed pages is live; a deploy doesn't run it.
//
//   pnpm run indexnow /tools/team-building-questions   that page, in every language in the sitemap
//   pnpm run indexnow /pricing /de/pricing              more than one ("/de/…" is just that language)
//   pnpm run indexnow all                               every URL in the sitemap
//
// INDEXNOW_DRY=1 prints what would be submitted instead.
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.tinyfloor.com").replace(/\/+$/, "");
/** Also served as public/<key>.txt, which is how IndexNow knows the submissions are ours. */
const KEY = "6537fa0233c5dc0cca20f9d1f56be989";
const ENDPOINT = "https://api.indexnow.org/indexnow";
/** IndexNow takes up to 10,000 URLs a request. */
const BATCH = 10_000;

/** What IndexNow's answers mean. */
const MEANING = {
  200: "accepted",
  202: "accepted, key being checked",
  400: "bad request",
  403: "key not valid for this site",
  422: "URLs not on this site, or the key does not match",
  429: "too many requests",
};

const asked = process.argv.slice(2);
if (!asked.length) {
  console.log("usage: pnpm run indexnow <path…> | all");
  process.exit(2);
}

const urls = await sitemap();
const chosen = asked.includes("all") ? urls : urls.filter((url) => asked.some((path) => matches(new URL(url).pathname, path)));
await submit(chosen);

/**
 * Whether a sitemap URL is one asked for: the same path, or the same path in
 * another language ("/tools" asks for "/de/tools" too). A path starting with
 * a language asks for that language only.
 */
function matches(pathname, path) {
  const tidy = (one) => one.replace(/\/+$/, "") || "/";
  const want = tidy(`/${path.replace(/^\/+/, "")}`);
  const full = tidy(pathname);
  return full === want || tidy(full.replace(/^\/[a-z]{2}(?=\/|$)/, "")) === want;
}

async function submit(list) {
  if (!list.length) return console.log("indexnow: none of those are in the sitemap; nothing submitted");
  if (process.env.INDEXNOW_DRY) {
    console.log(`indexnow: would submit ${list.length} URLs`);
    for (const url of list) console.log(`  ${url}`);
    return;
  }
  await checkKey();
  for (let i = 0; i < list.length; i += BATCH) {
    const urlList = list.slice(i, i + BATCH);
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList }),
    });
    console.log(`indexnow: ${response.status} ${MEANING[response.status] ?? response.statusText} for ${urlList.length} URLs`);
  }
  if (list.length <= 40) for (const url of list) console.log(`  ${url}`);
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
