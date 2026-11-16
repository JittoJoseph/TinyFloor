// Pictures of the product for the site (public/screens): the app itself, photographed at
// twice its size, set on one of the site's colour stages (components/home/ColorStage), and
// written as a light WebP (1600 by 1000, 30 to 90 KB) with a 1200 by 630 JPEG card beside it.
// The changelog, its pages and the feature pages' articles show them.
//
// With the app, the API and the realtime room running locally (pnpm dev in each), signed in
// as a local test account whose session cookie is in SESSION (the API logs the sign-in code
// when RESEND_API_KEY isn't set), and playwright-core and sharp resolvable from here:
//
//     SESSION=... CHROME="C:/Program Files/Google/Chrome/Application/chrome.exe" node scripts/screens.mjs [name ...]
//
// The call takes two people: a second test account of the same office, signed in as
// OTHER_SESSION, waits on the floor under the name OTHER_NAME (Ryan) and answers.
//
// Each shot is the app as people see it: light theme (or dark where the shot is about the
// theme), no snow, no development badge, no trial banner, and nothing that isn't live (the
// Calendar item stays out until it is). Floor shots depend on where your character starts,
// so look at each one before keeping it. A shot without `steps` is composed from a file
// that's already in public/ (the home page's floor pictures).
import { mkdir, stat } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT ?? "playwright-core");
const sharp = (await import(process.env.SHARP ?? "sharp")).default;

const APP = process.env.APP ?? "http://localhost:3001";
const OFFICE = process.env.OFFICE ?? "023c7877-70e7-4494-94e3-0ce488109677";
const OUT = new URL("../public/screens/", import.meta.url);

const TONES = { blurple: ["#5865f2", "#8c95ff"], coral: ["#ff6a55", "#ffa184"], mint: ["#1fc79c", "#7ce8c6"], sun: ["#ffc23d", "#ffe28f"] };

/**
 * Every picture: where it's taken, what's done first, what part of the page
 * (in the photograph's pixels, twice the page's) or which element, its stage,
 * and the radius of the panel's own corners, so the mask follows them.
 */
const SHOTS = {
  "dressing-room": {
    url: "/lobby",
    steps: [["click", 666, 858], ["text", "Change how you look"], ["tab", "Extras"], ["click", 830, 474], ["move", 60, 880]],
    element: "[role=dialog]",
    tone: "coral",
    radius: 64,
  },
  "floating-dock": { url: "/lobby", dark: true, steps: [["click", 666, 858], ["move", 1300, 200]], crop: [904, 700, 1476, 1080], tone: "blurple", radius: 24 },
  chat: { url: `/office/${OFFICE}/chat`, steps: [], crop: [730, 640, 1300, 1130], tone: "mint", radius: 24 },
  "chat-search": {
    url: `/office/${OFFICE}/chat`,
    steps: [["text", "Search or jump to"], ["type", "onboarding"]],
    crop: [640, 200, 1600, 840],
    tone: "sun",
    radius: 40,
  },
  // The meeting room's whiteboard, open, with what's on it (draw on it first; the board keeps it). The
  // character walks to it the way a click on the board does, then E opens it.
  whiteboard: {
    url: `/office/${OFFICE}`,
    viewport: { width: 1440, height: 800 },
    steps: [
      ["eval", "(() => { const s = __game.scene.scenes.find((x) => x.whiteboardObject); const w = s.whiteboardObject; s.movementManager.goTo(w.spot.x, w.spot.y + 20, () => {}); })()"],
      ["wait", 12000],
      ["key", "e"],
      ["move", 5, 5],
    ],
    crop: [420, 68, 2044, 1412],
    tone: "coral",
    radius: 56,
  },
  // A call on the floor: you walk up to the other person, call, and they answer. Voice first, as calls start.
  calls: {
    url: `/office/${OFFICE}`,
    viewport: { width: 1440, height: 760 },
    other: true,
    steps: [["eval", near(process.env.OTHER_NAME ?? "Ryan")], ["wait", 12000], ["button", "Call"], ["wait", 3000], ["answer"], ["wait", 6000], ["move", 5, 5]],
    crop: [620, 0, 2260, 1520],
    tone: "mint",
    radius: 40,
  },
  meetings: { file: "home/meeting-room.webp", tone: "blurple", radius: 0 },
  campus: { file: "home/floor-still.webp", tone: "mint", radius: 0 },
};

/** The floor's script for walking up beside someone, found by name (development builds keep the game on window.__game). */
function near(name) {
  return `(() => {
    const s = __game.scene.scenes.find((x) => x.playerManager);
    const one = s.playerManager.getPlayerList().find((p) => p.name === ${JSON.stringify(name)});
    const them = one && s.playerManager.getPlayers().get(one.id);
    if (them) s.movementManager.goTo(them.x - 56, them.y + 8, () => {});
  })()`;
}

const wanted = process.argv.slice(2);
const names = Object.keys(SHOTS).filter((name) => !wanted.length || wanted.includes(name));
await mkdir(OUT, { recursive: true });
// A stand-in microphone and camera, allowed without asking, for the call.
const browser = names.some((name) => SHOTS[name].url)
  ? await chromium.launch({ executablePath: process.env.CHROME, args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] })
  : null;

for (const name of names) {
  const shot = SHOTS[name];
  const source = shot.file ? new URL(`../public/${shot.file}`, import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1") : await photograph(shot);
  await compose(source, name, shot);
}
await browser?.close();

/** The app, signed in, at 1440 by 900 (or the shot's own size) and twice the pixels, after the shot's steps. */
async function photograph(shot) {
  const other = shot.other ? await signIn(process.env.OTHER_SESSION, shot) : null;
  const { context, page } = await signIn(process.env.SESSION, shot);
  for (const [kind, a, b] of shot.steps) {
    if (kind === "click") await page.mouse.click(a, b);
    if (kind === "move") await page.mouse.move(a, b);
    if (kind === "text") await page.getByText(a).first().click();
    if (kind === "tab") await page.getByRole("tab", { name: a }).first().click();
    if (kind === "button") await page.getByRole("button", { name: a, exact: true }).first().click();
    if (kind === "type") await page.keyboard.type(a, { delay: 30 });
    if (kind === "key") await page.keyboard.press(a);
    if (kind === "wait") await page.waitForTimeout(a);
    if (kind === "eval") await page.evaluate(a);
    if (kind === "answer") await other.page.getByRole("button", { name: /answer/i }).first().click();
    await page.waitForTimeout(1200);
  }
  await page.waitForTimeout(1500);
  const buffer = shot.element ? await page.locator(shot.element).first().screenshot() : await page.screenshot();
  await context.close();
  await other?.context.close();
  return buffer;
}

/** One person on the shot's page: their session, the light theme (or dark), no snow, no development badge, no trial banner. */
async function signIn(session, shot) {
  const context = await browser.newContext({ viewport: shot.viewport ?? { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: shot.dark ? "dark" : "light" });
  await context.grantPermissions(["microphone", "camera"]);
  await context.addCookies([{ name: "tf_session", value: session, domain: "localhost", path: "/", httpOnly: true }]);
  await context.addInitScript((dark) => {
    localStorage.setItem("tf-theme", dark ? "dark" : "light");
    const prefs = JSON.parse(localStorage.getItem("tf-prefs") ?? "{}");
    localStorage.setItem("tf-prefs", JSON.stringify({ ...prefs, snow: false }));
  }, !!shot.dark);
  const page = await context.newPage();
  await page.goto(`${APP}${shot.url}`, { waitUntil: "load" });
  await page.waitForTimeout(8000);
  await page.addStyleTag({ content: "nextjs-portal{display:none!important} a[href$='/calendar']{display:none!important}" });
  if (await page.getByText(/trial has ended/i).count()) await page.getByRole("button", { name: /hide for today/i }).first().click().catch(() => {});
  return { context, page };
}

/** The picture on its stage: the panel scaled to fit, its corners masked, a soft shadow under it. */
async function compose(input, name, { tone, radius = 40, crop }) {
  const [W, H, FILL] = [1600, 1000, 0.82];
  const [deep, light] = TONES[tone];
  const background = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><radialGradient id="g" cx="88%" cy="0%" r="110%"><stop offset="0" stop-color="${light}"/><stop offset="0.6" stop-color="${deep}"/><stop offset="1" stop-color="${deep}"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`,
  );
  const source = crop ? await sharp(input).extract({ left: crop[0], top: crop[1], width: crop[2], height: crop[3] }).png().toBuffer() : input;
  const meta = await sharp(source).metadata();
  const scale = Math.min((W * FILL) / meta.width, (H * FILL) / meta.height);
  const [pw, ph] = [Math.round(meta.width * scale), Math.round(meta.height * scale)];
  const r = Math.round((radius || 40) * scale);
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}"><rect width="${pw}" height="${ph}" rx="${r}" fill="#fff"/></svg>`);
  const panel = await sharp(source).resize(pw, ph, { kernel: "lanczos3" }).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  const shadow = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${pw + 160}" height="${ph + 160}"><rect x="80" y="104" width="${pw}" height="${ph}" rx="${r}" fill="rgba(10,12,40,0.30)"/></svg>`))
    .blur(28)
    .png()
    .toBuffer();
  const [left, top] = [Math.round((W - pw) / 2), Math.round((H - ph) / 2)];
  const composed = await sharp(background)
    .composite([
      { input: shadow, left: left - 80, top: top - 80 },
      { input: panel, left, top },
    ])
    .png()
    .toBuffer();
  const webp = new URL(`${name}.webp`, OUT);
  await sharp(composed).webp({ quality: 82, effort: 6, smartSubsample: true }).toFile(webp.pathname.replace(/^\/([A-Z]:)/, "$1"));
  await sharp(composed).resize(1200, 630, { fit: "cover" }).jpeg({ quality: 82, mozjpeg: true }).toFile(new URL(`${name}.jpg`, OUT).pathname.replace(/^\/([A-Z]:)/, "$1"));
  console.log(`${name}.webp ${Math.round((await stat(webp)).size / 1024)} KB`);
}
