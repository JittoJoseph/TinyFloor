/**
 * Puts the noise suppressor's worklet and WebAssembly where the browser can
 * fetch them (public/noise), from the installed package, so they always match
 * the version in package.json. They are not kept in git.
 */
import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const out = path.join(here, "..", "public", "noise");
const dist = path.dirname(require.resolve("@sapphi-red/web-noise-suppressor/rnnoise.wasm"));

await mkdir(out, { recursive: true });
await Promise.all([
  copyFile(path.join(dist, "rnnoise", "workletProcessor.js"), path.join(out, "rnnoise-worklet.js")),
  copyFile(path.join(dist, "rnnoise.wasm"), path.join(out, "rnnoise.wasm")),
  copyFile(path.join(dist, "rnnoise_simd.wasm"), path.join(out, "rnnoise_simd.wasm")),
]);
console.log("noise suppressor copied to public/noise");
