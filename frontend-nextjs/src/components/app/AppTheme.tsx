"use client";

import { useLayoutEffect } from "react";
import { applyTheme, clearTheme } from "@/lib/theme";

/**
 * Keeps the app's theme on <html> while an app route is on screen. The inline
 * script covers the first load; this covers arriving from a landing page by a
 * client-side navigation, and leaving again.
 */
export function AppTheme() {
  useLayoutEffect(() => {
    applyTheme();
    return clearTheme;
  }, []);
  return null;
}
