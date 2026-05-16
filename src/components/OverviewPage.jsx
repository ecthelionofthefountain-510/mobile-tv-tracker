// OverviewPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_KEY, TMDB_BASE_URL, IMAGE_BASE_URL, APP_LOCALE } from "../config";
import { loadWatchedAll, saveWatchedAll } from "../utils/watchedStorage";
import { createWatchedMovie, createWatchedShow } from "../utils/watchedMapper";
import { cachedFetchJson } from "../utils/tmdbCache";
import {
  AI_GENRES,
  loadAiPreferences,
  saveAiPreferences,
} from "../utils/aiPreferences";
import {
  loadFavorites,
  saveFavorites,
  favoriteIdentity,
} from "../utils/favoritesStorage";
import MovieDetailModal from "./MovieDetailModal";
import ShowDetailModal from "./ShowDetailModal";
import ContinueWatchingSection from "./overview/ContinueWatchingSection";
import UpcomingSection from "./overview/UpcomingSection";
import { loadAppPreference } from "../utils/appPreferences";

const OverviewPage = () => {
  const navigate = useNavigate();
  const [watched, setWatched] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemDetails, setItemDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  // AI pick
  const [aiPicks, setAiPicks] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiPrefs, setAiPrefs] = useState(() => loadAiPreferences());
  const [actorQuery, setActorQuery] = useState("");
  const [actorResults, setActorResults] = useState([]);
  const [showPrefs, setShowPrefs] = useState(false);
  const actorDebounce = useRef(null);

  const toggleGenre = (genre) => {
    setAiPrefs((prev) => {
      const exists = prev.genres.some((g) => g.name === genre.name);
      const next = {
        ...prev,
        genres: exists
          ? prev.genres.filter((g) => g.name !== genre.name)
          : [...prev.genres, genre],
      };
      saveAiPreferences(next);
      return next;
    });
  };

  const removeActor = (actorId) => {
    setAiPrefs((prev) => {
      const next = {
        ...prev,
        actors: prev.actors.filter((a) => a.id !== actorId),
      };
      saveAiPreferences(next);
      return next;
    });
  };

  const addActor = (actor) => {
    setAiPrefs((prev) => {
      if (prev.actors.some((a) => a.id === actor.id)) return prev;
      const next = {
        ...prev,
        actors: [...prev.actors, { id: actor.id, name: actor.name }],
      };
      saveAiPreferences(next);
      return next;
    });
    setActorQuery("");
    setActorResults([]);
  };

  const searchActors = (q) => {
    setActorQuery(q);
    clearTimeout(actorDebounce.current);
    if (!q.trim() || q.trim().length < 2) {
      setActorResults([]);
      return;
    }
    actorDebounce.current = setTimeout(async () => {
      try {
        const res = await cachedFetchJson(
          `${TMDB_BASE_URL}/search/person?api_key=${API_KEY}&query=${encodeURIComponent(q)}&page=1`,
          { ttlMs: 5 * 60 * 1000 },
        );
        setActorResults((res?.results || []).slice(0, 5));
      } catch {
        setActorResults([]);
      }
    }, 350);
  };

  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const toastDurationMs =
    Number(loadAppPreference("toastDurationMs", 2200)) || 2200;

  useEffect(() => {
    if (!showToast) return;
    const t = setTimeout(() => setShowToast(false), toastDurationMs);
    return () => clearTimeout(t);
  }, [showToast, toastDurationMs]);

  const notify = (message) => {
    setToastMessage(message);
    setShowToast(true);
  };

  const clearAiPreferences = () => {
    const empty = { genres: [], actors: [] };
    saveAiPreferences(empty);
    setAiPrefs(empty);
    setActorQuery("");
    setActorResults([]);
  };

  // Upcoming episodes / premieres
  const [upcoming, setUpcoming] = useState([]);
  const [upcomingLoading, setUpcomingLoading] = useState(false);
  const [upcomingError, setUpcomingError] = useState("");

  useEffect(() => {
    return () => {
      clearTimeout(actorDebounce.current);
    };
  }, []);

  const computeWatchedEpisodeCount = (show) => {
    const seasons = show?.seasons;
    if (!seasons || typeof seasons !== "object" || Array.isArray(seasons))
      return 0;
    return Object.values(seasons).reduce(
      (sum, season) => sum + (season?.watchedEpisodes?.length || 0),
      0,
    );
  };

  const computeTotalEpisodes = (show) => {
    const n = show?.number_of_episodes;
    return typeof n === "number" && n > 0 ? n : null;
  };

  const pickClientSide = async () => {
    setAiError("");
    setAiLoading(true);

    try {
      const favs = Array.isArray(favorites) ? favorites : [];
      const wat = Array.isArray(watched) ? watched : [];
      const prefs = loadAiPreferences();
      const hasPrefs = prefs.genres.length > 0 || prefs.actors.length > 0;

      const picks = [];
      const used = new Set();

      // Track already-watched/favorited IDs to avoid re-suggesting them
      const seenIds = new Set([
        ...wat.map((w) => `${w.mediaType || "tv"}:${w.id}`),
        ...favs.map((f) => `${f.mediaType || "movie"}:${f.id}`),
      ]);

      const pushPick = (item, reason) => {
        if (!item || item.id == null) return;
        const mediaType =
          item.mediaType || (item.first_air_date ? "tv" : "movie");
        const key = `${mediaType}:${String(item.id)}`;
        if (used.has(key)) return;
        used.add(key);
        picks.push({
          id: item.id,
          mediaType,
          title: item.title || item.name || "",
          reason,
        });
      };

      if (hasPrefs) {
        // Build TMDb Discover queries from preferences
        const movieGenreIds = prefs.genres
          .map((g) => g.movieId)
          .filter(Boolean)
          .join(",");
        const tvGenreIds = prefs.genres
          .map((g) => g.tvId)
          .filter(Boolean)
          .join(",");
        const actorIds = prefs.actors.map((a) => a.id).join(",");

        const reasonParts = [];
        if (prefs.genres.length > 0)
          reasonParts.push(prefs.genres.map((g) => g.name).join(", "));
        if (prefs.actors.length > 0)
          reasonParts.push(prefs.actors.map((a) => a.name).join(", "));
        const reason = `Matches your preferences: ${reasonParts.join(" · ")}`;

        const fetchDiscover = async (type, genreIds) => {
          const params = new URLSearchParams({
            api_key: API_KEY,
            language: "en-US",
            sort_by: "popularity.desc",
            "vote_count.gte": "50",
            page: "1",
          });
          if (genreIds) params.set("with_genres", genreIds);
          if (actorIds) {
            if (type === "movie") params.set("with_cast", actorIds);
            else params.set("with_people", actorIds);
          }
          try {
            const res = await cachedFetchJson(
              `${TMDB_BASE_URL}/discover/${type}?${params}`,
              { ttlMs: 30 * 60 * 1000 },
            );
            return (res?.results || []).map((r) => ({
              ...r,
              mediaType: type === "tv" ? "tv" : "movie",
            }));
          } catch {
            return [];
          }
        };

        const [movieResults, tvResults] = await Promise.all([
          movieGenreIds || actorIds
            ? fetchDiscover("movie", movieGenreIds)
            : [],
          tvGenreIds || actorIds ? fetchDiscover("tv", tvGenreIds) : [],
        ]);

        // Interleave movie and TV results, skip already seen
        const combined = [];
        const maxLen = Math.max(movieResults.length, tvResults.length);
        for (let i = 0; i < maxLen && combined.length < 8; i++) {
          if (i < tvResults.length) combined.push(tvResults[i]);
          if (i < movieResults.length) combined.push(movieResults[i]);
        }

        for (const item of combined) {
          const key = `${item.mediaType}:${item.id}`;
          if (!seenIds.has(key)) pushPick(item, reason);
          if (picks.length >= 3) break;
        }

        // If discover didn't fill 3 slots, pad with in-progress shows
        if (picks.length < 3) {
          const inProgress = wat
            .filter(
              (i) =>
                (i?.mediaType || (i?.first_air_date ? "tv" : "movie")) === "tv",
            )
            .filter(
              (s) => !s.completed && (s.watchedEpisodes?.length || 0) > 0,
            );
          for (const s of inProgress) {
            pushPick(s, "Continue where you left off.");
            if (picks.length >= 3) break;
          }
        }
      } else {
        // Original logic — no preferences set
        const inProgressShows = wat
          .filter(
            (i) =>
              (i?.mediaType || (i?.first_air_date ? "tv" : "movie")) === "tv",
          )
          .map((s) => {
            const watchedEpisodes = computeWatchedEpisodeCount(s);
            const totalEpisodes = computeTotalEpisodes(s);
            const completed =
              typeof totalEpisodes === "number"
                ? watchedEpisodes >= totalEpisodes
                : !!s?.completed;
            return {
              raw: s,
              watchedEpisodes,
              totalEpisodes,
              completed,
              ratio:
                typeof totalEpisodes === "number" && totalEpisodes > 0
                  ? watchedEpisodes / totalEpisodes
                  : null,
            };
          })
          .filter((x) => !x.completed && x.watchedEpisodes > 0)
          .sort((a, b) => {
            if (a.ratio != null && b.ratio != null) return b.ratio - a.ratio;
            if (a.ratio != null) return -1;
            if (b.ratio != null) return 1;
            return (b.watchedEpisodes || 0) - (a.watchedEpisodes || 0);
          });

        if (inProgressShows.length > 0) {
          const best = inProgressShows[0];
          const r =
            best.totalEpisodes != null
              ? `Continue where you left off (${best.watchedEpisodes}/${best.totalEpisodes} episodes).`
              : `Continue where you left off (${best.watchedEpisodes} episodes watched).`;
          pushPick(best.raw, r);
        }

        if (favs.length > 0) {
          const shuffled = [...favs].sort(() => Math.random() - 0.5);
          const candidate = shuffled.find((x) => x && x.id != null);
          if (candidate)
            pushPick(candidate, "A favourite that usually delivers.");
        }

        if (picks.length < 3) {
          const secondShow = inProgressShows.find((x) => {
            const mt =
              x.raw.mediaType || (x.raw.first_air_date ? "tv" : "movie");
            return !used.has(`${mt}:${String(x.raw.id)}`);
          });
          if (secondShow) pushPick(secondShow.raw, "Good to chip away at.");
        }

        if (picks.length < 3 && favs.length > 1) {
          const shuffled = [...favs].sort(() => Math.random() - 0.5);
          for (const f of shuffled) {
            const mt = f.mediaType || (f.first_air_date ? "tv" : "movie");
            if (used.has(`${mt}:${String(f.id)}`)) continue;
            pushPick(f, "Something easy and familiar.");
            break;
          }
        }
      }

      setAiPicks(picks);
      if (picks.length === 0) {
        setAiError(
          hasPrefs
            ? "No new titles found for your preferences — try adjusting genres or actors."
            : "No suggestions yet — add a favourite or start watching something.",
        );
      }
    } catch (e) {
      console.error(e);
      setAiError("Could not fetch suggestions right now.");
    } finally {
      setAiLoading(false);
    }
  };

  // Ladda watched + favorites
  useEffect(() => {
    (async () => {
      try {
        setErrorMessage("");
        const allWatched = await loadWatchedAll();
        setWatched(allWatched || []);
        setFavorites(await loadFavorites());
      } catch (err) {
        console.error("Failed to load overview data", err);
        setWatched([]);
        setFavorites([]);
        setErrorMessage("Could not load your data.");
      }
    })();
  }, []);

  const mediaTypeOf = (item) =>
    item?.mediaType ||
    (item?.seasons ? "tv" : item?.first_air_date ? "tv" : "movie");

  const sameEntry = (a, b) =>
    String(a?.id) === String(b?.id) && mediaTypeOf(a) === mediaTypeOf(b);

  const isShow = (item) =>
    item.mediaType === "tv" || !!item.seasons || item.type === "show";

  const watchedShows = watched.filter(isShow);

  const continueWatching = useMemo(() => {
    return watchedShows
      .map((show) => {
        const watchedEpisodes = computeWatchedEpisodeCount(show);
        const totalEpisodes = computeTotalEpisodes(show);
        const completed =
          typeof totalEpisodes === "number"
            ? watchedEpisodes >= totalEpisodes
            : !!show?.completed;

        if (completed || watchedEpisodes <= 0) return null;

        return {
          ...show,
          watchedEpisodes,
          totalEpisodes,
          progressLabel:
            typeof totalEpisodes === "number"
              ? `${watchedEpisodes}/${totalEpisodes} episodes`
              : `${watchedEpisodes} episodes watched`,
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0))
      .slice(0, 3);
  }, [watchedShows]);

  const premiereCandidateIds = useMemo(() => {
    const ids = new Set();

    for (const w of watchedShows) {
      const mediaType = w?.mediaType || (w?.first_air_date ? "tv" : "movie");
      if (mediaType !== "tv") continue;
      if (w?.id == null) continue;
      // Prefer in-progress if we know completion
      if (w?.completed === true) continue;
      ids.add(String(w.id));
    }

    for (const f of favorites) {
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
      return d.toLocaleDateString(APP_LOCALE, {
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
        // Fetch a wider set, then sort by air date and trim.
        // If we slice too early we might miss the soonest upcoming item.
        const ids = premiereCandidateIds.slice(0, 30);
        const details = await Promise.all(
          ids.map((id) =>
            cachedFetchJson(`${TMDB_BASE_URL}/tv/${id}?api_key=${API_KEY}`, {
              ttlMs: 6 * 60 * 60 * 1000,
              cacheKey: `tv:${id}:details`,
            }),
          ),
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
                String(b.name || b.title || ""),
              ),
          );

        // Keep it short and relevant
        setUpcoming(items.slice(0, 8));
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

  const toggleFavorite = async (item) => {
    const normalizedItem = {
      ...item,
      mediaType: item.mediaType || (item.first_air_date ? "tv" : "movie"),
    };

    const prevFavorites = favorites;

    const exists = favorites.some(
      (f) => favoriteIdentity(f) === favoriteIdentity(normalizedItem),
    );
    const updated = exists
      ? favorites.filter(
          (f) => favoriteIdentity(f) !== favoriteIdentity(normalizedItem),
        )
      : [...favorites, normalizedItem];

    setFavorites(updated);
    const ok = await saveFavorites(updated);
    if (!ok) {
      setFavorites(prevFavorites);
      notify("Could not save favorites (storage blocked or full).");
      return;
    }
    notify(
      exists
        ? `"${item.title || item.name}" removed from favorites.`
        : `"${item.title || item.name}" added to favorites.`,
    );
  };

  const toggleWatched = async (item) => {
    const allWatched = await loadWatchedAll();
    const alreadyExists = allWatched.some((w) => sameEntry(w, item));
    if (alreadyExists) {
      const updatedAll = allWatched.filter((w) => !sameEntry(w, item));
      await saveWatchedAll(updatedAll);
      setWatched(updatedAll);
      notify(`"${item.title || item.name}" removed from watched.`);
      return;
    }

    let base;
    if (item.mediaType === "tv") {
      base = createWatchedShow(item);
    } else {
      base = createWatchedMovie(item);
    }

    if (item.mediaType === "tv") {
      try {
        const numberOfSeasons =
          item.number_of_seasons ?? base.number_of_seasons;
        let finalSeasons = base.seasons;

        // För progress i listvyn: säkerställ att vi sparar totalavsnitt om möjligt
        if (
          typeof base.number_of_episodes !== "number" ||
          base.number_of_episodes <= 0
        ) {
          if (
            typeof item.number_of_episodes === "number" &&
            item.number_of_episodes > 0
          ) {
            base.number_of_episodes = item.number_of_episodes;
          }
        }

        const needsDetailsFetch =
          !numberOfSeasons ||
          typeof base.number_of_episodes !== "number" ||
          base.number_of_episodes <= 0;

        let tvDetails = null;
        if (needsDetailsFetch) {
          tvDetails = await cachedFetchJson(
            `${TMDB_BASE_URL}/tv/${item.id}?api_key=${API_KEY}`,
            { ttlMs: 6 * 60 * 60 * 1000 },
          );
        }

        if (!numberOfSeasons) {
          const seasonsCount = tvDetails?.number_of_seasons || 0;
          finalSeasons = {};
          for (let i = 1; i <= seasonsCount; i++) {
            finalSeasons[i] = { watchedEpisodes: [] };
          }
          base.number_of_seasons = seasonsCount;
        } else {
          finalSeasons = {};
          for (let i = 1; i <= numberOfSeasons; i++) {
            finalSeasons[i] = { watchedEpisodes: [] };
          }
          base.number_of_seasons = numberOfSeasons;
        }

        if (
          (typeof base.number_of_episodes !== "number" ||
            base.number_of_episodes <= 0) &&
          typeof tvDetails?.number_of_episodes === "number" &&
          tvDetails.number_of_episodes > 0
        ) {
          base.number_of_episodes = tvDetails.number_of_episodes;
        }

        base.seasons = finalSeasons;
      } catch (error) {
        console.error("Error fetching TV show details:", error);
      }
    }

    const updatedAll = [...allWatched, base];
    await saveWatchedAll(updatedAll);
    setWatched(updatedAll);
    notify(`"${item.title || item.name}" added to watched.`);
  };

  const getActionItem = () => {
    if (!selectedItem || !itemDetails) return null;

    const title =
      selectedItem.title || itemDetails.title || itemDetails.name || "";

    return {
      ...selectedItem,
      ...itemDetails,
      mediaType: selectedItem.mediaType,
      title,
      name: itemDetails.name || selectedItem.name,
    };
  };

  const openDetails = async (item) => {
    const mediaType = item.mediaType || (item.seasons ? "tv" : "movie");

    setSelectedItem({ ...item, mediaType });
    setIsLoading(true);
    setErrorMessage("");

    const endpoint = mediaType === "tv" ? "tv" : "movie";

    try {
      const [details, credits, videos] = await Promise.all([
        cachedFetchJson(
          `${TMDB_BASE_URL}/${endpoint}/${item.id}?api_key=${API_KEY}`,
          { ttlMs: 6 * 60 * 60 * 1000 },
        ),
        cachedFetchJson(
          `${TMDB_BASE_URL}/${endpoint}/${item.id}/credits?api_key=${API_KEY}`,
          { ttlMs: 24 * 60 * 60 * 1000 },
        ),
        cachedFetchJson(
          `${TMDB_BASE_URL}/${endpoint}/${item.id}/videos?api_key=${API_KEY}`,
          { ttlMs: 24 * 60 * 60 * 1000 },
        ),
      ]);

      setItemDetails({ ...details, credits, videos });
    } catch (err) {
      console.error("Failed to load details from TMDB", err);
      setErrorMessage("Could not load details.");
      notify("Could not load details.");
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
    <div className="app-page">
      <div className="app-container">
        {showToast && (
          <div className="fixed z-50 -translate-x-1/2 left-1/2 bottom-24">
            <button
              type="button"
              onClick={() => setShowToast(false)}
              className="app-toast app-toast-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              {toastMessage}
            </button>
          </div>
        )}

        <h1 className="mb-4 text-2xl font-bold text-gray-100">Overview</h1>

        {errorMessage && (
          <div className="mb-3 text-sm text-red-300">{errorMessage}</div>
        )}

        <ContinueWatchingSection
          items={continueWatching}
          onOpen={openDetails}
        />

        <UpcomingSection
          upcoming={upcoming}
          loading={upcomingLoading}
          error={upcomingError}
          onOpen={openDetails}
          onSeeAll={() => navigate("/upcoming")}
          relativeLabel={relativeLabel}
          fmtDate={fmtDate}
          imageBaseUrl={IMAGE_BASE_URL}
        />

        {/* AI pick */}
        <div className="app-panel relative mb-6 overflow-hidden p-4">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-yellow-300/5 via-transparent to-yellow-500/5" />

          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-100">
                <span aria-hidden className="text-yellow-300">
                  ✦
                </span>
                AI pick
              </h2>
              <p className="mt-1 text-xs text-gray-400">
                Personalized suggestions based on your watch history.
              </p>
            </div>

            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
              {(aiPrefs.genres.length > 0 || aiPrefs.actors.length > 0) && (
                <button
                  type="button"
                  onClick={clearAiPreferences}
                  className="app-button-ghost px-3 py-2 text-xs"
                >
                  Reset
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowPrefs((v) => !v)}
                className={
                  "app-chip px-3 py-2 text-xs " +
                  (showPrefs ||
                  aiPrefs.genres.length > 0 ||
                  aiPrefs.actors.length > 0
                    ? "app-chip-active"
                    : "")
                }
                aria-label="Toggle preferences"
              >
                Preferences
                {aiPrefs.genres.length + aiPrefs.actors.length > 0
                  ? ` (${aiPrefs.genres.length + aiPrefs.actors.length})`
                  : ""}
              </button>
              <button
                type="button"
                onClick={pickClientSide}
                disabled={aiLoading}
                className="ai-pick-cta app-button-primary relative isolate overflow-hidden px-4 py-2.5 text-sm font-bold tracking-wide uppercase disabled:opacity-60"
              >
                {aiLoading ? "Thinking..." : "Pick"}
              </button>
            </div>
          </div>

          {/* Preferences panel */}
          {showPrefs && (
            <div className="relative mt-4 space-y-4 border-t border-white/10 pt-4">
              {/* Actor search */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Actors / Directors
                </p>
                <div className="relative">
                  <input
                    type="text"
                    value={actorQuery}
                    onChange={(e) => searchActors(e.target.value)}
                    placeholder="Search by name..."
                    className="app-input w-full"
                  />
                  {actorResults.length > 0 && (
                    <div className="app-stagger-list absolute z-[60] mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-white/10 bg-gray-900 shadow-xl">
                      {actorResults.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => addActor(a)}
                          className="app-stagger-item flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-100 transition-colors hover:bg-white/5"
                        >
                          {a.profile_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w45${a.profile_path}`}
                              alt={a.name}
                              className="h-7 w-7 flex-shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-7 w-7 flex-shrink-0 rounded-full bg-gray-700" />
                          )}
                          <span>{a.name}</span>
                          {a.known_for_department && (
                            <span className="ml-auto text-xs text-gray-500">
                              {a.known_for_department}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {aiPrefs.actors.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {aiPrefs.actors.map((a) => (
                      <span
                        key={a.id}
                        className="inline-flex items-center gap-1 rounded-full border border-yellow-400/30 bg-yellow-400/15 px-2.5 py-1 text-xs font-semibold text-yellow-200"
                      >
                        {a.name}
                        <button
                          type="button"
                          onClick={() => removeActor(a.id)}
                          aria-label={`Remove ${a.name}`}
                          className="ml-0.5 text-yellow-400 transition-colors hover:text-yellow-200"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Genre chips */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Genres
                </p>
                <div className="flex flex-wrap gap-2">
                  {AI_GENRES.map((g) => {
                    const active = aiPrefs.genres.some(
                      (x) => x.name === g.name,
                    );
                    return (
                      <button
                        key={g.name}
                        type="button"
                        onClick={() => toggleGenre(g)}
                        className={
                          "app-chip " + (active ? "app-chip-active" : "")
                        }
                      >
                        {g.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 border-t border-white/10" />

          {aiError && (
            <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {aiError}
            </div>
          )}

          {aiPicks.length > 0 && (
            <div className="app-stagger-list mt-3 space-y-2">
              {aiPicks.map((p, idx) => (
                <button
                  key={`${p.mediaType}:${p.id}`}
                  type="button"
                  onClick={() =>
                    openDetails({
                      id: p.id,
                      mediaType: p.mediaType,
                      title: p.title,
                      name: p.title,
                    })
                  }
                  className="app-card app-card-hover app-stagger-item w-full p-3 text-left"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-bold text-gray-100">
                      {(p.title || "").toUpperCase()}
                    </div>
                    <div className="app-pill text-[10px]">#{idx + 1}</div>
                  </div>
                  {p.reason && (
                    <div className="mt-1 text-xs text-gray-300">{p.reason}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detalj-modal */}
        {selectedItem &&
          !isLoading &&
          itemDetails &&
          (selectedItem.mediaType === "tv" ? (
            <ShowDetailModal
              show={itemDetails}
              onClose={closeModal}
              showActions
              isWatched={watched.some((w) => sameEntry(w, selectedItem))}
              isFavorited={favorites.some(
                (f) => favoriteIdentity(f) === favoriteIdentity(selectedItem),
              )}
              onAddToWatched={(show) => {
                const actionItem = getActionItem();
                if (actionItem) toggleWatched({ ...actionItem, ...show });
              }}
              onAddToFavorites={(show) => {
                const actionItem = getActionItem();
                if (actionItem) toggleFavorite({ ...actionItem, ...show });
              }}
            />
          ) : (
            <MovieDetailModal
              movie={itemDetails}
              onClose={closeModal}
              showActions
              isWatched={watched.some((w) => sameEntry(w, selectedItem))}
              isFavorited={favorites.some(
                (f) => favoriteIdentity(f) === favoriteIdentity(selectedItem),
              )}
              onAddToWatched={(movie) => {
                const actionItem = getActionItem();
                if (actionItem) toggleWatched({ ...actionItem, ...movie });
              }}
              onAddToFavorites={(movie) => {
                const actionItem = getActionItem();
                if (actionItem) toggleFavorite({ ...actionItem, ...movie });
              }}
            />
          ))}
      </div>
    </div>
  );
};

export default OverviewPage;
