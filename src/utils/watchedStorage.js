// src/utils/watchedStorage.js
import { get, set } from "idb-keyval";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

const WATCHED_KEY_BASE = "watched";
const WATCHED_TABLE = "watched";

function safeJsonParse(value, fallback) {
  if (value == null) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function getCurrentUser() {
  const raw = localStorage.getItem("currentUser");
  if (!raw) return null;

  // currentUser is typically stored as JSON string (e.g. "Alice")
  const parsed = safeJsonParse(raw, null);
  if (typeof parsed === "string" && parsed.trim()) return parsed;

  // fallback: if someone stored it as plain text
  if (typeof raw === "string" && raw.trim() && raw !== "null") return raw;

  return null;
}

function watchedKeyForUser(user = getCurrentUser()) {
  return user ? `${WATCHED_KEY_BASE}_${user}` : WATCHED_KEY_BASE;
}

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
  "userRating",
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

// Läs ALL watched-lista lokalt (IndexedDB + localStorage). Används som
// offline-cache och som källa vid engångsmigreringen till molnet.
async function loadWatchedLocal(user = getCurrentUser()) {
  const scopedKey = watchedKeyForUser(user);
  const legacyKey = WATCHED_KEY_BASE;

  // 1) Primär källa: IndexedDB (större kapacitet + mer pålitlig vid stora listor)
  try {
    const fromIdb = await get(scopedKey);
    if (Array.isArray(fromIdb)) {
      return normalizeWatchedItems(fromIdb);
    }

    // Migration: legacy global watched -> per user
    if (user) {
      const legacyFromIdb = await get(legacyKey);
      if (Array.isArray(legacyFromIdb) && legacyFromIdb.length > 0) {
        const normalized = normalizeWatchedItems(legacyFromIdb);
        try {
          await set(scopedKey, normalized);
        } catch {
          // ignore
        }
        return normalized;
      }
    }
  } catch (e) {
    console.warn("Error reading from IndexedDB", e);
  }

  // 2) Fallback: localStorage (snabbt, men kan vara begränsat i storlek)
  try {
    const scopedRaw = localStorage.getItem(scopedKey);
    const scopedParsed = safeJsonParse(scopedRaw, null);
    if (Array.isArray(scopedParsed)) return normalizeWatchedItems(scopedParsed);

    if (user) {
      const legacyRaw = localStorage.getItem(legacyKey);
      const legacyParsed = safeJsonParse(legacyRaw, null);
      if (Array.isArray(legacyParsed) && legacyParsed.length > 0) {
        const normalized = normalizeWatchedItems(legacyParsed);
        try {
          localStorage.setItem(scopedKey, JSON.stringify(normalized));
        } catch {
          // ignore
        }
        return normalized;
      }
    }
  } catch (e) {
    console.warn("Error reading from localStorage", e);
  }

  // 3) Inget hittat någonstans
  return [];
}

// Spara hela watched-listan lokalt (offline-cache).
async function saveWatchedLocal(items, user = getCurrentUser()) {
  const scopedKey = watchedKeyForUser(user);
  const normalized = normalizeWatchedItems(items);

  try {
    // Primärt: IndexedDB
    await set(scopedKey, normalized);
  } catch (e) {
    console.warn("Could not save to IndexedDB", e);
  }

  try {
    // Sekundärt: localStorage (kan faila vid stora listor)
    localStorage.setItem(scopedKey, JSON.stringify(normalized));
  } catch (e) {
    console.warn("Could not save to localStorage", e);
    // Viktigt: rensa så vi inte råkar läsa gammalt/stale från localStorage och skriva över IDB senare
    try {
      localStorage.removeItem(scopedKey);
    } catch {
      // ignore
    }
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

async function loadWatchedFromCloud(uid) {
  const { data, error } = await supabase
    .from(WATCHED_TABLE)
    .select("data")
    .eq("user_id", uid);
  if (error) throw error;
  return normalizeWatchedItems((data || []).map((row) => row.data));
}

// Insert-or-update the given items. Never deletes — safe for merging.
async function upsertWatchedToCloud(uid, items) {
  const rows = items.map((item) => toRow(uid, item));
  if (!rows.length) return;
  const { error } = await supabase
    .from(WATCHED_TABLE)
    .upsert(rows, { onConflict: "user_id,media_type,item_id" });
  if (error) throw error;
}

// Make the cloud match `items` exactly: upsert present items, delete the rest.
async function saveWatchedToCloud(uid, items) {
  await upsertWatchedToCloud(uid, items);

  const { data: existing, error } = await supabase
    .from(WATCHED_TABLE)
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
        .from(WATCHED_TABLE)
        .delete()
        .match({
          user_id: uid,
          media_type: row.media_type,
          item_id: row.item_id,
        }),
    ),
  );
}

// One-time-per-browser merge of any existing local data up into the cloud.
// Runs the first time we load for a given account in this browser. Union only,
// so nothing is ever lost from either side.
async function migrateLocalWatchedIfNeeded(uid, user) {
  const flagKey = `cloudWatchedMigrated_${uid}`;
  try {
    if (localStorage.getItem(flagKey)) return false;
  } catch {
    // ignore
  }

  const local = await loadWatchedLocal(user);
  if (local.length) {
    await upsertWatchedToCloud(uid, local);
  }

  try {
    localStorage.setItem(flagKey, "1");
  } catch {
    // ignore
  }
  return local.length > 0;
}

// ---------------------------------------------------------------------------
// Public API — same signatures as before, now cloud-backed when signed in.
// ---------------------------------------------------------------------------

// Läs ALL watched-lista (filmer + serier)
export async function loadWatchedAll(user = getCurrentUser()) {
  const uid = await getAuthUserId();

  if (uid) {
    try {
      // Runs once per browser: pushes any pre-existing local data up first,
      // so the read below returns the union.
      await migrateLocalWatchedIfNeeded(uid, user);
      const items = await loadWatchedFromCloud(uid);

      // Safeguard: never let an empty cloud result shadow non-empty local
      // data. If the cloud is empty but this device still has items, push
      // them up (union) and use them instead of overwriting the local cache.
      if (items.length === 0) {
        const local = await loadWatchedLocal(user);
        if (local.length > 0) {
          await upsertWatchedToCloud(uid, local);
          return local;
        }
      }

      // Mirror to local cache for fast reloads / offline.
      try {
        await saveWatchedLocal(items, user);
      } catch {
        // ignore
      }
      return items;
    } catch (e) {
      console.warn("Cloud watched load failed, using local copy", e);
    }
  }

  return loadWatchedLocal(user);
}

// Spara hela watched-listan
export async function saveWatchedAll(items, user = getCurrentUser()) {
  const normalized = normalizeWatchedItems(items);

  // Always keep a local copy so the app works offline and survives reloads.
  await saveWatchedLocal(normalized, user);

  const uid = await getAuthUserId();
  if (uid) {
    try {
      await saveWatchedToCloud(uid, normalized);
    } catch (e) {
      console.warn("Cloud watched save failed (kept local copy)", e);
    }
  }
}
