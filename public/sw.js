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