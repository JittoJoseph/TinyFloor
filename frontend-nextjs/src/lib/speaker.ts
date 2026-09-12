"use client";

const KEY = "spacialMeetSpeakerMuted";

type Listener = (muted: boolean) => void;

const listeners = new Set<Listener>();

function load(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

let muted = typeof window === "undefined" ? false : load();

/**
 * One switch for everything the room plays out loud: call audio, the room's
 * music and the notification sounds. It survives reloads, so a muted tab stays
 * quiet when you come back.
 */
export function isSpeakerMuted(): boolean {
  return muted;
}

export function setSpeakerMuted(next: boolean) {
  if (next === muted) return;
  muted = next;
  try {
    if (next) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {}
  listeners.forEach((listener) => listener(next));
}

export function onSpeakerChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
