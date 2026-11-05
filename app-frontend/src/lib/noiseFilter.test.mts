import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

// scripts/noise-files.mjs copies the filter's worklet and model out of the
// package before each build; an upgrade that moved them would fail the build.
const dist = path.dirname(createRequire(import.meta.url).resolve("@sapphi-red/web-noise-suppressor"));

for (const packaged of ["gtcrn/workletProcessor.js", "gtcrn.wasm"]) {
  test(`the package still ships ${packaged}`, () => {
    assert.ok(existsSync(path.join(dist, packaged)), `${packaged} is missing from @sapphi-red/web-noise-suppressor`);
  });
}
