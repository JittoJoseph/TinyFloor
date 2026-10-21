"use client";

import { useSyncExternalStore } from "react";

/**
 * What you can do where you stand on the floor: sit on the chair beside you,
 * stand up, open the whiteboard. The scene offers the nearest (GameScene), E
 * or a press on its hint does it (ActionHint), and the hint shows until you've
 * done that once, in this browser.
 */
export type FloorAction = "sit" | "stand" | "draw";

export interface ActionAt {
  action: FloorAction;
  /** From you, in world pixels: the nearest of several wins. */
  distance: number;
  run: () => void;
}

const LEARNED_KEY = "tinyfloorLearned";

let current: ActionAt | null = null;
let learnt: ReadonlySet<FloorAction> | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const changed = () => listeners.forEach((listener) => listener());

/** The scene, every frame: what's at hand now. Only a different action is news. */
export function offerAction(next: ActionAt | null) {
  const news = next?.action !== current?.action;
  current = next;
  if (news) changed();
}

/** E, or a press on the hint. */
export function doAction() {
  current?.run();
}

function known(): ReadonlySet<FloorAction> {
  if (!learnt) {
    try {
      learnt = new Set(JSON.parse(localStorage.getItem(LEARNED_KEY) ?? "[]") as FloorAction[]);
    } catch {
      learnt = new Set();
    }
  }
  return learnt;
}

/** Done once, by any way (E, the hint, a click on the chair), so its hint is no longer needed. */
export function learned(action: FloorAction) {
  if (known().has(action)) return;
  learnt = new Set([...known(), action]);
  try {
    localStorage.setItem(LEARNED_KEY, JSON.stringify([...learnt]));
  } catch {}
  changed();
}

/** The action at hand while it still needs saying; null once you know it. */
export function useActionHint(): FloorAction | null {
  return useSyncExternalStore(
    subscribe,
    () => (current && !known().has(current.action) ? current.action : null),
    () => null,
  );
}
