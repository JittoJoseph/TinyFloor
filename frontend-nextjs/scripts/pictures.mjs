// Redraws the site's pictures from the real floor, with the dev server running
// (pnpm dev) and playwright-core installed somewhere, pointed at if it isn't
// resolvable from here:
//
//     PLAYWRIGHT=/path/to/node_modules/playwright-core/index.mjs node scripts/pictures.mjs
//
// public/floor.webp: the whole map as the app draws it, at its own pixels.
// public/og/*.jpg: the social card for each page, from /og-render. The home
// page and the lobby get one per language; the other pages get an English
// one, and `neutral` stands in for them in the other languages.
import { writeFile } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT
    ? new URL(`file:///${process.env.PLAYWRIGHT.replace(/^\//, "")}`).href
    : "playwright-core"
);

const BASE = process.env.BASE ?? "http://localhost:3000";
const LOCALES = [
  "en",
  "de",
  "fr",
  "es",
  "it",
  "nl",
  "sv",
  "da",
  "no",
  "fi",
  "pt",
  "pl",
  "ja",
  "ko",
  "zh",
  "ru",
  "he",
  "ar",
];
const LANDINGS = [
  "gather-alternative",
  "kumospace-alternative",
  "spatialchat-alternative",
  "workadventure-alternative",
  "wonder-alternative",
  "virtual-office",
  "virtual-coworking",
  "online-study-room",
  "virtual-classroom",
  "proximity-chat",
];
const out = (file) => new URL(`../public/${file}`, import.meta.url);

// WebGL through SwiftShader, so the map is drawn the way the app draws it, without seams between tiles.
const browser = await chromium.launch({
  channel: "chrome",
  args: [
    "--enable-unsafe-swiftshader",
    "--use-angle=swiftshader",
    "--ignore-gpu-blocklist",
  ],
});
const page = await browser.newPage({
  viewport: { width: 1536, height: 1024 },
  deviceScaleFactor: 1,
});
// ONLY=floor,home,lobby,pages,neutral redraws just those; all of them by default.
const only = process.env.ONLY?.split(",");
const wants = (part) => !only || only.includes(part);

if (wants("floor")) {
  await page.goto(`${BASE}/map-render`, {
    waitUntil: "networkidle",
    timeout: 240_000,
  });
  await page.waitForFunction(() => window.__png, null, { timeout: 120_000 });
  // Chrome encodes WebP losslessly at full quality: about 40KB. `cwebp -lossless -z 9` (or Pillow's
  // method 6) takes the same pixels down to about 20KB, which is what's committed.
  const webp = await page.evaluate(async () => {
    const image = new Image();
    image.src = window.__png;
    await image.decode();
    const canvas = Object.assign(document.createElement("canvas"), {
      width: image.width,
      height: image.height,
    });
    canvas.getContext("2d").drawImage(image, 0, 0);
    return canvas.toDataURL("image/webp", 1);
  });
  await writeFile(out("floor.webp"), Buffer.from(webp.split(",")[1], "base64"));
  console.log("floor.webp");
}

await page.setViewportSize({ width: 1200, height: 630 });
const card = async (locale, name, file) => {
  const url = `${BASE}/${locale === "en" ? "" : `${locale}/`}og-render?page=${name}`;
  // The last language visited is remembered in a cookie, and would win over an English address without a prefix.
  await page.context().clearCookies();
  // The dev server compiles each language on first visit and can drop the first request while it does.
  await page.goto(url, { waitUntil: "networkidle", timeout: 240_000 }).catch(() => page.goto(url, { waitUntil: "networkidle", timeout: 240_000 }));
  // The dev server's badge sits in the corner of every page; it isn't part of the card.
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.evaluate(() =>
    Promise.all(
      [...document.images].map((image) => image.decode().catch(() => {})),
    ),
  );
  await page.waitForTimeout(600);
  await page
    .locator("#card")
    .screenshot({
      path: new URL(out(`og/${file}`)).pathname.replace(/^\/([A-Z]:)/, "$1"),
      type: "jpeg",
      quality: 90,
    });
  console.log(file);
};
for (const locale of LOCALES) {
  if (wants("home")) await card(locale, "home", `home-${locale}.jpg`);
  if (wants("lobby")) await card(locale, "lobby", `lobby-${locale}.jpg`);
}
if (wants("pages")) for (const slug of LANDINGS) await card("en", slug, `${slug}.jpg`);
if (wants("neutral")) await card("en", "neutral", "neutral.jpg");
await browser.close();
