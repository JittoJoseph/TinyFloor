"use client";

import { useLayoutEffect, type ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { applyTheme, clearTheme } from "@/lib/theme";
import { usePrefs } from "@/lib/prefs";

/**
 * Keeps the app's theme on <html> while an app route is on screen, and its
 * motion as your settings ask. The root layout's script covers the first
 * load; this covers arriving from a landing page, and leaving again.
 */
export function AppTheme({ children }: { children?: ReactNode }) {
  const { reduceMotion } = usePrefs();
  useLayoutEffect(() => {
    applyTheme();
    return clearTheme;
  }, []);
  return <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>{children}</MotionConfig>;
}
