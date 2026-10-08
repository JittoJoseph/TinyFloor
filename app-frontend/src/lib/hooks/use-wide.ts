"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(min-width: 768px)";

/** Whether the rail is beside the view (a desktop) or along the bottom (a phone). */
export function useWide(): boolean {
  return useSyncExternalStore(
    (listener) => {
      const media = matchMedia(QUERY);
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    },
    () => matchMedia(QUERY).matches,
    () => true,
  );
}
