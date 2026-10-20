"use client";

import { VAPID_PUBLIC_KEY, type PushSubscriptionJson } from "@shared/push";
import { api } from "@/lib/api";

/**
 * Reaching this browser when TinyFloor is closed (docs/product.md): a
 * service worker (public/sw.js) that shows what the chat sends while no tab
 * is open, and a subscription the API keeps with this session. It follows the
 * notifications switch: on (and allowed) subscribes, off unsubscribes, and
 * signing out ends it on the server's side.
 */

const supported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

const keyBytes = (() => {
  let bytes: Uint8Array<ArrayBuffer> | null = null;
  return () => {
    if (!bytes) {
      const binary = atob(VAPID_PUBLIC_KEY.replace(/-/g, "+").replace(/_/g, "/"));
      bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    }
    return bytes;
  };
})();

const sameKey = (subscription: PushSubscription) => {
  const key = subscription.options.applicationServerKey;
  if (!key) return false;
  const have = new Uint8Array(key);
  const want = keyBytes();
  return have.length === want.length && have.every((byte, index) => byte === want[index]);
};

/** Once a page load is enough: it binds this browser to the session signed in now. */
let synced: Promise<void> | null = null;

/** Subscribes this browser (if it isn't already) and tells the API. */
export function startPush(): Promise<void> {
  if (!supported() || Notification.permission !== "granted") return Promise.resolve();
  synced ??= (async () => {
    const registration = await navigator.serviceWorker.register("/sw.js");
    let subscription = await registration.pushManager.getSubscription();
    // Made with another key (it was changed): start over with this one.
    if (subscription && !sameKey(subscription)) {
      await subscription.unsubscribe();
      subscription = null;
    }
    subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes() });
    await api.savePush(subscription.toJSON() as PushSubscriptionJson);
  })().catch((error: unknown) => {
    synced = null;
    console.warn("push: couldn't subscribe", error);
  });
  return synced;
}

/** Stops pushes to this browser: notifications were switched off. */
export async function stopPush(): Promise<void> {
  synced = null;
  if (!supported()) return;
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await api.dropPush(subscription.endpoint).catch(() => {});
  await subscription.unsubscribe().catch(() => {});
}

/**
 * A notification clicked while a TinyFloor window is open: the service worker
 * asks that window to go to the conversation. Inside an office the app moves
 * without reloading (onOpenFromPush); anywhere else the page goes there.
 */
let opener = (path: string) => location.assign(path);

if (supported()) {
  navigator.serviceWorker.addEventListener("message", (event: MessageEvent<{ type?: string; url?: string }>) => {
    if (event.data?.type !== "open" || !event.data.url) return;
    const url = new URL(event.data.url, location.origin);
    if (url.origin === location.origin) opener(`${url.pathname}${url.search}`);
  });
  navigator.serviceWorker.startMessages();
}

export function onOpenFromPush(open: (path: string) => void): () => void {
  const before = opener;
  opener = open;
  return () => {
    opener = before;
  };
}
