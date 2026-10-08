"use client";

import { useLayoutEffect } from "react";
import { applyTheme, clearTheme } from "@/lib/theme";

/**
 * The home page wears the app's theme (light, dark or the system's). The
 * script in the root layout sets it before first paint; this keeps it right
 * when arriving by client-side navigation and takes it off when leaving for a
 * landing page that has not moved to the new look yet. Unlike AppTheme it
 * brings no animation library, so the home page stays light.
 */
export function SiteTheme() {
  useLayoutEffect(() => {
    applyTheme();
    return clearTheme;
  }, []);
  return null;
}
