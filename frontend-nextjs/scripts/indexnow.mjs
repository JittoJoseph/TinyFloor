// Tells Bing, Yandex, Seznam and Naver (and ChatGPT search, which reads Bing)
// about every URL in the live sitemap. Run after a deploy that adds or changes pages.
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.tinyfloor.com").replace(/\/+$/, "");
const KEY = "6537fa0233c5dc0cca20f9d1f56be989";

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
