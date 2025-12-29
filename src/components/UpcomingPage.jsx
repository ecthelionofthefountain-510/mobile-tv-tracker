import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_KEY, TMDB_BASE_URL, IMAGE_BASE_URL } from "../config";
import { loadWatchedAll } from "../utils/watchedStorage";
import { cachedFetchJson } from "../utils/tmdbCache";
import { loadFavorites } from "../utils/favoritesStorage";
import ShowDetailModal from "./ShowDetailModal";

const UpcomingPage = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    const idx = window.history?.state?.idx;
    if (typeof idx === "number" && idx > 0) {
      navigate(-1);
      return;
    }

    // Direct load / refresh on this route -> go to a safe in-app page.
    navigate("/overview", { replace: true });
  };

  const [watched, setWatched] = useState([]);
  const [favorites, setFavorites] = useState([]);

  const [upcoming, setUpcoming] = useState([]);
  const [upcomingLoading, setUpcomingLoading] = useState(false);
  const [upcomingError, setUpcomingError] = useState("");

  const [selectedItem, setSelectedItem] = useState(null);
  const [itemDetails, setItemDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Load watched + favorites
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const allWatched = await loadWatchedAll();
        if (!cancelled) setWatched(allWatched || []);
      } catch (e) {
        console.error("Failed to load watched", e);
        if (!cancelled) setWatched([]);
      }

      try {
        const favs = await loadFavorites();
        if (!cancelled) setFavorites(favs);
      } catch (e) {
        console.error("Failed to load favorites", e);
        if (!cancelled) setFavorites([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const watchedShows = useMemo(() => {
    const isShow = (item) =>
      item?.mediaType === "tv" || !!item?.seasons || item?.type === "show";
    return (Array.isArray(watched) ? watched : []).filter(isShow);
  }, [watched]);

  const premiereCandidateIds = useMemo(() => {
    const ids = new Set();

    for (const w of watchedShows) {
      const mediaType = w?.mediaType || (w?.first_air_date ? "tv" : "movie");
      if (mediaType !== "tv") continue;
      if (w?.id == null) continue;
      if (w?.completed === true) continue;
      ids.add(String(w.id));
    }

    for (const f of Array.isArray(favorites) ? favorites : []) {
      const mediaType = f?.mediaType || (f?.first_air_date ? "tv" : "movie");
      if (mediaType !== "tv") continue;
      if (f?.id == null) continue;
      ids.add(String(f.id));
    }

    return Array.from(ids);
  }, [watchedShows, favorites]);

  const isoDateToTime = (iso) => {
    if (!iso) return Number.NaN;
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));

    const t = Date.parse(String(iso));
    return Number.isNaN(t) ? Number.NaN : t;
  };

  const fmtDate = (iso) => {
    if (!iso) return "";
    try {
      const t = isoDateToTime(iso);
      if (!Number.isFinite(t)) return iso;
      const d = new Date(t);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return iso;
    }
  };

  const relativeLabel = (iso) => {
    if (!iso) return "";
    const t = isoDateToTime(iso);
    if (!Number.isFinite(t)) return "";
    const d = new Date(t);
    if (Number.isNaN(d.getTime())) return "";

    const startOfDay = (x) =>
      new Date(x.getFullYear(), x.getMonth(), x.getDate());
    const today = startOfDay(new Date());
    const target = startOfDay(d);
    const diffDays = Math.round((target - today) / (24 * 60 * 60 * 1000));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays > 1) return `In ${diffDays} days`;
    if (diffDays === -1) return "Yesterday";
    return `${Math.abs(diffDays)} days ago`;
  };

  useEffect(() => {
    const key = premiereCandidateIds.join("|");

    if (!key) {
      setUpcoming([]);
      setUpcomingError("");
      return;
    }

    let cancelled = false;

    (async () => {
      setUpcomingLoading(true);
      setUpcomingError("");

      try {
        // Cap to avoid too many API calls.
        const ids = premiereCandidateIds.slice(0, 30);
        const details = await Promise.all(
          ids.map((id) =>
            cachedFetchJson(`${TMDB_BASE_URL}/tv/${id}?api_key=${API_KEY}`, {
              ttlMs: 6 * 60 * 60 * 1000,
              cacheKey: `tv:${id}:details`,
            })
          )
        );

        if (cancelled) return;

        const items = (details || [])
          .map((d) => {
            const next = d?.next_episode_to_air;
            const airDate = next?.air_date;
            if (!airDate) return null;
            const t = isoDateToTime(airDate);
            if (!Number.isFinite(t)) return null;
            return {
              id: d.id,
              mediaType: "tv",
              name: d.name,
              title: d.name,
              poster_path: d.poster_path,
              air_date: airDate,
              season_number: next?.season_number,
              episode_number: next?.episode_number,
              _air_time: t,
            };
          })
          .filter(Boolean)
          .sort(
            (a, b) =>
              (a._air_time || 0) - (b._air_time || 0) ||
              String(a.name || a.title || "").localeCompare(
                String(b.name || b.title || "")
              )
          );

        setUpcoming(items);
      } catch (err) {
        console.error("Failed to load upcoming episodes", err);
        if (!cancelled) {
          setUpcoming([]);
          setUpcomingError("Could not load upcoming episodes.");
        }
      } finally {
        if (!cancelled) setUpcomingLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [premiereCandidateIds.join("|")]);

  const openDetails = async (item) => {
    setSelectedItem({ ...item, mediaType: "tv" });
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [details, credits, videos] = await Promise.all([
        cachedFetchJson(`${TMDB_BASE_URL}/tv/${item.id}?api_key=${API_KEY}`, {
          ttlMs: 6 * 60 * 60 * 1000,
        }),
        cachedFetchJson(
          `${TMDB_BASE_URL}/tv/${item.id}/credits?api_key=${API_KEY}`,
          {
            ttlMs: 24 * 60 * 60 * 1000,
          }
        ),
        cachedFetchJson(
          `${TMDB_BASE_URL}/tv/${item.id}/videos?api_key=${API_KEY}`,
          {
            ttlMs: 24 * 60 * 60 * 1000,
          }
        ),
      ]);

      setItemDetails({ ...details, credits, videos });
    } catch (err) {
      console.error("Failed to load details from TMDB", err);
      setErrorMessage("Could not load details.");
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedItem(null);
    setItemDetails(null);
    setErrorMessage("");
  };

  return (
    <div className="min-h-screen p-4 pb-20 bg-gray-900">
      <div className="sticky top-0 z-20 pt-2 pb-4 bg-gray-900">
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center text-yellow-400 hover:text-yellow-300"
          >
            <span className="mr-1">←</span> Back
          </button>
          <h2 className="text-xl font-semibold text-yellow-400 truncate max-w-[60%]">
            Upcoming
          </h2>
          <button
            type="button"
            onClick={() => navigate("/overview")}
            className="px-3 py-2 text-xs font-semibold text-yellow-300 bg-gray-800 border border-yellow-500 rounded-xl hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            Overview
          </button>
        </div>
      </div>

      {upcomingLoading && (
        <div className="py-2 text-sm text-gray-400">Loading…</div>
      )}
      {!upcomingLoading && upcomingError && (
        <div className="py-2 text-sm text-red-300">{upcomingError}</div>
      )}
      {!upcomingLoading && !upcomingError && upcoming.length === 0 && (
        <div className="py-6 text-center">
          <div className="text-gray-300">No upcoming episodes found.</div>
          <div className="mt-1 text-sm text-gray-400">
            Add some shows to watched or favorites.
          </div>
        </div>
      )}

      {!upcomingLoading && !upcomingError && upcoming.length > 0 && (
        <div className="space-y-2">
          {upcoming.map((u) => {
            const rel = relativeLabel(u.air_date);
            const isSeasonPremiere = u.episode_number === 1;

            return (
              <button
                key={`upcoming:${u.id}:${u.air_date}`}
                type="button"
                onClick={() => openDetails(u)}
                className="flex w-full overflow-hidden text-left transition border border-gray-800 rounded-lg bg-gray-900/80 hover:border-yellow-500/80 hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              >
                <div className="flex-shrink-0 w-16 sm:w-20">
                  {u.poster_path ? (
                    <img
                      src={`${IMAGE_BASE_URL}${u.poster_path}`}
                      alt={u.name}
                      className="object-cover w-full h-full"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-xs text-gray-500 bg-gray-800">
                      No image
                    </div>
                  )}
                </div>

                <div className="flex-1 px-3 py-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="text-sm font-bold text-yellow-400 sm:text-base">
                      {(u.name || "").toUpperCase()}
                    </div>
                    {rel && (
                      <div className="text-[10px] font-semibold tracking-wide text-gray-400">
                        {rel.toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="mt-0.5 text-xs text-gray-300">
                    {isSeasonPremiere ? "SEASON PREMIERE" : "NEXT EPISODE"}
                    {typeof u.season_number === "number" &&
                      typeof u.episode_number === "number" && (
                        <>
                          {" "}
                          • S{u.season_number}E{u.episode_number}
                        </>
                      )}
                    {u.air_date && <> • {fmtDate(u.air_date)}</>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
          <div className="p-6 text-center bg-gray-800 rounded-lg">
            <div className="mb-3 text-lg text-yellow-400">Loading…</div>
            <div className="w-12 h-12 mx-auto mb-3 border-4 border-yellow-400 rounded-full border-t-transparent animate-spin" />
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mt-3 text-sm text-red-300">{errorMessage}</div>
      )}

      {selectedItem && itemDetails && (
        <ShowDetailModal tv={itemDetails} onClose={closeModal} />
      )}
    </div>
  );
};

export default UpcomingPage;
