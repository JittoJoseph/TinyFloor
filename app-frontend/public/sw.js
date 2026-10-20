// TinyFloor's service worker, for push notifications only (lib/push.ts). It
// caches nothing and answers no requests, so the app always loads as deployed.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// A direct message or a mention, sent while TinyFloor was closed
// (worker-realtime's push.ts): { title, body, tag, url }.
self.addEventListener("push", (event) => {
  let data;
  try {
    data = event.data.json();
  } catch {
    return;
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
      icon: "/icon-192.png",
      data: { url: data.url },
    }),
  );
});

// Clicked: a TinyFloor window that's open goes there without reloading (and
// leaving a call); otherwise a new one opens at the conversation.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url ?? "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((client) => client.focused) ?? windows[0];
      if (open) {
        await open.focus();
        open.postMessage({ type: "open", url });
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
