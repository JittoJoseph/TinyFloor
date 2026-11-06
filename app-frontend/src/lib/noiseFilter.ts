/**
 * Noise removal for the microphone, on top of the browser's own: GTCRN, a
 * small speech-enhancement network (MIT), run in an AudioWorklet. The
 * browser's suppression takes a fan's steady hum; it barely touches what
 * changes, a keyboard, a door, a chair. Measured on a noisy recording
 * (docs/calls.md): key clicks went from 8 dB under the voice to 46, the hum
 * from 41 to 70, and clean speech came through as it went in. About 5% of a
 * laptop core, and some 25 ms later.
 *
 * Its worklet and model are in public/noise, copied from the package (the
 * versions must match: noiseFilter.test.mts checks). The package itself is
 * loaded only in the browser, ahead of a call (prepareNoiseRemoval): its node
 * extends AudioWorkletNode as it loads, which a server rendering the page
 * doesn't have. A call never waits for it (CallManager.filterVoice).
 */

const WORKLET = "/noise/gtcrnWorklet.js";
const MODEL = "/noise/gtcrn.wasm";
/** Longer than this for the audio to start running, and the microphone stays as it is. */
const START_TIMEOUT_MS = 4000;

export interface CleanVoice {
  /** The microphone with the noise taken out, to send in its place. */
  track: MediaStreamTrack;
  /** The filter and the microphone under it. */
  stop(): void;
  /** The filter alone: the microphone goes on, for a call still sending it. */
  release(): void;
}

let model: Promise<ArrayBuffer> | null = null;

function loadModel(loadGtcrn: (options: { url: string }) => Promise<ArrayBuffer>): Promise<ArrayBuffer> {
  model ??= loadGtcrn({ url: MODEL }).catch((error) => {
    model = null;
    throw error;
  });
  return model;
}

/**
 * Fetches the filter's code, model and worklet while a call is only ringing or
 * a meeting is being joined, so the microphone has its noise removed seconds
 * sooner. On a first call it took 5 s or more to load.
 */
export function prepareNoiseRemoval(): void {
  if (!canRemoveNoise()) return;
  void import("@sapphi-red/web-noise-suppressor")
    .then(({ loadGtcrn }) => loadModel(loadGtcrn))
    .catch(() => {});
  void fetch(WORKLET).catch(() => {});
}

/** Whether this browser can run the filter at all. */
export function canRemoveNoise(): boolean {
  return typeof AudioContext !== "undefined" && typeof AudioWorkletNode !== "undefined" && typeof WebAssembly !== "undefined";
}

/**
 * The microphone through the filter, as a new track; null when it can't run,
 * and then the microphone is sent as it is. The microphone's track keeps
 * running underneath and is stopped with it.
 */
export async function removeNoise(microphone: MediaStreamTrack): Promise<CleanVoice | null> {
  if (!canRemoveNoise()) return null;
  let context: AudioContext | null = null;
  try {
    const { GtcrnWorkletNode, loadGtcrn } = await import("@sapphi-red/web-noise-suppressor");
    const wasmBinary = await loadModel(loadGtcrn);
    context = new AudioContext({ sampleRate: 48000, latencyHint: "interactive" });
    await context.audioWorklet.addModule(WORKLET);
    if (!(await running(context))) throw new Error(`audio stayed ${context.state}`);

    const input = context.createMediaStreamSource(new MediaStream([microphone]));
    // One channel through and out: the filter works on the first, and a second
    // left silent beside it would halve the voice when the two are mixed down.
    const mono = context.createGain();
    mono.channelCount = 1;
    mono.channelCountMode = "explicit";
    const filter = new GtcrnWorkletNode(context, { maxChannels: 1, wasmBinary });
    const output = context.createMediaStreamDestination();
    output.channelCount = 1;
    output.channelCountMode = "explicit";
    input.connect(mono).connect(filter).connect(output);

    const track = output.stream.getAudioTracks()[0];
    const ctx = context;
    // A phone call or another app can suspend the audio: it resumes when it can.
    const wake = () => {
      if (ctx.state !== "running" && ctx.state !== "closed") void ctx.resume().catch(() => {});
    };
    ctx.addEventListener("statechange", wake);
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      ctx.removeEventListener("statechange", wake);
      filter.destroy();
      input.disconnect();
      track.stop();
      void ctx.close().catch(() => {});
    };
    return {
      track,
      release,
      stop() {
        release();
        microphone.stop();
      },
    };
  } catch (error) {
    console.warn("Noise removal unavailable, sending the microphone as it is", error);
    void context?.close().catch(() => {});
    return null;
  }
}

/** Starts the context, and says whether it is running within the timeout. */
async function running(context: AudioContext): Promise<boolean> {
  if (context.state === "running") return true;
  await Promise.race([context.resume().catch(() => {}), new Promise((resolve) => setTimeout(resolve, START_TIMEOUT_MS))]);
  // Read again: it changed while we waited.
  return (context.state as AudioContextState) === "running";
}
