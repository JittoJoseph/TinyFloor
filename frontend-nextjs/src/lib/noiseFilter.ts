"use client";

import { loadRnnoise, RnnoiseWorkletNode } from "@sapphi-red/web-noise-suppressor";

/**
 * Stronger noise removal (experimental, off by default): the microphone runs
 * through RNNoise, a small neural network, in an AudioWorklet on this device.
 * It takes keyboards, dogs and chatter out, where the browser's own noise
 * suppression mostly handles steady hum. Nothing leaves the device and nothing
 * costs a request beyond fetching the files once (scripts/copy-noise.mjs puts
 * them in public/noise).
 */
const WORKLET = "/noise/rnnoise-worklet.js";
const WASM = "/noise/rnnoise.wasm";
const WASM_SIMD = "/noise/rnnoise_simd.wasm";

/** RNNoise is trained for 48 kHz; the graph runs at that rate whatever the mic. */
const SAMPLE_RATE = 48_000;

let binary: Promise<ArrayBuffer> | null = null;

export interface FilteredMic {
  /** The cleaned-up voice, to send instead of the microphone's own track. */
  track: MediaStreamTrack;
  /** Tears the graph down; the microphone's own track is the caller's to stop. */
  stop(): void;
}

/**
 * The microphone's track, filtered. Null when the browser cannot do it (no
 * AudioWorklet, the files would not load): the call then just uses the plain
 * microphone, so a failure here never costs anyone their voice.
 */
export async function filterMic(mic: MediaStreamTrack): Promise<FilteredMic | null> {
  if (typeof AudioWorkletNode === "undefined") return null;
  let context: AudioContext | null = null;
  try {
    binary ??= loadRnnoise({ url: WASM, simdUrl: WASM_SIMD });
    const wasmBinary = await binary;
    context = new AudioContext({ sampleRate: SAMPLE_RATE });
    await context.audioWorklet.addModule(WORKLET);
    // Opened while starting a call, which is a click, so this normally just works.
    if (context.state === "suspended") await context.resume();

    const source = context.createMediaStreamSource(new MediaStream([mic]));
    const node = new RnnoiseWorkletNode(context, { maxChannels: 1, wasmBinary });
    const out = context.createMediaStreamDestination();
    source.connect(node).connect(out);

    const track = out.stream.getAudioTracks()[0];
    const ctx = context;
    return {
      track,
      stop() {
        track.stop();
        source.disconnect();
        node.disconnect();
        node.destroy();
        void ctx.close().catch(() => {});
      },
    };
  } catch {
    // A failed load is not remembered, so the next call tries again.
    binary = null;
    void context?.close().catch(() => {});
    return null;
  }
}
