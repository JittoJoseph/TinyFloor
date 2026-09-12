"use client";

import { useEffect, useState } from "react";

const SAMPLE_EVERY = 100;
const LOUD = 14;
const HOLD = 4;

let context: AudioContext | null = null;

/** True while a stream carries voice, held briefly so the outline does not flicker between words. */
export function useSpeaking(stream: MediaStream | null, enabled: boolean) {
  const [speaking, setSpeaking] = useState(false);
  const tracks = stream?.getAudioTracks().length ?? 0;

  useEffect(() => {
    if (!stream || !enabled || !tracks || typeof AudioContext === "undefined") {
      return;
    }

    context ??= new AudioContext();
    context.resume().catch(() => {});
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);

    const samples = new Uint8Array(analyser.fftSize);
    let hold = 0;
    const timer = setInterval(() => {
      analyser.getByteTimeDomainData(samples);
      let peak = 0;
      for (const value of samples) peak = Math.max(peak, Math.abs(value - 128));
      hold = peak > LOUD ? HOLD : Math.max(hold - 1, 0);
      setSpeaking(hold > 0);
    }, SAMPLE_EVERY);

    return () => {
      clearInterval(timer);
      source.disconnect();
    };
  }, [stream, enabled, tracks]);

  return speaking && enabled && tracks > 0;
}
