const CACHE_NAME = "tv-tracker-cache-v1";

// Lägg till de viktigaste filerna här
const URLS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/tv_tracker_192.png",
  "./icons/tv_tracker_512.png"
];

// Install: cacha app-skalet
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

// Activate: städa gamla cache-versioner
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
});

// Fetch: försök nätet först, fall tillbaka till cache
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Låt TMDB-anrop gå direkt mot nätet (ingen cache-prio)
  if (request.url.includes("api.themoviedb.org")) {
    return;
  }

  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// --- Notifications (local test via postMessage) ---

self.addEventListener("message", (event) => {
  const data = event?.data;
  if (!data || typeof data !== "object") return;

  if (data.type === "SHOW_NOTIFICATION") {
    const title = data.title || "TV Tracker";
    const body = data.body || "";
    const url = typeof data.url === "string" ? data.url : "";

    const iconUrl = new URL("icons/tv_tracker_192.png", self.registration.scope)
      .toString();

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: iconUrl,
        badge: iconUrl,
        data: { url },
      })
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
    })()
  );
});