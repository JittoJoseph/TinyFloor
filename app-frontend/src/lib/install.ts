"use client";

import { useSyncExternalStore } from "react";
import { track } from "@/lib/analytics";

/**
 * TinyFloor as an app of its own, the way Chrome and Edge install a site: its
 * own window and icon in the dock, a count on the icon, and notifications
 * that come from it. The browser says when it can (beforeinstallprompt, once
 * a page loads), so this is listening from the first app page on; until then,
 * and once it's installed, there's nothing to offer.
 */

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let waiting: InstallPrompt | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Offered from the menu instead of the browser's own bar.
    event.preventDefault();
    waiting = event as InstallPrompt;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    waiting = null;
    emit();
    track("app_installed");
  });
}

export function useCanInstall(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => waiting !== null,
    () => false,
  );
}

/** The browser's own install dialog; it can be shown once for each page load. */
export async function install() {
  const prompt = waiting;
  if (!prompt) return;
  waiting = null;
  emit();
  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  track("install_prompt", { outcome });
}
