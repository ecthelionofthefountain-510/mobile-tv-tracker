import React, { useEffect, useMemo, useState } from "react";
import { loadWatchedAll } from "../utils/watchedStorage";
import { loadFavorites } from "../utils/favoritesStorage";
import { cachedFetchJson } from "../utils/tmdbCache";
import { API_KEY, TMDB_BASE_URL, IMAGE_BASE_URL, APP_LOCALE } from "../config";

// TMDb IDs for fallback shows — posters are fetched live so they're always correct.
const FALLBACK_TMDB_IDS = [1399, 84773, 76479, 71912, 60735];

const FALLBACK_ITEMS = [
  {
    id: "tv:1399",
    tmdbId: 1399,
    title: "House of the Dragon",
    season: 3,
    episode: 2,
    daysUntil: 2,
    isToday: false,
    isTomorrow: false,
    network: "HBO",
    posterUrl: null,
  },
  {
    id: "tv:84773",
    tmdbId: 84773,
    title: "The Rings of Power",
    season: 2,
    episode: 5,
    daysUntil: 5,
    isToday: false,
    isTomorrow: false,
    network: "Prime",
    posterUrl: null,
  },
  {
    id: "tv:76479",
    tmdbId: 76479,
    title: "The Boys",
    season: 5,
    episode: 1,
    daysUntil: 8,
    isToday: false,
    isTomorrow: false,
    network: "Prime",
    posterUrl: null,
  },
  {
    id: "tv:71912",
    tmdbId: 71912,
    title: "The Witcher",
    season: 4,
    episode: 3,
    daysUntil: 12,
    isToday: false,
    isTomorrow: false,
    network: "Netflix",
    posterUrl: null,
  },
  {
    id: "tv:60735",
    tmdbId: 60735,
    title: "The Flash",
    season: 1,
    episode: 1,
    daysUntil: 20,
    isToday: false,
    isTomorrow: false,
    network: "CW",
    posterUrl: null,
  },
];

async function enrichFallbackPosters(items) {
  const results = await Promise.allSettled(
    items.map((item) =>
      cachedFetchJson(`${TMDB_BASE_URL}/tv/${item.tmdbId}?api_key=${API_KEY}`, {
        ttlMs: 24 * 60 * 60 * 1000,
        cacheKey: `tv:${item.tmdbId}:details`,
      }),
    ),
  );
  return items.map((item, i) => {
    const res = results[i];
    const posterPath =
      res.status === "fulfilled" ? res.value?.poster_path : null;
    return {
      ...item,
      posterUrl: posterPath ? `${IMAGE_BASE_URL}${posterPath}` : null,
    };
  });
}

function daysUntilDate(iso) {
  if (!iso) return null;
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const target = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const now = new Date();
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return Math.round((target - today) / 86400000);
}

async function fetchLiveItems(watched, favorites) {
  const isShow = (item) =>
    item?.mediaType === "tv" || !!item?.first_air_date || !!item?.seasons;
  const favSet = new Set(favorites.filter(isShow).map((f) => String(f.id)));
  const allTv = [
    ...favorites.filter(isShow),
    ...watched.filter((w) => isShow(w) && w.completed !== true),
  ];

  const seen = new Set();
  const ids = [];
  for (const item of allTv) {
    const key = String(item.id);
    if (!seen.has(key)) {
      seen.add(key);
      ids.push(key);
    }
    if (ids.length >= 30) break;
  }

  if (ids.length === 0) return [];

  const details = await Promise.allSettled(
    ids.map((id) =>
      cachedFetchJson(`${TMDB_BASE_URL}/tv/${id}?api_key=${API_KEY}`, {
        ttlMs: 6 * 60 * 60 * 1000,
        cacheKey: `tv:${id}:details`,
      }),
    ),
  );

  return details
    .filter(
      (r) => r.status === "fulfilled" && r.value?.next_episode_to_air?.air_date,
    )
    .map((r) => {
      const d = r.value;
      const next = d.next_episode_to_air;
      const du = daysUntilDate(next.air_date);
      return {
        id: `tv:${d.id}`,
        tmdbId: d.id,
        title: d.name || "",
        season: next.season_number,
        episode: next.episode_number,
        airDate: next.air_date,
        daysUntil: du,
        isToday: du === 0,
        isTomorrow: du === 1,
        network: d.networks?.[0]?.name || null,
        posterUrl: d.poster_path ? `${IMAGE_BASE_URL}${d.poster_path}` : null,
        isFavorite: favSet.has(String(d.id)),
        _airTime: du != null ? du : 9999,
      };
    })
    .sort(
      (a, b) =>
        a._airTime - b._airTime || (a.title || "").localeCompare(b.title || ""),
    );
}

const SIZE_PRESETS = {
  small: {
    label: "Small",
    width: 240,
    maxRows: 2,
    compact: true,
  },
  medium: {
    label: "Medium",
    width: 360,
    maxRows: 4,
    compact: false,
  },
  large: {
    label: "Large",
    width: 430,
    maxRows: 5,
    compact: false,
  },
};

function rightLabel(item) {
  if (item.isToday) return "TODAY";
  if (item.isTomorrow) return "TOMORROW";
  if (typeof item.daysUntil === "number" && item.daysUntil >= 0) {
    return `${item.daysUntil}D`;
  }
  return "";
}

function WidgetCard({ state, preset, liveItems }) {
  const items = useMemo(
    () =>
      (liveItems.length > 0 ? liveItems : FALLBACK_ITEMS).slice(
        0,
        preset.maxRows,
      ),
    [liveItems, preset.maxRows],
  );

  return (
    <div
      className="rounded-3xl border border-white/20 bg-black/75 backdrop-blur-md shadow-2xl overflow-hidden"
      style={{ width: `${preset.width}px`, maxWidth: "100%" }}
    >
      <div className="bg-yellow-400 text-gray-950 font-bold px-4 py-2 text-lg">
        Upcoming
      </div>

      <div className="p-3">
        {state === "no-data" && (
          <div className="text-sm text-gray-400">No data yet</div>
        )}

        {state === "empty" && (
          <div className="text-sm text-gray-400">No upcoming episodes</div>
        )}

        {state === "error" && (
          <>
            <div className="text-sm text-red-300 font-semibold">
              Could not refresh
            </div>
            {!preset.compact && (
              <div className="text-xs text-gray-400 mt-1">
                Showing last known state
              </div>
            )}
            <div className="mt-3 space-y-2">
              {items.map((item) => (
                <WidgetRow
                  key={`err-${item.id}`}
                  item={item}
                  compact={preset.compact}
                />
              ))}
            </div>
          </>
        )}

        {state === "ok" && (
          <div className="space-y-2">
            {items.map((item) => (
              <WidgetRow key={item.id} item={item} compact={preset.compact} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WidgetRow({ item, compact }) {
  const label = rightLabel(item);
  const thumbSize = compact ? "w-9 h-12" : "w-10 h-14";

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex items-center gap-2.5">
          <div
            className={`${thumbSize} overflow-hidden rounded-md border border-white/15 bg-white/10 flex-shrink-0`}
          >
            {item.posterUrl ? (
              <img
                src={item.posterUrl}
                alt={item.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                N/A
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate">
              {item.title}
            </div>
            {!compact && (
              <div className="text-xs text-gray-300 truncate">
                S{item.season}E{item.episode}{" "}
                {item.network ? `- ${item.network}` : ""}
              </div>
            )}
          </div>
        </div>

        {label && (
          <div className="text-xs font-bold text-gray-300">{label}</div>
        )}
      </div>
    </div>
  );
}

export default function WidgetPreviewPage() {
  const [state, setState] = useState("ok");
  const [size, setSize] = useState("medium");
  const [liveItems, setLiveItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [watched, favorites] = await Promise.all([
          loadWatchedAll(),
          loadFavorites(),
        ]);
        const items = await fetchLiveItems(watched || [], favorites || []);
        if (cancelled) return;
        if (items.length > 0) {
          setLiveItems(items);
        } else {
          // No live data — enrich fallback with correct posters from TMDb.
          const enriched = await enrichFallbackPosters(FALLBACK_ITEMS);
          if (!cancelled) setLiveItems(enriched);
        }
      } catch {
        // Last resort: show fallback without posters.
        if (!cancelled) setLiveItems(FALLBACK_ITEMS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const preset = SIZE_PRESETS[size] || SIZE_PRESETS.medium;

  return (
    <div className="app-page">
      <div className="app-container">
        <div className="app-panel p-4 mb-4">
          <h2 className="text-lg font-semibold text-yellow-400">
            Widget Preview
          </h2>
          <p className="text-sm text-gray-300 mt-1">
            {loading
              ? "Laddar din upcoming-data…"
              : liveItems.length > 0
                ? `Visar ${liveItems.length} kommande avsnitt från din lista.`
                : "Inga kommande avsnitt hittades, visar exempeldata."}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(SIZE_PRESETS).map(([key, item]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSize(key)}
                className={`app-chip ${size === key ? "app-chip-active" : ""}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {[
              ["ok", "OK"],
              ["error", "Error"],
              ["empty", "Empty"],
              ["no-data", "No data"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setState(value)}
                className={`app-chip ${state === value ? "app-chip-active" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-center">
          <WidgetCard state={state} preset={preset} liveItems={liveItems} />
        </div>
      </div>
    </div>
  );
}
