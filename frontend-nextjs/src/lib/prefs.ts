"use client";

import { useSyncExternalStore } from "react";

/**
 * Your own preferences, kept in this browser and nowhere else: nothing here is
 * sent to a server, so none of it costs anything to offer.
 */
export interface Prefs {
  /** Voice processing the browser does for free. */
  noiseSuppression: boolean;
  echoCancellation: boolean;
  /** Your own camera shown as a mirror, the way most people expect. */
  mirrorVideo: boolean;
  /** A sound when a message arrives. */
  messageSound: boolean;
  /** A sound when someone walks onto the floor. */
  joinSound: boolean;
  /** Messages you have not seen, shown for a moment over the floor. */
  nudges: boolean;
  /** Fewer animations, whatever the system says. */
  reduceMotion: boolean;
  /** The floor draws at half the frame rate: easier on a laptop battery. */
  batterySaver: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  noiseSuppression: true,
  echoCancellation: true,
  mirrorVideo: true,
  messageSound: true,
  joinSound: true,
  nudges: true,
  reduceMotion: false,
  batterySaver: false,
};

const KEY = "tf-prefs";
const listeners = new Set<() => void>();
let current: Prefs | null = null;

function read(): Prefs {
  try {
    return { ...DEFAULT_PREFS, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Prefs>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

/** The preferences right now, for code outside React (the call, the sounds). */
export function prefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  return (current ??= read());
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
  current = { ...prefs(), [key]: value };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // Private windows: kept for this page only.
  }
  listeners.forEach((listener) => listener());
}

/** Told whenever a preference changes, for code outside React. */
export function onPrefsChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    prefs,
    () => DEFAULT_PREFS,
  );
}
