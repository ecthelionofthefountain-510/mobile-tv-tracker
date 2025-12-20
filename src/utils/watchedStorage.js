// src/utils/watchedStorage.js
import { get, set } from "idb-keyval";

const WATCHED_KEY = "watched";

function normalizeWatchedItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .filter((it) => it && typeof it === "object")
    .map((it) => {
      const mediaType =
        it.mediaType ||
        (it.seasons ? "tv" : it.first_air_date ? "tv" : "movie");

      const poster = it.poster_path ?? it.posterPath ?? null;

      return {
        ...it,
        mediaType,
        poster_path: poster,
        posterPath: poster,
        completed: !!it.completed,
        dateAdded: it.dateAdded || new Date().toISOString(),
      };
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
  // 1) ALWAYS försök läsa från localStorage först (din gamla logik)
  try {
    const lsValue = localStorage.getItem(WATCHED_KEY);
    if (lsValue) {
      const parsed = JSON.parse(lsValue);
      if (Array.isArray(parsed)) {
        const normalized = normalizeWatchedItems(parsed);
        // Spegla till IndexedDB som backup
        try {
          await set(WATCHED_KEY, normalized);
        } catch (e) {
          console.warn("Could not mirror to IndexedDB", e);
        }
        // Spegla tillbaka till localStorage (så båda håller samma form)
        try {
          localStorage.setItem(WATCHED_KEY, JSON.stringify(normalized));
        } catch (e) {
          console.warn("Could not re-save normalized watched", e);
        }
        return normalized;
      }
    }
  } catch (e) {
    console.warn("Error reading from localStorage", e);
  }

  // 2) Fallback: om localStorage är tomt → kolla om det finns en backup i IndexedDB
  try {
    const fromIdb = await get(WATCHED_KEY);
    if (Array.isArray(fromIdb)) {
      const normalized = normalizeWatchedItems(fromIdb);
      // Spegla tillbaka till localStorage
      localStorage.setItem(WATCHED_KEY, JSON.stringify(normalized));
      // Spegla tillbaka till IndexedDB om normalisering ändrade form
      try {
        await set(WATCHED_KEY, normalized);
      } catch (e) {
        console.warn("Could not re-save normalized watched to IndexedDB", e);
      }
      return normalized;
    }
  } catch (e) {
    console.warn("Error reading from IndexedDB", e);
  }

  // 3) Inget hittat någonstans
  return [];
}

// Spara hela watched-listan
export async function saveWatchedAll(items) {
  try {
    // Skriv som innan (så din Add to watched-kod fortfarande "passar in")
    localStorage.setItem(WATCHED_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn("Could not save to localStorage", e);
  }

  try {
    // Spegla till IndexedDB som backup
    await set(WATCHED_KEY, items);
  } catch (e) {
    console.warn("Could not save to IndexedDB", e);
  }
}
