const CACHE_NAME = "tv-tracker-cache-v3";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/tv_tracker_192.png",
  "./icons/tv_tracker_512.png",
];

// Install: cacha app-skalet och ta över direkt utan att vänta på gamla SW
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  // Aktivera ny SW omedelbart – utan skipWaiting väntar Brave tills alla
  // flikar stängs, vilket kan trigga avinstallation av PWA:n.
  self.skipWaiting();
});

// Activate: städa gamla cache-versioner och ta kontroll över alla klienter
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Fetch: navigeringsförfrågningar servas från cache (SPA-fallback),
// övriga resurser network-first med cache-fallback.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // TMDB API och bilder – alltid direkt mot nätet, aldrig via cache här
  if (
    url.hostname === "api.themoviedb.org" ||
    url.hostname === "image.tmdb.org"
  ) {
    return;
  }

  // Navigeringsförfrågningar (sidladdning/reload) → app-skalet från cache.
  // Utan detta kan Brave misslyckas att ladda appen och registrera det som
  // trasigt, vilket leder till att PWA-installationen rensas.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches
          .open(CACHE_NAME)
          .then((cache) => cache.match("./index.html") || cache.match("./")),
      ),
    );
    return;
  }

  // Alla andra förfrågningar: network-first, faller tillbaka till cache
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

// --- Notifications (local test via postMessage) ---

self.addEventListener("message", (event) => {
  const data = event?.data;
  if (!data || typeof data !== "object") return;

  if (data.type === "SHOW_NOTIFICATION") {
    const title = data.title || "TV Tracker";
    const body = data.body || "";
    const url = typeof data.url === "string" ? data.url : "";

    const iconUrl = new URL(
      "icons/tv_tracker_192.png",
      self.registration.scope,
    ).toString();

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: iconUrl,
        badge: iconUrl,
        data: { url },
      }),
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification?.close?.();

  const targetUrl = event?.notification?.data?.url;
  const url =
    typeof targetUrl === "string" && targetUrl
      ? new URL(targetUrl, self.registration.scope).toString()
      : self.registration.scope;

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of allClients) {
        try {
          if (client.url && client.url.startsWith(self.registration.scope)) {
            await client.focus();
            client.navigate?.(url);
            return;
          }
        } catch {
          // ignore
        }
      }

      await clients.openWindow(url);
    })(),
  );
});
