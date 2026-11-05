import { levelOf, type Level } from "./speech";

/**
 * How loud a stream is right now, for showing who talks (SpeechDetector). Every listener shares
 * one AudioContext, and it sleeps while nobody listens: a running context
 * keeps an audio thread busy for as long as the tab is open.
 */
let context: AudioContext | null = null;
let listening = 0;

export interface AudioLevel {
  /** The last ~40 ms: RMS and crest (speech.ts). */
  level(): Level;
  stop(): void;
}

export function listenTo(stream: MediaStream): AudioLevel | null {
  if (typeof AudioContext === "undefined") return null;
  context ??= new AudioContext();
  listening++;
  context.resume().catch(() => {});
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);
  const samples = new Float32Array(analyser.fftSize);
  let stopped = false;

  return {
    level() {
      analyser.getFloatTimeDomainData(samples);
      return levelOf(samples);
    },
    stop() {
      if (stopped) return;
      stopped = true;
      source.disconnect();
      if (--listening === 0) context?.suspend().catch(() => {});
    },
  };
}
