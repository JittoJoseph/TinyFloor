"use client";

import { useEffect } from "react";

/** Holds every animation still and lets the recorder set the time: window.__seek(seconds). */
export function SceneClock() {
  useEffect(() => {
    const win = window as unknown as { __seek: (seconds: number) => void; __sceneReady: Promise<void> };
    win.__seek = (seconds) => {
      for (const animation of document.getAnimations()) {
        animation.pause();
        animation.currentTime = seconds * 1000;
      }
    };
    win.__sceneReady = Promise.all([
      document.fonts.ready,
      ...[...document.images].map((image) => image.decode().catch(() => undefined)),
    ]).then(() => undefined);
  }, []);
  return null;
}
