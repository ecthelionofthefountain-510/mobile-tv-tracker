import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import rateLimit from "express-rate-limit";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const app = express();

const PORT = Number(process.env.PORT || 5174);
const TMDB_BASE_URL =
  process.env.TMDB_BASE_URL ||
  process.env.VITE_TMDB_BASE_URL ||
  "https://api.themoviedb.org/3";
const IMAGE_BASE_URL =
  process.env.IMAGE_BASE_URL ||
  process.env.VITE_IMAGE_BASE_URL ||
  "https://image.tmdb.org/t/p/w500";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const corsAllowList =
  allowedOrigins.length > 0 ? allowedOrigins : DEFAULT_ALLOWED_ORIGINS;

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients and same-origin requests without an Origin header.
      if (!origin) {
        callback(null, true);
        return;
      }

      if (corsAllowList.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
  }),
);
app.use(express.json({ limit: "200kb" }));

const aiPickLimiter = rateLimit({
  windowMs: Number(process.env.AI_RATE_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.AI_RATE_LIMIT_MAX || 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many AI requests, please try again shortly." },
});

const widgetLimiter = rateLimit({
  windowMs: Number(process.env.WIDGET_RATE_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.WIDGET_RATE_LIMIT_MAX || 60),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many widget requests, please try again shortly." },
});

const TMDB_DETAILS_TTL_MS = Number(
  process.env.WIDGET_TMDB_TTL_MS || 6 * 60 * 60 * 1000,
);
const WIDGET_OK_TTL_SECONDS = Number(process.env.WIDGET_TTL_SECONDS || 1800);
const WIDGET_EMPTY_TTL_SECONDS = Number(
  process.env.WIDGET_EMPTY_TTL_SECONDS || 3600,
);
const WIDGET_ERROR_TTL_SECONDS = Number(
  process.env.WIDGET_ERROR_TTL_SECONDS || 900,
);
const WIDGET_PROFILE_STORE_PATH = resolve(
  process.cwd(),
  process.env.WIDGET_PROFILE_STORE_PATH ||
    ".widget-profiles/widget-profiles.json",
);

const tvDetailsCache = new Map();
const tvDetailsInFlight = new Map();
const tvSeasonDetailsCache = new Map();
const tvSeasonDetailsInFlight = new Map();
let widgetProfileWriteQueue = Promise.resolve();

function parseJsonParam(raw, fallback = []) {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(String(raw));
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function extractBearerToken(req) {
  const authHeader = req.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return "";
  return authHeader.slice(7).trim();
}

function extractWidgetProfileToken(req) {
  return (req.get("x-widget-server-token") || "").trim();
}

function clampInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function normalizeWidgetProfileArray(items) {
  return Array.isArray(items) ? items.slice(0, 250) : [];
}

function widgetProfileKey(token) {
  return createHash("sha1").update(token).digest("hex");
}

async function readWidgetProfileStore() {
  try {
    const raw = await readFile(WIDGET_PROFILE_STORE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    if (err?.code === "ENOENT") return {};
    throw err;
  }
}

async function writeWidgetProfileStore(store) {
  const data = JSON.stringify(store, null, 2);

  widgetProfileWriteQueue = widgetProfileWriteQueue.then(async () => {
    await mkdir(dirname(WIDGET_PROFILE_STORE_PATH), { recursive: true });
    await writeFile(WIDGET_PROFILE_STORE_PATH, data, "utf8");
  });

  return widgetProfileWriteQueue;
}

async function loadWidgetProfileSnapshot(token) {
  if (!token) return null;

  const store = await readWidgetProfileStore();
  const entry = store[widgetProfileKey(token)];
  if (!entry || typeof entry !== "object") return null;

  return {
    favorites: normalizeWidgetProfileArray(entry.favorites),
    watched: normalizeWidgetProfileArray(entry.watched),
    updatedAt: entry.updatedAt || null,
  };
}

async function saveWidgetProfileSnapshot(token, favorites, watched) {
  if (!token) {
    throw new Error("Missing widget profile token");
  }

  const store = await readWidgetProfileStore();
  store[widgetProfileKey(token)] = {
    favorites: normalizeWidgetProfileArray(favorites),
    watched: normalizeWidgetProfileArray(watched),
    updatedAt: new Date().toISOString(),
  };

  await writeWidgetProfileStore(store);
  return store[widgetProfileKey(token)];
}

function startOfDayUtc(dateLike) {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function isoDateToUtcTime(iso) {
  if (!iso) return Number.NaN;
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return Number.NaN;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function daysUntilIsoDate(iso, now = new Date()) {
  const target = isoDateToUtcTime(iso);
  if (!Number.isFinite(target)) return null;
  const today = startOfDayUtc(now);
  return Math.round((target - today) / (24 * 60 * 60 * 1000));
}

function isTvItem(item) {
  return !!item && (item.mediaType === "tv" || !!item.first_air_date);
}

function computeTvProgress(show) {
  const seasons = show?.seasons;
  if (!seasons || typeof seasons !== "object" || Array.isArray(seasons)) {
    return {
      watchedEpisodes: 0,
      totalEpisodes: null,
      completed: !!show?.completed,
    };
  }

  const watchedEpisodes = Object.values(seasons).reduce(
    (sum, season) => sum + (season?.watchedEpisodes?.length || 0),
    0,
  );

  const totalEpisodes =
    typeof show?.number_of_episodes === "number" && show.number_of_episodes > 0
      ? show.number_of_episodes
      : null;

  const completed =
    typeof totalEpisodes === "number"
      ? watchedEpisodes >= totalEpisodes
      : !!show?.completed;

  return { watchedEpisodes, totalEpisodes, completed };
}

function isInProgressShow(show) {
  if (!show || !isTvItem(show)) return false;
  const progress = computeTvProgress(show);
  if (progress.totalEpisodes != null) {
    return progress.completed === false;
  }
  return show.completed !== true;
}

function buildUpcomingCandidates({ favorites = [], watched = [] }) {
  const map = new Map();

  const add = (item, flags) => {
    if (!isTvItem(item) || item.id == null) return;

    const key = String(item.id);
    const prev = map.get(key) || {
      tmdbId: Number(item.id),
      isFavorite: false,
      isInProgress: false,
      title: item.title || item.name || "",
    };

    map.set(key, {
      ...prev,
      ...flags,
      tmdbId: Number(item.id),
      title: prev.title || item.title || item.name || "",
    });
  };

  for (const item of Array.isArray(favorites) ? favorites : []) {
    add(item, { isFavorite: true });
  }

  for (const item of Array.isArray(watched) ? watched : []) {
    if (!isInProgressShow(item)) continue;
    add(item, { isInProgress: true });
  }

  return Array.from(map.values()).filter((c) => Number.isFinite(c.tmdbId));
}

async function fetchTvDetails(tmdbId, apiKey) {
  const key = String(tmdbId);
  const now = Date.now();
  const cached = tvDetailsCache.get(key);
  if (cached && cached.expiresAt > now) return cached.value;

  const inFlight = tvDetailsInFlight.get(key);
  if (inFlight) return inFlight;

  const promise = (async () => {
    const url = `${TMDB_BASE_URL}/tv/${encodeURIComponent(String(tmdbId))}?api_key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`TMDb details failed: ${response.status}`);
    }

    const data = await response.json();
    tvDetailsCache.set(key, {
      value: data,
      expiresAt: now + TMDB_DETAILS_TTL_MS,
    });

    return data;
  })();

  tvDetailsInFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    tvDetailsInFlight.delete(key);
  }
}

async function fetchTvDetailsBatch(ids, apiKey) {
  const settled = await Promise.allSettled(
    ids.map((id) => fetchTvDetails(id, apiKey)),
  );

  const ok = [];
  const errors = [];

  for (const result of settled) {
    if (result.status === "fulfilled") {
      ok.push(result.value);
      continue;
    }
    errors.push(String(result.reason || "Unknown error"));
  }

  return { ok, errors };
}

async function fetchTvSeasonDetails(tmdbId, seasonNumber, apiKey) {
  const key = `${tmdbId}:${seasonNumber}`;
  const now = Date.now();
  const cached = tvSeasonDetailsCache.get(key);
  if (cached && cached.expiresAt > now) return cached.value;

  const inFlight = tvSeasonDetailsInFlight.get(key);
  if (inFlight) return inFlight;

  const promise = (async () => {
    const url = `${TMDB_BASE_URL}/tv/${encodeURIComponent(String(tmdbId))}/season/${encodeURIComponent(String(seasonNumber))}?api_key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`TMDb season details failed: ${response.status}`);
    }

    const data = await response.json();
    tvSeasonDetailsCache.set(key, {
      value: data,
      expiresAt: now + TMDB_DETAILS_TTL_MS,
    });

    return data;
  })();

  tvSeasonDetailsInFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    tvSeasonDetailsInFlight.delete(key);
  }
}

function computePriority({ isFavorite, isInProgress, daysUntil }) {
  let score = 0;
  if (isFavorite) score += 10;
  if (isInProgress) score += 5;
  if (typeof daysUntil === "number" && daysUntil >= 0 && daysUntil <= 3) {
    score += 3;
  }
  return score;
}

function toWidgetEpisodeItem(details, candidate, episodeLike) {
  const airDate = episodeLike?.air_date;
  if (!airDate) return null;

  const airTime = isoDateToUtcTime(airDate);
  if (!Number.isFinite(airTime)) return null;

  const daysUntil = daysUntilIsoDate(airDate);
  if (daysUntil == null || daysUntil < 0) return null;

  const priority = computePriority({
    isFavorite: !!candidate?.isFavorite,
    isInProgress: !!candidate?.isInProgress,
    daysUntil,
  });

  const tmdbId = Number(details?.id);
  const season =
    typeof episodeLike?.season_number === "number"
      ? episodeLike.season_number
      : null;
  const episode =
    typeof episodeLike?.episode_number === "number"
      ? episodeLike.episode_number
      : null;

  return {
    id: `tv:${tmdbId}:${season ?? "x"}:${episode ?? "x"}`,
    tmdbId,
    mediaType: "tv",
    title: details?.name || candidate?.title || "",
    season,
    episode,
    airDate,
    daysUntil,
    isToday: daysUntil === 0,
    isTomorrow: daysUntil === 1,
    network: Array.isArray(details?.networks)
      ? details.networks?.[0]?.name || null
      : null,
    posterUrl: details?.poster_path
      ? `${IMAGE_BASE_URL}${details.poster_path}`
      : null,
    deepLink:
      season != null && episode != null
        ? `mobiletvtracker://show/${tmdbId}?season=${season}&episode=${episode}`
        : `mobiletvtracker://show/${tmdbId}`,
    priority,
    _airTime: airTime,
  };
}

function toWidgetItem(details, candidate) {
  const item = toWidgetEpisodeItem(
    details,
    candidate,
    details?.next_episode_to_air,
  );
  if (!item) return null;

  return {
    ...item,
    id: `tv:${item.tmdbId}`,
  };
}

function buildExtraUpcomingItems(details, candidate, seasonDetails, takenKeys) {
  const nextSeason = details?.next_episode_to_air?.season_number;
  const nextEpisode = details?.next_episode_to_air?.episode_number;

  if (typeof nextSeason !== "number" || typeof nextEpisode !== "number") {
    return [];
  }

  const episodes = Array.isArray(seasonDetails?.episodes)
    ? seasonDetails.episodes
    : [];

  return episodes
    .filter(
      (episode) =>
        typeof episode?.episode_number === "number" &&
        episode.episode_number > nextEpisode,
    )
    .map((episode) => ({
      ...episode,
      season_number: nextSeason,
    }))
    .map((episode) => toWidgetEpisodeItem(details, candidate, episode))
    .filter(Boolean)
    .filter((item) => {
      const key = `${item.tmdbId}:${item.season ?? "x"}:${item.episode ?? "x"}`;
      if (takenKeys.has(key)) return false;
      takenKeys.add(key);
      return true;
    });
}

function toWidgetFallbackItem(details, candidate) {
  const tmdbId = Number(details?.id);
  if (!Number.isFinite(tmdbId)) return null;

  const next = details?.next_episode_to_air;
  const season =
    typeof next?.season_number === "number" ? next.season_number : null;
  const episode =
    typeof next?.episode_number === "number" ? next.episode_number : null;

  const networkName = Array.isArray(details?.networks)
    ? details.networks?.[0]?.name || null
    : null;

  const fallbackTag = candidate?.isFavorite
    ? "Favorit"
    : candidate?.isInProgress
      ? "Påbörjad"
      : null;

  const fallbackMeta =
    [networkName, fallbackTag].filter(Boolean).join(" - ") || null;

  return {
    id: `tv:${tmdbId}`,
    tmdbId,
    mediaType: "tv",
    title: details?.name || candidate?.title || "",
    season,
    episode,
    airDate: null,
    daysUntil: null,
    isToday: false,
    isTomorrow: false,
    network: fallbackMeta,
    posterUrl: details?.poster_path
      ? `${IMAGE_BASE_URL}${details.poster_path}`
      : null,
    deepLink:
      season != null && episode != null
        ? `mobiletvtracker://show/${tmdbId}?season=${season}&episode=${episode}`
        : `mobiletvtracker://show/${tmdbId}`,
    priority: computePriority({
      isFavorite: !!candidate?.isFavorite,
      isInProgress: !!candidate?.isInProgress,
      daysUntil: null,
    }),
  };
}

function toWidgetPayload({ items, widgetState, ttlSeconds, stale = false }) {
  return {
    version: "1",
    generatedAt: new Date().toISOString(),
    ttlSeconds,
    widgetState,
    items,
    meta: {
      source: "tmdb+profile",
      stale,
    },
  };
}

function sendWidgetResponse(req, res, payload) {
  const body = JSON.stringify(payload);
  const etag = `W/\"${createHash("sha1").update(body).digest("hex")}\"`;
  if (req.get("if-none-match") === etag) {
    res.status(304).set("ETag", etag).end();
    return;
  }

  res.set("ETag", etag);
  res.set("Cache-Control", "private, max-age=60");
  res.status(200).json(payload);
}

function requireAiServerToken(req, res, next) {
  const configuredToken = process.env.AI_SERVER_TOKEN;
  if (!configuredToken) {
    next();
    return;
  }

  const providedToken = req.get("x-ai-server-token") || "";
  if (providedToken === configuredToken) {
    next();
    return;
  }

  res.status(401).json({ error: "Unauthorized" });
}

function requireWidgetServerToken(req, res, next) {
  const configuredToken = process.env.WIDGET_SERVER_TOKEN;
  if (!configuredToken) {
    next();
    return;
  }

  const providedHeader = req.get("x-widget-server-token") || "";
  const bearerToken = extractBearerToken(req);
  if (providedHeader === configuredToken || bearerToken === configuredToken) {
    next();
    return;
  }

  res.status(401).json({ error: "Unauthorized" });
}

function toCandidate(item) {
  const mediaType = item.mediaType || (item.first_air_date ? "tv" : "movie");
  const title = item.title || item.name || "";

  const base = {
    id: item.id,
    mediaType,
    title,
    year: item.release_date
      ? String(item.release_date).slice(0, 4)
      : item.first_air_date
        ? String(item.first_air_date).slice(0, 4)
        : null,
    genres:
      Array.isArray(item.genres) && item.genres.length > 0
        ? item.genres
            .map((g) => (typeof g === "object" ? g.name : String(g)))
            .filter(Boolean)
        : [],
    popularity: typeof item.popularity === "number" ? item.popularity : null,
    vote_average:
      typeof item.vote_average === "number" ? item.vote_average : null,
  };

  if (mediaType === "tv") {
    const { watchedEpisodes, totalEpisodes, completed } =
      computeTvProgress(item);
    return {
      ...base,
      completed,
      watchedEpisodes,
      totalEpisodes,
    };
  }

  return {
    ...base,
    completed: true,
    watchedEpisodes: null,
    totalEpisodes: null,
  };
}

function buildCandidatePool({ favorites = [], watched = [] }) {
  const fav = Array.isArray(favorites) ? favorites : [];
  const wat = Array.isArray(watched) ? watched : [];

  const watchedIds = new Set(wat.map((w) => String(w.id)));

  const favoriteCandidates = fav
    .filter((i) => i && typeof i === "object" && i.id != null)
    .map(toCandidate)
    .slice(0, 30);

  const inProgressShows = wat
    .filter(
      (i) =>
        i &&
        typeof i === "object" &&
        (i.mediaType === "tv" || i.first_air_date),
    )
    .map(toCandidate)
    .filter((c) => c.mediaType === "tv" && c.completed === false)
    .sort((a, b) => (b.watchedEpisodes || 0) - (a.watchedEpisodes || 0))
    .slice(0, 20);

  const pool = [...favoriteCandidates, ...inProgressShows];

  const seen = new Set();
  const deduped = [];
  for (const c of pool) {
    const key = `${c.mediaType}:${String(c.id)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(c);
  }

  if (deduped.length === 0) {
    const fallback = wat
      .filter((i) => i && typeof i === "object" && i.id != null)
      .map(toCandidate)
      .slice(0, 40);
    return fallback;
  }

  return deduped.map((c) => ({
    ...c,
    isWatched: watchedIds.has(String(c.id)),
  }));
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/widget/profile-sync", widgetLimiter, async (req, res) => {
  try {
    const token = extractWidgetProfileToken(req);
    if (!token) {
      res.status(400).json({ error: "Missing x-widget-server-token" });
      return;
    }

    const favorites = normalizeWidgetProfileArray(req.body?.favorites);
    const watched = normalizeWidgetProfileArray(req.body?.watched);

    const saved = await saveWidgetProfileSnapshot(token, favorites, watched);

    res.json({
      ok: true,
      favoritesCount: saved.favorites.length,
      watchedCount: saved.watched.length,
      updatedAt: saved.updatedAt,
    });
  } catch (err) {
    console.error("Widget profile sync failed", err);
    res.status(500).json({ error: "Widget profile sync failed" });
  }
});

async function handleWidgetUpcoming(req, res) {
  try {
    const apiKey = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "Missing TMDB_API_KEY on server" });
      return;
    }

    const defaultLimit = clampInt(process.env.WIDGET_DEFAULT_LIMIT, 1, 20, 6);
    const limit = clampInt(
      req.query.limit || req.body?.limit,
      1,
      20,
      defaultLimit,
    );

    const syncedProfile = await loadWidgetProfileSnapshot(
      extractWidgetProfileToken(req),
    );

    const favorites =
      syncedProfile?.favorites ||
      (Array.isArray(req.body?.favorites)
        ? req.body.favorites
        : parseJsonParam(req.query.favorites, []));
    const watched =
      syncedProfile?.watched ||
      (Array.isArray(req.body?.watched)
        ? req.body.watched
        : parseJsonParam(req.query.watched, []));

    const candidates = buildUpcomingCandidates({ favorites, watched });
    if (candidates.length === 0) {
      const payload = toWidgetPayload({
        items: [],
        widgetState: "empty",
        ttlSeconds: WIDGET_EMPTY_TTL_SECONDS,
      });
      sendWidgetResponse(req, res, payload);
      return;
    }

    const { ok: detailsList, errors } = await fetchTvDetailsBatch(
      candidates.map((c) => c.tmdbId),
      apiKey,
    );

    const candidateById = new Map(candidates.map((c) => [String(c.tmdbId), c]));

    const upcomingItems = detailsList
      .map((details) => {
        const candidate = candidateById.get(String(details?.id));
        return toWidgetItem(details, candidate);
      })
      .filter(Boolean)
      .sort(
        (a, b) =>
          (a._airTime || 0) - (b._airTime || 0) ||
          (b.priority || 0) - (a.priority || 0) ||
          String(a.title || "").localeCompare(String(b.title || "")),
      )
      .map(({ _airTime, ...rest }) => rest);

    const takenEpisodeKeys = new Set(
      upcomingItems.map(
        (item) => `${item.tmdbId}:${item.season ?? "x"}:${item.episode ?? "x"}`,
      ),
    );

    let extraUpcomingItems = [];
    if (upcomingItems.length < limit) {
      const extraSettled = await Promise.allSettled(
        detailsList.map(async (details) => {
          const nextSeason = details?.next_episode_to_air?.season_number;
          if (typeof nextSeason !== "number") return [];

          const candidate = candidateById.get(String(details?.id));
          const seasonDetails = await fetchTvSeasonDetails(
            details.id,
            nextSeason,
            apiKey,
          );

          return buildExtraUpcomingItems(
            details,
            candidate,
            seasonDetails,
            takenEpisodeKeys,
          );
        }),
      );

      extraUpcomingItems = extraSettled
        .flatMap((result) => {
          if (result.status === "fulfilled") {
            return result.value;
          }
          errors.push(String(result.reason || "Unknown error"));
          return [];
        })
        .sort(
          (a, b) =>
            (a._airTime || 0) - (b._airTime || 0) ||
            (b.priority || 0) - (a.priority || 0) ||
            String(a.title || "").localeCompare(String(b.title || "")),
        )
        .slice(0, limit - upcomingItems.length)
        .map(({ _airTime, ...rest }) => rest);
    }

    const existingIds = new Set(
      [...upcomingItems, ...extraUpcomingItems].map((i) => String(i.tmdbId)),
    );
    const fallbackItems = detailsList
      .map((details) => {
        const candidate = candidateById.get(String(details?.id));
        return toWidgetFallbackItem(details, candidate);
      })
      .filter(Boolean)
      .filter((item) => !existingIds.has(String(item.tmdbId)))
      .sort(
        (a, b) =>
          (b.priority || 0) - (a.priority || 0) ||
          String(a.title || "").localeCompare(String(b.title || "")),
      );

    const items = [
      ...upcomingItems,
      ...extraUpcomingItems,
      ...fallbackItems,
    ].slice(0, limit);

    const hasErrors = errors.length > 0;
    const widgetState = items.length > 0 ? "ok" : hasErrors ? "error" : "empty";
    const ttlSeconds =
      widgetState === "ok"
        ? WIDGET_OK_TTL_SECONDS
        : widgetState === "empty"
          ? WIDGET_EMPTY_TTL_SECONDS
          : WIDGET_ERROR_TTL_SECONDS;

    const payload = toWidgetPayload({
      items,
      widgetState,
      ttlSeconds,
      stale: hasErrors,
    });

    sendWidgetResponse(req, res, payload);
  } catch (err) {
    console.error("Widget upcoming failed", err);
    const payload = toWidgetPayload({
      items: [],
      widgetState: "error",
      ttlSeconds: WIDGET_ERROR_TTL_SECONDS,
      stale: true,
    });
    sendWidgetResponse(req, res, payload);
  }
}

app.get(
  "/api/widget/upcoming",
  widgetLimiter,
  requireWidgetServerToken,
  handleWidgetUpcoming,
);

app.post(
  "/api/widget/upcoming",
  widgetLimiter,
  requireWidgetServerToken,
  handleWidgetUpcoming,
);

app.post(
  "/api/ai/pick",
  aiPickLimiter,
  requireAiServerToken,
  async (req, res) => {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        res.status(500).json({ error: "Missing OPENAI_API_KEY on server" });
        return;
      }

      const { favorites, watched } = req.body || {};
      const candidates = buildCandidatePool({ favorites, watched });

      if (!Array.isArray(candidates) || candidates.length === 0) {
        res.json({
          picks: [],
          message: "No candidates available (add favorites or start a show).",
        });
        return;
      }

      const client = new OpenAI({
        apiKey,
        baseURL: process.env.OPENAI_BASE_URL || undefined,
      });

      const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

      const system =
        "Du är en hjälpsam rekommendationsassistent för en TV/film-tracker. Du måste välja från kandidatlistan och svara i strikt JSON.";

      const user = {
        task: "Välj 1-3 saker att titta på ikväll. Prioritera (1) favoriter, (2) serier som är påbörjade men inte klara. Svara på svenska.",
        rules: [
          "Välj ENDAST från candidates.",
          "Returnera max 3 picks.",
          "Varje pick: id, mediaType (tv|movie), title, reason (max 1 mening).",
          "Svara i JSON utan extra text.",
        ],
        candidates,
        output_schema: {
          picks: [
            {
              id: "number|string",
              mediaType: "tv|movie",
              title: "string",
              reason: "string",
            },
          ],
        },
      };

      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(user) },
        ],
        temperature: 0.7,
      });

      const text = completion.choices?.[0]?.message?.content || "";

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }

      const picksRaw = Array.isArray(parsed?.picks) ? parsed.picks : [];

      const allowed = new Map(
        candidates.map((c) => [`${c.mediaType}:${String(c.id)}`, c]),
      );

      const picks = [];
      for (const p of picksRaw) {
        const key = `${p?.mediaType}:${String(p?.id)}`;
        const c = allowed.get(key);
        if (!c) continue;
        picks.push({
          id: c.id,
          mediaType: c.mediaType,
          title: c.title,
          reason: typeof p.reason === "string" ? p.reason : "",
        });
        if (picks.length >= 3) break;
      }

      if (picks.length === 0) {
        const first = candidates.slice(0, 3).map((c) => ({
          id: c.id,
          mediaType: c.mediaType,
          title: c.title,
          reason: "Känns som ett bra val just nu.",
        }));
        res.json({ picks: first });
        return;
      }

      res.json({ picks });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "AI pick failed" });
    }
  },
);

if (process.env.NODE_ENV !== "test") {
  const server = app.listen(PORT);

  server.once("listening", () => {
    console.log(
      `AI server listening on http://localhost:${PORT} (pid ${process.pid})`,
    );
  });

  server.once("error", (err) => {
    if (err?.code === "EADDRINUSE") {
      console.error(
        `Port ${PORT} is already in use. Stop the existing process or start with PORT=<port> npm run server.`,
      );
      process.exit(1);
      return;
    }

    console.error("Failed to start AI server", err);
    process.exit(1);
  });
}

export {
  buildExtraUpcomingItems,
  buildUpcomingCandidates,
  computePriority,
  toWidgetEpisodeItem,
  toWidgetItem,
  toWidgetPayload,
};
