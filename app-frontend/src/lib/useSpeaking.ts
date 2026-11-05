"use client";

import { useEffect, useState } from "react";
import { listenTo } from "./audioLevel";
import { SpeechDetector } from "./speech";

const SAMPLE_EVERY = 50;
/** Held this long after the voice stops, so the outline doesn't flicker between words. */
const HOLD_MS = 400;

/** True while a stream carries voice (SpeechDetector), held briefly so the outline does not flicker between words. */
export function useSpeaking(stream: MediaStream | null, enabled: boolean) {
  const [speaking, setSpeaking] = useState(false);
  const tracks = stream?.getAudioTracks().length ?? 0;

  useEffect(() => {
    const level = stream && enabled && tracks ? listenTo(stream) : null;
    if (!level) return;

    const detector = new SpeechDetector({ stopAfterMs: HOLD_MS });
    const timer = setInterval(() => setSpeaking(detector.push(level.level(), performance.now())), SAMPLE_EVERY);

    return () => {
      clearInterval(timer);
      level.stop();
      setSpeaking(false);
    };
  }, [stream, enabled, tracks]);

  return speaking && enabled && tracks > 0;
}
