"use client";

import { useEffect, useState } from "react";
import { listenTo } from "./audioLevel";

const SAMPLE_EVERY = 100;
const LOUD = 14;
const HOLD = 4;

/** True while a stream carries voice, held briefly so the outline does not flicker between words. */
export function useSpeaking(stream: MediaStream | null, enabled: boolean) {
  const [speaking, setSpeaking] = useState(false);
  const tracks = stream?.getAudioTracks().length ?? 0;

  useEffect(() => {
    const level = stream && enabled && tracks ? listenTo(stream) : null;
    if (!level) return;

    let hold = 0;
    const timer = setInterval(() => {
      hold = level.peak() > LOUD ? HOLD : Math.max(hold - 1, 0);
      setSpeaking(hold > 0);
    }, SAMPLE_EVERY);

    return () => {
      clearInterval(timer);
      level.stop();
    };
  }, [stream, enabled, tracks]);

  return speaking && enabled && tracks > 0;
}
