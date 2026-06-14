// src/utils/favoritesStorage.js

import { del, get, keys as idbKeys, set } from "idb-keyval";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

const FAVORITES_BASE_KEY = "favorites";
const FAVORITES_TABLE = "favorites";

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

async function loadFavoritesLocal(user = getCurrentUser()) {
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

async function saveFavoritesLocal(items, user = getCurrentUser()) {
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

async function clearFavoritesLocal(user = getCurrentUser()) {
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

// ---------------------------------------------------------------------------
// Cloud (Supabase) layer
// ---------------------------------------------------------------------------

async function getAuthUserId() {
  if (!isSupabaseConfigured) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id || null;
  } catch {
    return null;
  }
}

function itemKeyParts(item) {
  const mediaType =
    item.mediaType || (item.first_air_date ? "tv" : "movie");
  return { mediaType, itemId: String(item.id) };
}

function toRow(uid, item) {
  const { mediaType, itemId } = itemKeyParts(item);
  return {
    user_id: uid,
    media_type: mediaType,
    item_id: itemId,
    data: item,
    updated_at: new Date().toISOString(),
  };
}

async function loadFavoritesFromCloud(uid) {
  const { data, error } = await supabase
    .from(FAVORITES_TABLE)
    .select("data")
    .eq("user_id", uid);
  if (error) throw error;
  return normalizeFavoritesItems((data || []).map((row) => row.data));
}

async function upsertFavoritesToCloud(uid, items) {
  const rows = items.map((item) => toRow(uid, item));
  if (!rows.length) return;
  const { error } = await supabase
    .from(FAVORITES_TABLE)
    .upsert(rows, { onConflict: "user_id,media_type,item_id" });
  if (error) throw error;
}

async function saveFavoritesToCloud(uid, items) {
  await upsertFavoritesToCloud(uid, items);

  const { data: existing, error } = await supabase
    .from(FAVORITES_TABLE)
    .select("media_type,item_id")
    .eq("user_id", uid);
  if (error) throw error;

  const keep = new Set(
    items.map((item) => {
      const { mediaType, itemId } = itemKeyParts(item);
      return `${mediaType}:${itemId}`;
    }),
  );
  const toDelete = (existing || []).filter(
    (row) => !keep.has(`${row.media_type}:${row.item_id}`),
  );

  await Promise.all(
    toDelete.map((row) =>
      supabase
        .from(FAVORITES_TABLE)
        .delete()
        .match({
          user_id: uid,
          media_type: row.media_type,
          item_id: row.item_id,
        }),
    ),
  );
}

async function migrateLocalFavoritesIfNeeded(uid, user) {
  const flagKey = `cloudFavoritesMigrated_${uid}`;
  try {
    if (localStorage.getItem(flagKey)) return;
  } catch {
    // ignore
  }

  const local = await loadFavoritesLocal(user);
  if (local.length) {
    await upsertFavoritesToCloud(uid, local);
  }

  try {
    localStorage.setItem(flagKey, "1");
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Public API — same signatures as before, now cloud-backed when signed in.
// ---------------------------------------------------------------------------

export async function loadFavorites(user = getCurrentUser()) {
  const uid = await getAuthUserId();

  if (uid) {
    try {
      await migrateLocalFavoritesIfNeeded(uid, user);
      const items = await loadFavoritesFromCloud(uid);

      // Safeguard: never let an empty cloud result shadow non-empty local
      // data. If the cloud is empty but this device still has favorites, push
      // them up (union) and use them instead of overwriting the local cache.
      if (items.length === 0) {
        const local = await loadFavoritesLocal(user);
        if (local.length > 0) {
          await upsertFavoritesToCloud(uid, local);
          return local;
        }
      }

      try {
        await saveFavoritesLocal(items, user);
      } catch {
        // ignore
      }
      return items;
    } catch (e) {
      console.warn("Cloud favorites load failed, using local copy", e);
    }
  }

  return loadFavoritesLocal(user);
}

export async function saveFavorites(items, user = getCurrentUser()) {
  const ok = await saveFavoritesLocal(items, user);

  const uid = await getAuthUserId();
  if (uid) {
    try {
      await saveFavoritesToCloud(uid, normalizeFavoritesItems(items));
    } catch (e) {
      console.warn("Cloud favorites save failed (kept local copy)", e);
    }
  }

  return ok;
}

export async function clearFavorites(user = getCurrentUser()) {
  await clearFavoritesLocal(user);

  const uid = await getAuthUserId();
  if (uid) {
    try {
      const { error } = await supabase
        .from(FAVORITES_TABLE)
        .delete()
        .eq("user_id", uid);
      if (error) throw error;
    } catch (e) {
      console.warn("Cloud favorites clear failed", e);
    }
  }
}

// Rescue tool: scan EVERY favorites key on this device (IndexedDB +
// localStorage, including legacy/global and other-username scoped keys),
// union everything found, and push it up to the cloud. Never deletes. Use to
// recover favorites that an earlier migration missed.
export async function recoverFavoritesFromDevice(user = getCurrentUser()) {
  const uid = await getAuthUserId();
  if (!uid) return { ok: false, error: "Not signed in." };

  const collected = [];

  // localStorage: any "favorites" / "favorites_<user>" key.
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(FAVORITES_BASE_KEY)) continue;
      const parsed = safeJsonParse(localStorage.getItem(key), null);
      if (Array.isArray(parsed)) collected.push(...parsed);
    }
  } catch {
    // ignore
  }

  // IndexedDB (idb-keyval): any "favorites*" key.
  try {
    const allKeys = await idbKeys();
    for (const key of allKeys) {
      if (typeof key !== "string" || !key.startsWith(FAVORITES_BASE_KEY)) {
        continue;
      }
      const val = await get(key);
      if (Array.isArray(val)) collected.push(...val);
    }
  } catch {
    // ignore
  }

  // Normalize + dedupe by identity.
  const seen = new Set();
  const unique = [];
  for (const item of normalizeFavoritesItems(collected)) {
    const id = favoriteIdentity(item);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    unique.push(item);
  }

  if (unique.length === 0) return { ok: true, recovered: 0 };

  try {
    await upsertFavoritesToCloud(uid, unique); // union, never deletes
    await saveFavoritesLocal(unique, user); // refresh local cache
  } catch (e) {
    return { ok: false, error: e?.message || "Could not save recovered favorites." };
  }

  return { ok: true, recovered: unique.length };
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
