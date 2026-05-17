/// <reference lib="webworker" />
import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";

declare const self: ServiceWorkerGlobalScope;

// Precache all assets (injected at build time)
precacheAndRoute(self.__WB_MANIFEST);

// Runtime caching for API routes (matching existing behavior)
registerRoute(
  /\/(api|event|session|file|find|config|agent|command|global)\/.*/,
  new NetworkFirst({
    networkTimeoutSeconds: 3,
    cacheName: "api-cache",
  }),
);

// Handle push events
self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;

  try {
    const payload = event.data.json() as {
      title?: string;
      body?: string;
      data?: Record<string, unknown>;
    };

    const title = payload.title ?? "Pilot";
    const options: NotificationOptions = {
      body: payload.body ?? "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: payload.data ?? {},
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
    // Silent fail if payload is not valid JSON
  }
});

// Handle notification click — navigate to session if sessionId provided
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();

  const data = event.notification.data as { sessionId?: string } | undefined;
  const url = data?.sessionId ? `/chat/${data.sessionId}` : "/";

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          const focusedClient = await client.focus();
          await focusedClient.navigate(url);
          return;
        }
      }

      // Open new window
      await self.clients.openWindow(url);
    })(),
  );
});
