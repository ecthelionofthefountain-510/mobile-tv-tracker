// src/utils/favoritesStorage.js

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

export function loadFavorites(user = getCurrentUser()) {
  const scopedKey = favoritesKeyForUser(user);

  const scoped = safeJsonParse(localStorage.getItem(scopedKey), null);
  if (Array.isArray(scoped)) {
    const normalized = scoped
      .filter((x) => x && typeof x === "object")
      .map((x) => ({
        ...x,
        mediaType: x.mediaType || (x.first_air_date ? "tv" : "movie"),
      }));

    try {
      localStorage.setItem(scopedKey, JSON.stringify(normalized));
    } catch {
      // ignore
    }

    return normalized;
  }

  // Migration: if we have a user but only legacy global favorites exists
  if (user) {
    const legacy = safeJsonParse(
      localStorage.getItem(FAVORITES_BASE_KEY),
      null
    );
    if (Array.isArray(legacy) && legacy.length > 0) {
      const normalized = legacy
        .filter((x) => x && typeof x === "object")
        .map((x) => ({
          ...x,
          mediaType: x.mediaType || (x.first_air_date ? "tv" : "movie"),
        }));
      try {
        localStorage.setItem(scopedKey, JSON.stringify(normalized));
      } catch {
        // ignore
      }
      return normalized;
    }
  }

  return [];
}

export function saveFavorites(items, user = getCurrentUser()) {
  const scopedKey = favoritesKeyForUser(user);
  const next = Array.isArray(items) ? items : [];
  localStorage.setItem(scopedKey, JSON.stringify(next));
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
