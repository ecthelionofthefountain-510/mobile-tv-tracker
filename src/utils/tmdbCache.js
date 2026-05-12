import { TMDB_BASE_URL, TMDB_LANGUAGE } from "../config";

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1h
const PREFIX = "tmdb:cache:v1:";

const memoryCache = new Map();

function readLocalStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeLocalStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore (quota, private mode, etc.)
  }
}

function forceTmdbLanguage(url) {
  try {
    const reqUrl = new URL(url);
    const tmdbBase = new URL(TMDB_BASE_URL);
    const isTmdbUrl =
      reqUrl.origin === tmdbBase.origin &&
      reqUrl.pathname.startsWith(tmdbBase.pathname);

    if (!isTmdbUrl) return url;

    reqUrl.searchParams.set("language", TMDB_LANGUAGE);
    return reqUrl.toString();
  } catch {
    return url;
  }
}

export async function cachedFetchJson(url, options = {}) {
  const {
    ttlMs = DEFAULT_TTL_MS,
    cacheKey = url,
    fetchOptions,
    bypassCache = false,
  } = options;

  const storageKey = `${PREFIX}${cacheKey}`;
  const now = Date.now();

  if (!bypassCache) {
    const mem = memoryCache.get(storageKey);
    if (mem && now - mem.ts < ttlMs) {
      return mem.data;
    }

    const fromLs = readLocalStorage(storageKey);
    if (fromLs && typeof fromLs === "object") {
      const ts = typeof fromLs.ts === "number" ? fromLs.ts : 0;
      if (ts && now - ts < ttlMs && "data" in fromLs) {
        memoryCache.set(storageKey, { ts, data: fromLs.data });
        return fromLs.data;
      }
    }
  }

  const requestUrl = forceTmdbLanguage(url);
  const res = await fetch(requestUrl, fetchOptions);
  if (!res.ok) {
    throw new Error(`TMDB request failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();

  memoryCache.set(storageKey, { ts: now, data });
  writeLocalStorage(storageKey, { ts: now, data });

  return data;
}

export function clearCache() {
  memoryCache.clear();
  try {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PREFIX)) toRemove.push(key);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}
