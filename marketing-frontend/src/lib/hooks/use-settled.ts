"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether the page has loaded and the browser has had a quiet moment since.
 * What isn't on screen when a page opens (a menu, a tab behind another) waits
 * for it, so the page arrives with less to draw and less to wake up, and it is
 * all there well before anyone reaches for it. Once true, it stays true for
 * every page after.
 */
export function useSettled() {
  return useSyncExternalStore(subscribe, () => settled, () => false);
}

let settled = false;
let scheduled = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!settled && !scheduled) {
    scheduled = true;
    const settle = () => {
      settled = true;
      for (const one of listeners) one();
    };
    const whenQuiet = () =>
      "requestIdleCallback" in window ? requestIdleCallback(settle, { timeout: 1500 }) : setTimeout(settle, 200);
    if (document.readyState === "complete") whenQuiet();
    else window.addEventListener("load", whenQuiet, { once: true });
  }
  return () => listeners.delete(listener);
}
