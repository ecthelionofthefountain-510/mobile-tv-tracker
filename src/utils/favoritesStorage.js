// src/utils/favoritesStorage.js

import { del, get, set } from "idb-keyval";

const FAVORITES_BASE_KEY = "favorites";

function safeJsonParse(value, fallback) {
  if (value == null) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function getCurrentUser() {
  const raw = localStorage.getItem("currentUser");
  if (!raw) return null;

  // currentUser is typically stored as JSON string (e.g. "Alice")
  const parsed = safeJsonParse(raw, null);
  if (typeof parsed === "string" && parsed.trim()) return parsed;

  // fallback: if someone stored it as plain text
  if (typeof raw === "string" && raw.trim() && raw !== "null") return raw;

  return null;
}

export function favoritesKeyForUser(user = getCurrentUser()) {
  return user ? `${FAVORITES_BASE_KEY}_${user}` : FAVORITES_BASE_KEY;
}

const ALLOWED_FAVORITE_KEYS = [
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
  "dateAdded",
];

function pick(obj, keys) {
  const out = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) out[key] = obj[key];
  }
  return out;
}

function normalizeFavoritesItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .filter((x) => x && typeof x === "object")
    .map((x) => {
      const normalizedId =
        typeof x.id === "string" && /^\d+$/.test(x.id) ? Number(x.id) : x.id;

      const mediaType = x.mediaType || (x.first_air_date ? "tv" : "movie");
      const poster = x.poster_path ?? x.posterPath ?? null;
      const backdrop = x.backdrop_path ?? x.backdropPath ?? null;

      const pruned = pick(x, ALLOWED_FAVORITE_KEYS);

      return {
        ...pruned,
        id: normalizedId,
        mediaType,
        poster_path: poster,
        posterPath: poster,
        backdrop_path: backdrop,
        backdropPath: backdrop,
        dateAdded: x.dateAdded || new Date().toISOString(),
      };
    })
    .filter((x) => x && x.id != null);
}

// Valfritt, men kan få browsern att hålla datan längre (särskilt på mobile)
export async function ensurePersistentFavoritesStorage() {
  if (navigator.storage?.persist) {
    try {
      await navigator.storage.persist();
    } catch (e) {
      console.warn("Could not request persistent storage", e);
    }
  }
}

export async function loadFavorites(user = getCurrentUser()) {
  const scopedKey = favoritesKeyForUser(user);
  const legacyKey = FAVORITES_BASE_KEY;

  // 1) Primärt: IndexedDB
  try {
    const fromIdb = await get(scopedKey);
    if (Array.isArray(fromIdb)) {
      return normalizeFavoritesItems(fromIdb);
    }

    // Migration: legacy global favorites -> per user
    if (user) {
      const legacyFromIdb = await get(legacyKey);
      if (Array.isArray(legacyFromIdb) && legacyFromIdb.length > 0) {
        const normalized = normalizeFavoritesItems(legacyFromIdb);
        try {
          await set(scopedKey, normalized);
        } catch {
          // ignore
        }
        return normalized;
      }
    }
  } catch (e) {
    console.warn("Error reading favorites from IndexedDB", e);
  }

  // 2) Fallback: localStorage
  try {
    const scopedParsed = safeJsonParse(localStorage.getItem(scopedKey), null);
    if (Array.isArray(scopedParsed)) {
      const normalized = normalizeFavoritesItems(scopedParsed);
      try {
        await set(scopedKey, normalized);
      } catch {
        // ignore
      }
      try {
        localStorage.setItem(scopedKey, JSON.stringify(normalized));
      } catch {
        // ignore
      }
      return normalized;
    }

    if (user) {
      const legacyParsed = safeJsonParse(localStorage.getItem(legacyKey), null);
      if (Array.isArray(legacyParsed) && legacyParsed.length > 0) {
        const normalized = normalizeFavoritesItems(legacyParsed);
        try {
          await set(scopedKey, normalized);
        } catch {
          // ignore
        }
        try {
          localStorage.setItem(scopedKey, JSON.stringify(normalized));
        } catch {
          // ignore
        }
        return normalized;
      }
    }
  } catch (e) {
    console.warn("Error reading favorites from localStorage", e);
  }

  return [];
}

export async function saveFavorites(items, user = getCurrentUser()) {
  const scopedKey = favoritesKeyForUser(user);
  const normalized = normalizeFavoritesItems(items);
  let ok = false;

  try {
    await set(scopedKey, normalized);
    ok = true;
  } catch (e) {
    console.warn("Could not save favorites to IndexedDB", e);
  }

  try {
    localStorage.setItem(scopedKey, JSON.stringify(normalized));
    ok = true;
  } catch (e) {
    console.warn("Could not save favorites to localStorage", e);
    try {
      localStorage.removeItem(scopedKey);
    } catch {
      // ignore
    }
  }

  return ok;
}

export async function clearFavorites(user = getCurrentUser()) {
  const scopedKey = favoritesKeyForUser(user);
  try {
    await del(scopedKey);
  } catch {
    // ignore
  }
  try {
    localStorage.removeItem(scopedKey);
  } catch {
    // ignore
  }
}

export function favoriteIdentity(item) {
  if (!item) return null;
  const mediaType = item.mediaType || (item.first_air_date ? "tv" : "movie");
  if (item.id == null) return null;
  return `${mediaType}:${String(item.id)}`;
}

export function sameFavorite(a, b) {
  return (
    favoriteIdentity(a) != null && favoriteIdentity(a) === favoriteIdentity(b)
  );
}
