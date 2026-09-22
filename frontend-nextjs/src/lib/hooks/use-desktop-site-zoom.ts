"use client";

import { useLayoutEffect } from "react";
import { desktopSiteScale } from "@/lib/touch";

/**
 * Undoes a phone's "Desktop site" shrink while the app is on screen, by
 * zooming the page back up to the phone's own size. The layout stays the
 * desktop one the person asked for; it is just drawn big enough to read and
 * to tap. Set before the floor measures itself, and again as the phone turns.
 */
export function useDesktopSiteZoom() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const scale = desktopSiteScale();
      root.style.zoom = scale === 1 ? "" : String(scale);
    };
    apply();
    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("resize", apply);
      root.style.zoom = "";
    };
  }, []);
}
