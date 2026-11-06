import { test } from "node:test";
import assert from "node:assert/strict";
import { SpeechDetector, levelOf } from "./speech.ts";

const RATE = 48000;
const WINDOW = 2048;
const STEP_MS = 50;

/** A deterministic noise source, so the tests always hear the same thing. */
function noise(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 2147483648 - 1;
  };
}

/** Builds a signal sample by sample from a function of time (seconds). */
function signal(seconds: number, at: (t: number, n: () => number) => number, seed = 1): Float32Array {
  const n = noise(seed);
  const out = new Float32Array(Math.floor(seconds * RATE));
  for (let i = 0; i < out.length; i++) out[i] = at(i / RATE, n);
  return out;
}

/** Something voice-like: a pitched, wobbling tone with breath, at about -20 dBFS. */
const voice = (t: number, n: () => number) =>
  0.12 * Math.sin(2 * Math.PI * 160 * t + 3 * Math.sin(2 * Math.PI * 4 * t)) * (0.7 + 0.3 * Math.sin(2 * Math.PI * 3 * t)) + 0.02 * n();

/** Runs the detector over a signal as the app reads a microphone; the times it was talking. */
function run(x: Float32Array, stopAfterMs = 1500): boolean[] {
  const detector = new SpeechDetector({ stopAfterMs });
  const out: boolean[] = [];
  for (let t = STEP_MS; (t * RATE) / 1000 <= x.length; t += STEP_MS) {
    const end = Math.floor((t * RATE) / 1000);
    out.push(detector.push(levelOf(x.subarray(Math.max(0, end - WINDOW), end)), t));
  }
  return out;
}

const firstOn = (timeline: boolean[]) => timeline.indexOf(true) * STEP_MS + STEP_MS;

test("silence and a quiet room are never talking", () => {
  assert.ok(!run(signal(5, () => 0)).includes(true));
  assert.ok(!run(signal(5, (_, n) => 0.003 * n())).includes(true));
});

test("a voice is heard within half a second, and lets go after the pause", () => {
  const x = signal(5, (t, n) => (t >= 1 && t < 2.5 ? voice(t, n) : 0.002 * n()));
  const on = run(x);
  const start = firstOn(on);
  assert.ok(start >= 1250 && start <= 1500, `started at ${start} ms`);
  // Still talking through the 1.5 s hold, and quiet again after it.
  assert.ok(on[Math.floor(3500 / STEP_MS) - 1], "held through the pause");
  assert.ok(!on[Math.floor(4300 / STEP_MS) - 1], "let go after the hold");
});

test("a dog's bark or a cough, as loud and smooth as a voice, isn't talking", () => {
  // Three barks of a quarter second, voice-loud, a second and a half apart.
  for (const length of [0.15, 0.2, 0.25]) {
    const x = signal(6, (t, n) => ((t % 1.5) >= 1 && (t % 1.5) < 1 + length ? voice(t, n) * 1.5 : 0.002 * n()));
    assert.ok(!run(x).includes(true), `a ${length * 1000} ms bark started talking`);
  }
});

test("a longer onset, for a hint, takes a sentence, not a burst", () => {
  const timeline = (x: Float32Array) => {
    const detector = new SpeechDetector({ stopAfterMs: 1500, onsetMs: 1000 });
    const out: boolean[] = [];
    for (let t = STEP_MS; (t * RATE) / 1000 <= x.length; t += STEP_MS) {
      const end = Math.floor((t * RATE) / 1000);
      out.push(detector.push(levelOf(x.subarray(Math.max(0, end - WINDOW), end)), t));
    }
    return out;
  };
  const burst = signal(4, (t, n) => (t >= 1 && t < 1.6 ? voice(t, n) : 0.002 * n()));
  assert.ok(!timeline(burst).includes(true), "0.6 s of voice was enough");
  const sentence = signal(4, (t, n) => (t >= 1 && t < 3 ? voice(t, n) : 0.002 * n()));
  const start = firstOn(timeline(sentence));
  assert.ok(start >= 2000 && start <= 2400, `a sentence started it at ${start} ms`);
});

test("keyboard clicks in a quiet room aren't talking", () => {
  const clicks = (t: number, n: () => number) => {
    const since = t % 0.12;
    return (since < 0.012 ? 0.4 * Math.exp(-since * 600) * n() : 0) + 0.002 * n();
  };
  assert.ok(!run(signal(4, clicks)).includes(true));
});

test("a voice over a loud fan is still heard, and the fan alone soon isn't", () => {
  const fan = (t: number, n: () => number) => 0.015 * Math.sin(2 * Math.PI * 120 * t) + 0.01 * n();
  // The fan starts at 0 and runs throughout; someone talks from 15 s to 17 s.
  const x = signal(20, (t, n) => fan(t, n) + (t >= 15 && t < 17 ? voice(t, n) : 0));
  const on = run(x);
  const at = (ms: number) => on[Math.floor(ms / STEP_MS) - 1];
  assert.ok(!at(12000), "the fan alone isn't talking after a while");
  assert.ok(at(15800), "the voice over it is");
});

test("readings arriving late or out of step don't break it", () => {
  const detector = new SpeechDetector({ stopAfterMs: 1500 });
  assert.equal(detector.push({ db: -Infinity, crest: 0 }, 0), false);
  assert.equal(detector.push({ db: Number.NaN, crest: Number.NaN }, 10), false);
  // A tab woken after a minute: one big gap, then on as normal.
  for (let t = 60_000; t < 61_000; t += 50) detector.push({ db: -18, crest: 12 }, t);
  assert.equal(detector.push({ db: -18, crest: 12 }, 61_000), true);
});

test("levelOf reads RMS and crest", () => {
  const sine = signal(0.1, (t) => 0.5 * Math.sin(2 * Math.PI * 1000 * t));
  const level = levelOf(sine);
  assert.ok(Math.abs(level.db - 20 * Math.log10(0.5 / Math.SQRT2)) < 0.2);
  assert.ok(Math.abs(level.crest - 3.01) < 0.2);
});
