// Records the website's floor scenes into files, with the dev server running
// (pnpm dev), playwright-core installed somewhere (pointed at with PLAYWRIGHT
// if it isn't resolvable from here) and ffmpeg on the PATH (or at FFMPEG):
//
//     PLAYWRIGHT=/path/to/node_modules/playwright-core/index.mjs node scripts/scenes.mjs
//
// Each scene in src/components/floor/sceneCatalog.tsx is drawn alone by
// /scene-render, held still and stepped frame by frame, then written to
// public/scenes/: a scene that moves as an animated AVIF looping every
// `period` seconds and a lossless WebP still of its first frame (for reduced
// motion and browsers without AVIF); a still scene as the WebP alone. Scenes
// are drawn in English: the words on them are people's names and a chip or
// two. The sizes and a hash of each go to src/components/floor/scene-files.json,
// which SceneMedia reads.
//
// ONLY=hall,guest redraws just those.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const { chromium } = await import(
  process.env.PLAYWRIGHT ? new URL(`file:///${process.env.PLAYWRIGHT.replace(/^\//, "")}`).href : "playwright-core"
);

const BASE = process.env.BASE ?? "http://localhost:3000";
const FFMPEG = process.env.FFMPEG ?? "ffmpeg";
const FPS = 30;

// The catalogue, read from its source so this script needs no build step: each scene's box, scale and period.
const catalog = await readFile(new URL("../src/components/floor/sceneCatalog.tsx", import.meta.url), "utf8");
const SCENES = [...catalog.matchAll(/^ {2}"?([\w-]+)"?: \{\n([\s\S]*?)\n {4}draw:/gm)].map(([, name, body]) => ({
  name,
  size: JSON.parse(body.match(/size: (\[[^\]]+\])/)[1]),
  scale: Number(body.match(/scale: ([\d.]+)/)[1]),
  period: Number(body.match(/period: ([\d.]+)/)?.[1] ?? 0),
}));

const only = process.env.ONLY?.split(",");
const outDir = fileURLToPath(new URL("../public/scenes/", import.meta.url));
const manifestFile = new URL("../src/components/floor/scene-files.json", import.meta.url);
const manifest = JSON.parse(await readFile(manifestFile, "utf8").catch(() => "{}"));
await mkdir(outDir, { recursive: true });

const ffmpeg = (args) => {
  const run = spawnSync(FFMPEG, ["-loglevel", "error", "-y", ...args], { stdio: "inherit" });
  if (run.status !== 0) throw new Error(`ffmpeg failed: ${args.join(" ")}`);
};
const hash = async (file) => createHash("sha256").update(await readFile(file)).digest("hex").slice(0, 10);

const browser = await chromium.launch({ channel: "chrome" });

for (const scene of SCENES.filter((one) => !only || only.includes(one.name))) {
  const context = await browser.newContext({ viewport: { width: scene.size[0], height: scene.size[1] }, deviceScaleFactor: scene.scale });
  const page = await context.newPage();
  const url = `${BASE}/scene-render?name=${scene.name}`;
  // The dev server compiles a page on its first visit and can drop that request.
  await page.goto(url, { waitUntil: "networkidle", timeout: 240_000 }).catch(() => page.goto(url, { waitUntil: "networkidle", timeout: 240_000 }));
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.waitForFunction(() => window.__sceneReady, null, { timeout: 60_000 });
  await page.evaluate(() => window.__sceneReady);
  const stage = page.locator("#scene");
  const frames = await mkdtemp(join(tmpdir(), `scene-${scene.name}-`));

  const count = scene.period ? Math.round(scene.period * FPS) : 1;
  for (let frame = 0; frame < count; frame++) {
    await page.evaluate((seconds) => window.__seek(seconds), frame / FPS);
    await stage.screenshot({ path: join(frames, `f${String(frame).padStart(4, "0")}.png`), animations: "allow" });
  }

  // The still: lossless, since pixel art compresses best that way.
  const still = join(outDir, `${scene.name}.webp`);
  ffmpeg(["-i", join(frames, "f0000.png"), "-c:v", "libwebp", "-lossless", "1", "-compression_level", "6", still]);
  const entry = { width: Math.round(scene.size[0] * scene.scale), height: Math.round(scene.size[1] * scene.scale), loop: false, hash: await hash(still) };
  if (scene.period) {
    // AV1 in full colour (4:4:4): pixel art's hard edges smear with halved colour.
    const loop = join(outDir, `${scene.name}.avif`);
    ffmpeg([
      "-framerate", String(FPS), "-i", join(frames, "f%04d.png"),
      "-vf", "format=yuv444p", "-c:v", "libaom-av1", "-crf", "30", "-b:v", "0", "-cpu-used", "4", "-row-mt", "1",
      "-f", "avif", loop,
    ]);
    // One version for both files: they are always recorded together.
    Object.assign(entry, { loop: true, hash: await hash(loop) });
  }
  manifest[scene.name] = entry;
  // Written as each scene lands, so a stopped run still leaves a manifest SceneMedia can read.
  await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  await rm(frames, { recursive: true, force: true });
  console.log(scene.name, entry);
  await context.close();
}

await browser.close();
await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
console.log("scene-files.json");
