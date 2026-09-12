// Tells Bing, Yandex, Seznam and Naver (and ChatGPT search, which reads Bing)
// about every URL in the live sitemap. Run after a deploy that adds or changes pages.
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://spatialmeet.jittojoseph.xyz").replace(/\/+$/, "");
const KEY = "5f3c9a1e7b2d4086a9e1c3f7b5d2e804";

const sitemap = await (await fetch(`${SITE}/sitemap.xml`)).text();
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: new URL(SITE).host,
    key: KEY,
    keyLocation: `${SITE}/${KEY}.txt`,
    urlList,
  }),
});

console.log(`IndexNow ${response.status} for ${urlList.length} URLs`);
