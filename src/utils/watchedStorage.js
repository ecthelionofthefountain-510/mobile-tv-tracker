// src/utils/watchedStorage.js
import { get, set } from "idb-keyval";

const WATCHED_KEY = "watched";

const ALLOWED_BASE_KEYS = [
  "id",
  "mediaType",
  "title",
  "name",
  "poster_path",
  "posterPath",
  "backdrop_path",
  "backdropPath",
  "overview",
  "genre_ids",
  "genres",
  "vote_average",
  "popularity",
  "release_date",
  "first_air_date",
  "number_of_seasons",
  "number_of_episodes",
  "seasons",
  "completed",
  "dateAdded",
];

function pick(obj, keys) {
  const out = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) out[key] = obj[key];
  }
  return out;
}

function normalizeWatchedItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .filter((it) => it && typeof it === "object")
    .map((it) => {
      const normalizedId =
        typeof it.id === "string" && /^\d+$/.test(it.id)
          ? Number(it.id)
          : it.id;

      const mediaType =
        it.mediaType ||
        (it.seasons && !Array.isArray(it.seasons)
          ? "tv"
          : it.first_air_date
          ? "tv"
          : "movie");

      const poster = it.poster_path ?? it.posterPath ?? null;

      const backdrop = it.backdrop_path ?? it.backdropPath ?? null;

      // Pruna bort tunga TMDB-fält (credits/videos/etc)
      const pruned = pick(it, ALLOWED_BASE_KEYS);

      let normalizedItem = {
        ...pruned,
        id: normalizedId,
        mediaType,
        poster_path: poster,
        posterPath: poster,
        backdrop_path: backdrop,
        backdropPath: backdrop,
        completed: !!it.completed,
        dateAdded: it.dateAdded || new Date().toISOString(),
      };

      // TV: om `seasons` råkar vara TMDB:s seasons-array (metadata), byt till progress-struktur
      // så att watchedEpisodes kan sparas och överleva reload.
      if (mediaType === "tv" && Array.isArray(it.seasons)) {
        const seasonsCount =
          (typeof it.number_of_seasons === "number" && it.number_of_seasons > 0
            ? it.number_of_seasons
            : it.seasons.length) || 0;

        const progress = {};
        for (let i = 1; i <= seasonsCount; i++) {
          progress[i] = { watchedEpisodes: [] };
        }

        normalizedItem = {
          ...normalizedItem,
          tmdbSeasons: it.seasons,
          seasons: progress,
          number_of_seasons: seasonsCount,
        };
      }

      // TV: säkerställ progress-struktur om seasons saknas eller är fel typ
      if (
        mediaType === "tv" &&
        (!normalizedItem.seasons || Array.isArray(normalizedItem.seasons))
      ) {
        const seasonsCount =
          typeof normalizedItem.number_of_seasons === "number" &&
          normalizedItem.number_of_seasons > 0
            ? normalizedItem.number_of_seasons
            : 0;
        const progress = {};
        for (let i = 1; i <= seasonsCount; i++) {
          progress[i] = { watchedEpisodes: [] };
        }
        normalizedItem = {
          ...normalizedItem,
          seasons: progress,
        };
      }

      return normalizedItem;
    });
}

// Valfritt, men kan få browsern att hålla datan längre
export async function ensurePersistentStorage() {
  if (navigator.storage?.persist) {
    try {
      await navigator.storage.persist();
    } catch (e) {
      console.warn("Could not request persistent storage", e);
    }
  }
}

// Läs ALL watched-lista (filmer + serier)
export async function loadWatchedAll() {
  // 1) Primär källa: IndexedDB (större kapacitet + mer pålitlig vid stora listor)
  try {
    const fromIdb = await get(WATCHED_KEY);
    if (Array.isArray(fromIdb)) {
      return normalizeWatchedItems(fromIdb);
    }
  } catch (e) {
    console.warn("Error reading from IndexedDB", e);
  }

  // 2) Fallback: localStorage (snabbt, men kan vara begränsat i storlek)
  try {
    const lsValue = localStorage.getItem(WATCHED_KEY);
    if (lsValue) {
      const parsed = JSON.parse(lsValue);
      if (Array.isArray(parsed)) {
        return normalizeWatchedItems(parsed);
      }
    }
  } catch (e) {
    console.warn("Error reading from localStorage", e);
  }

  // 3) Inget hittat någonstans
  return [];
}

// Spara hela watched-listan
export async function saveWatchedAll(items) {
  const normalized = normalizeWatchedItems(items);

  try {
    // Primärt: IndexedDB
    await set(WATCHED_KEY, normalized);
  } catch (e) {
    console.warn("Could not save to IndexedDB", e);
  }

  try {
    // Sekundärt: localStorage (kan faila vid stora listor)
    localStorage.setItem(WATCHED_KEY, JSON.stringify(normalized));
  } catch (e) {
    console.warn("Could not save to localStorage", e);
    // Viktigt: rensa så vi inte råkar läsa gammalt/stale från localStorage och skriva över IDB senare
    try {
      localStorage.removeItem(WATCHED_KEY);
    } catch (_) {
      // ignore
    }
  }
}
