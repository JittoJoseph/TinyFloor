"use client";

import { useSyncExternalStore } from "react";
import { prefs } from "./prefs";

/**
 * Desktop notifications, for what's meant for you while TinyFloor is open in
 * another window: a direct message, a mention, a call, a wave (docs/product.md).
 * Only while you're looking elsewhere; in front of it, the sound and the
 * floor's own nudges say it. The browser asks once, when you turn them on,
 * never on arrival.
 */

export type Permission = NotificationPermission | "unsupported";

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
let watching = false;

function permission(): Permission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/** Allowed or blocked from the site's settings (the icon by the address) counts too. */
function watch() {
  if (watching) return;
  watching = true;
  navigator.permissions
    ?.query({ name: "notifications" })
    .then((status) => status.addEventListener("change", emit))
    .catch(() => {});
}

export function useNotifyPermission(): Permission {
  return useSyncExternalStore(
    (listener) => {
      watch();
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    permission,
    () => "unsupported",
  );
}

/** Asks the browser, once: what it says can only be changed in the site's settings after. */
export async function askToNotify(): Promise<Permission> {
  if (permission() === "default") {
    try {
      await Notification.requestPermission();
    } catch {
      // Older browsers take a callback; they're not worth a second path.
    }
    emit();
  }
  return permission();
}

/** Whether TinyFloor is the window you're in. */
const looking = () => document.visibilityState === "visible" && document.hasFocus();

/**
 * Shows one, if you're elsewhere and want them; returns how to take it back
 * (a call that's been answered). One `tag` replaces the last with that tag,
 * so a run of messages from one person is one notification, and two tabs on
 * the same office show it once.
 */
export function notify({
  title,
  body,
  tag,
  sticky = false,
  onClick,
}: {
  title: string;
  body?: string;
  tag: string;
  /** Stays until it's acted on: a call. */
  sticky?: boolean;
  onClick?: () => void;
}): (() => void) | undefined {
  if (permission() !== "granted" || !prefs().desktopNotifications || looking()) return;
  try {
    // Silent: the app's own sounds already play, and follow your settings.
    const shown = new Notification(title, { body, tag, icon: "/icon-192.png", requireInteraction: sticky, silent: true });
    shown.onclick = () => {
      window.focus();
      shown.close();
      onClick?.();
    };
    return () => shown.close();
  } catch {
    // Phones only show them through a service worker; there, the app's own sounds do.
    return;
  }
}

/** The count on the installed app's icon, the way the tab's title has it. */
export function setBadge(count: number) {
  if (typeof navigator === "undefined" || !("setAppBadge" in navigator)) return;
  (count ? navigator.setAppBadge(count) : navigator.clearAppBadge()).catch(() => {});
}
