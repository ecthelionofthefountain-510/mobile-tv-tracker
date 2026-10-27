// src/utils/widgetSyncPayload.js
//
// Builds the minimal profile payload we POST to /api/widget/profile-sync.
//
// The widget server only needs enough to (1) tell TV items apart, (2) detect
// in-progress shows, and (3) look everything else up on TMDb by id. It reads
// just: id, mediaType/first_air_date, title/name, and — for shows — the
// `seasons` progress object, `number_of_episodes` and `completed`. Fields like
// overview, genres, posters and backdrops are dead weight that can push the
// request past the server's 200kb body limit for large libraries, making the
// sync fail silently. Prune to the minimal shape before sending.

function resolveMediaType(item) {
  return item.mediaType || (item.first_air_date ? "tv" : "movie");
}

// Keep only { [seasonNumber]: { watchedEpisodes: number[] } } so metadata such
// as a raw TMDb seasons array (`tmdbSeasons`) never rides along.
function pruneSeasons(seasons) {
  if (!seasons || typeof seasons !== "object" || Array.isArray(seasons)) {
    return {};
  }
  const out = {};
  for (const [key, season] of Object.entries(seasons)) {
    out[key] = {
      watchedEpisodes: Array.isArray(season?.watchedEpisodes)
        ? season.watchedEpisodes
        : [],
    };
  }
  return out;
}

function pruneFavorite(item) {
  return {
    id: item.id,
    mediaType: resolveMediaType(item),
    title: item.title || item.name || "",
  };
}

function pruneWatched(item) {
  const mediaType = resolveMediaType(item);
  const base = {
    id: item.id,
    mediaType,
    title: item.title || item.name || "",
  };

  // Only shows carry progress; movies are ignored by the widget's upcoming
  // logic, so a tiny base entry is enough.
  if (mediaType !== "tv") return base;

  const next = {
    ...base,
    completed: !!item.completed,
    seasons: pruneSeasons(item.seasons),
  };

  if (typeof item.number_of_episodes === "number") {
    next.number_of_episodes = item.number_of_episodes;
  }

  return next;
}

export function buildWidgetSyncPayload(favorites, watched) {
  return {
    favorites: (Array.isArray(favorites) ? favorites : [])
      .filter((item) => item && typeof item === "object" && item.id != null)
      .map(pruneFavorite),
    watched: (Array.isArray(watched) ? watched : [])
      .filter((item) => item && typeof item === "object" && item.id != null)
      .map(pruneWatched),
  };
}
