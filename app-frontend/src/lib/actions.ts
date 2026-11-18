"use client";

import { useSyncExternalStore } from "react";

/**
 * What you can do where you stand on the floor: sit on the chair beside you,
 * stand up, open the whiteboard. The scene offers the nearest (GameScene), and
 * E or a press on its hint does it (FloorHint). The hint shows whenever
 * there's something at hand, however often you've done it.
 */
export type FloorAction = "sit" | "stand" | "draw";

export interface ActionAt {
  action: FloorAction;
  /** From you, in world pixels: the nearest of several wins. */
  distance: number;
  run: () => void;
}

let current: ActionAt | null = null;
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

/** The action at hand, or null when there's nothing to do where you stand. */
export function useActionHint(): FloorAction | null {
  return useSyncExternalStore(
    subscribe,
    () => current?.action ?? null,
    () => null,
  );
}
