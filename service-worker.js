/* ALFIK service worker: PWA foundation and push display. */
"use strict";

self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", event => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = typeof payload.title === "string" ? payload.title : "ALFIK update";
  const body = typeof payload.body === "string" ? payload.body : "You have a new update in ALFIK.";
  const url = typeof payload.url === "string" && payload.url.startsWith("/") ? payload.url : "/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/Screenshot_20261021_113202_Gallery.jpg",
      badge: "/Screenshot_20261021_113202_Gallery.jpg",
      data: { url }
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = event.notification && event.notification.data && event.notification.data.url;
  const target = typeof url === "string" && url.startsWith("/") ? url : "/";
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if ("focus" in client) {
        await client.focus();
        if ("navigate" in client) await client.navigate(target);
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
