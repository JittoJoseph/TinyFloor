import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

// The filter's worklet and model are served from public/noise; they must be the
// ones the installed package's GtcrnWorkletNode talks to, or the voice goes silent.
const app = path.resolve(import.meta.dirname, "../..");
const dist = path.dirname(createRequire(import.meta.url).resolve("@sapphi-red/web-noise-suppressor"));

for (const [served, packaged] of [
  ["public/noise/gtcrnWorklet.js", "gtcrn/workletProcessor.js"],
  ["public/noise/gtcrn.wasm", "gtcrn.wasm"],
]) {
  test(`${served} matches the installed package`, () => {
    assert.ok(readFileSync(path.join(app, served)).equals(readFileSync(path.join(dist, packaged))), `copy ${packaged} from the package to ${served}`);
  });
}
