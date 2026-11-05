/**
 * The noise filter's worklet and model (src/lib/noiseFilter.ts), copied from
 * the installed package into public/noise before dev and build, so the files
 * served are always the ones its GtcrnWorkletNode expects.
 */
import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

/** Where each file is served, and where it is in the package's dist. */
export const NOISE_FILES = [
  ["gtcrnWorklet.js", "gtcrn/workletProcessor.js"],
  ["gtcrn.wasm", "gtcrn.wasm"],
];

const app = path.resolve(import.meta.dirname, "..");
const dist = path.dirname(createRequire(path.join(app, "package.json")).resolve("@sapphi-red/web-noise-suppressor"));
const out = path.join(app, "public", "noise");

await mkdir(out, { recursive: true });
for (const [served, packaged] of NOISE_FILES) await copyFile(path.join(dist, packaged), path.join(out, served));
