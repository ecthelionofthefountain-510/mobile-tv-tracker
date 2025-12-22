// OverviewPage.jsx
import React, { useEffect, useState } from "react";
import { API_KEY, TMDB_BASE_URL, IMAGE_BASE_URL } from "../config";
import { loadWatchedAll, saveWatchedAll } from "../utils/watchedStorage";
import { createWatchedMovie, createWatchedShow } from "../utils/watchedMapper";
import { cachedFetchJson } from "../utils/tmdbCache";
import MovieDetailModal from "./MovieDetailModal";
import ShowDetailModal from "./ShowDetailModal";

const GENRE_MAP = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};

const OverviewPage = () => {
  const [watched, setWatched] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemDetails, setItemDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // AI pick
  const [aiPicks, setAiPicks] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!showToast) return;
    const t = setTimeout(() => setShowToast(false), 2200);
    return () => clearTimeout(t);
  }, [showToast]);

  const notify = (message) => {
    setToastMessage(message);
    setShowToast(true);
  };

  // Recommendations
  const [recommendations, setRecommendations] = useState([]);
  const [recContext, setRecContext] = useState(null);
  const [isRecLoading, setIsRecLoading] = useState(false);

  const computeWatchedEpisodeCount = (show) => {
    const seasons = show?.seasons;
    if (!seasons || typeof seasons !== "object" || Array.isArray(seasons))
      return 0;
    return Object.values(seasons).reduce(
      (sum, season) => sum + (season?.watchedEpisodes?.length || 0),
      0
    );
  };

  const computeTotalEpisodes = (show) => {
    const n = show?.number_of_episodes;
    return typeof n === "number" && n > 0 ? n : null;
  };

  const pickClientSide = () => {
    setAiError("");
    setAiLoading(true);

    // tiny delay so the button feels responsive
    setTimeout(() => {
      try {
        const favs = Array.isArray(favorites) ? favorites : [];
        const wat = Array.isArray(watched) ? watched : [];

        const inProgressShows = wat
          .filter(
            (i) =>
              (i?.mediaType || (i?.first_air_date ? "tv" : "movie")) === "tv"
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
            // Prefer close-to-finish when we have totals; otherwise prefer most watched episodes
            if (a.ratio != null && b.ratio != null) return b.ratio - a.ratio;
            if (a.ratio != null) return -1;
            if (b.ratio != null) return 1;
            return (b.watchedEpisodes || 0) - (a.watchedEpisodes || 0);
          });

        const picks = [];
        const used = new Set();

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

        // 1) Always try: one in-progress show
        if (inProgressShows.length > 0) {
          const best = inProgressShows[0];
          const r =
            best.totalEpisodes != null
              ? `Fortsätt där du slutade (${best.watchedEpisodes}/${best.totalEpisodes} avsnitt).`
              : `Fortsätt där du slutade (${best.watchedEpisodes} avsnitt markerade).`;
          pushPick(best.raw, r);
        }

        // 2) Add one favorite (random)
        if (favs.length > 0) {
          const shuffled = [...favs].sort(() => Math.random() - 0.5);
          const candidate = shuffled.find((x) => x && x.id != null);
          if (candidate) {
            pushPick(candidate, "En favorit som brukar leverera.");
          }
        }

        // 3) Optional second in-progress or second favorite
        if (picks.length < 3) {
          const secondShow = inProgressShows.find((x) => {
            const mediaType =
              x.raw.mediaType || (x.raw.first_air_date ? "tv" : "movie");
            return !used.has(`${mediaType}:${String(x.raw.id)}`);
          });
          if (secondShow) {
            pushPick(secondShow.raw, "Bra att beta av lite till.");
          }
        }

        if (picks.length < 3 && favs.length > 1) {
          const shuffled = [...favs].sort(() => Math.random() - 0.5);
          for (const f of shuffled) {
            const mediaType =
              f.mediaType || (f.first_air_date ? "tv" : "movie");
            if (used.has(`${mediaType}:${String(f.id)}`)) continue;
            pushPick(f, "Om du vill ha något lätt och tryggt.");
            break;
          }
        }

        setAiPicks(picks);
        if (picks.length === 0) {
          setAiError(
            "Inga förslag just nu (lägg till en favorit eller börja titta på en serie)."
          );
        }
      } catch (e) {
        console.error(e);
        setAiError("Kunde inte ta fram ett förslag just nu.");
      } finally {
        setAiLoading(false);
      }
    }, 200);
  };

  // Ladda watched + favorites
  useEffect(() => {
    (async () => {
      const allWatched = await loadWatchedAll();
      setWatched(allWatched || []);
      const favs = JSON.parse(localStorage.getItem("favorites")) || [];
      setFavorites(favs);
    })();
  }, []);

  const isShow = (item) =>
    item.mediaType === "tv" || !!item.seasons || item.type === "show";

  const isMovie = (item) =>
    item.mediaType === "movie" || (!item.seasons && item.type !== "show");

  const watchedShows = watched.filter(isShow);
  const watchedMovies = watched.filter(isMovie);

  const totalEpisodesWatched = watchedShows.reduce((sum, show) => {
    const seasons = show.seasons || {};
    const seasonEpisodeCount = Object.values(seasons).reduce(
      (s, season) => s + (season.watchedEpisodes?.length || 0),
      0
    );
    return sum + seasonEpisodeCount;
  }, 0);

  // Genre-statistik
  const genreCounts = {};
  watched.forEach((item) => {
    let genreNames = [];

    if (Array.isArray(item.genres) && item.genres.length > 0) {
      genreNames = item.genres.map((g) => g.name).filter(Boolean);
    } else if (Array.isArray(item.genre_ids) && item.genre_ids.length > 0) {
      genreNames = item.genre_ids.map((id) => GENRE_MAP[id]).filter(Boolean);
    }

    // undvik dubbletter i samma titel
    genreNames = Array.from(new Set(genreNames));

    genreNames.forEach((name) => {
      genreCounts[name] = (genreCounts[name] || 0) + 1;
    });
  });

  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const recentWatched = [...watched].slice(-5).reverse();
  const recentFavorites = [...favorites].slice(-5).reverse();

  const toggleFavorite = (item) => {
    const exists = favorites.some((f) => f.id === item.id);
    const updated = exists
      ? favorites.filter((f) => f.id !== item.id)
      : [...favorites, item];

    setFavorites(updated);
    localStorage.setItem("favorites", JSON.stringify(updated));
    notify(
      exists
        ? `"${item.title || item.name}" removed from favorites.`
        : `"${item.title || item.name}" added to favorites.`
    );
  };

  const toggleWatched = async (item) => {
    const sameId = (a, b) => String(a) === String(b);
    const allWatched = await loadWatchedAll();
    const alreadyExists = allWatched.some((w) => sameId(w.id, item.id));
    if (alreadyExists) {
      const updatedAll = allWatched.filter((w) => !sameId(w.id, item.id));
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
            { ttlMs: 6 * 60 * 60 * 1000 }
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

    const endpoint = mediaType === "tv" ? "tv" : "movie";

    try {
      const [details, credits, videos] = await Promise.all([
        cachedFetchJson(
          `${TMDB_BASE_URL}/${endpoint}/${item.id}?api_key=${API_KEY}`,
          { ttlMs: 6 * 60 * 60 * 1000 }
        ),
        cachedFetchJson(
          `${TMDB_BASE_URL}/${endpoint}/${item.id}/credits?api_key=${API_KEY}`,
          { ttlMs: 24 * 60 * 60 * 1000 }
        ),
        cachedFetchJson(
          `${TMDB_BASE_URL}/${endpoint}/${item.id}/videos?api_key=${API_KEY}`,
          { ttlMs: 24 * 60 * 60 * 1000 }
        ),
      ]);

      setItemDetails({ ...details, credits, videos });
    } catch (err) {
      console.error("Failed to load details from TMDB", err);
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedItem(null);
    setItemDetails(null);
  };

  const getYear = (item) => {
    if (item.release_date) return new Date(item.release_date).getFullYear();
    if (item.first_air_date) return new Date(item.first_air_date).getFullYear();
    return null;
  };

  const getSeasonsCount = (item) =>
    item.mediaType === "tv"
      ? item.number_of_seasons ||
        (item.seasons ? Object.keys(item.seasons).length : null)
      : null;

  // Highlight-hjälpare
  const topRatedMovie =
    watchedMovies.length > 0
      ? watchedMovies.reduce((best, curr) =>
          (curr.vote_average || 0) > (best.vote_average || 0) ? curr : best
        )
      : null;

  const topRatedShow =
    watchedShows.length > 0
      ? watchedShows.reduce((best, curr) =>
          (curr.vote_average || 0) > (best.vote_average || 0) ? curr : best
        )
      : null;

  const longestShow =
    watchedShows.length > 0
      ? watchedShows.reduce((best, curr) => {
          const bestSeasons = getSeasonsCount(best) || 0;
          const currSeasons = getSeasonsCount(curr) || 0;
          return currSeasons > bestSeasons ? curr : best;
        })
      : null;

  // Because you watched...
  const fetchRecommendations = async () => {
    if (!watched || watched.length === 0) return;

    const candidates = watched.filter(
      (i) => Array.isArray(i.genre_ids) && i.genre_ids.length > 0
    );

    if (candidates.length === 0) {
      setRecommendations([]);
      setRecContext(null);
      return;
    }

    const seed = candidates[Math.floor(Math.random() * candidates.length)];
    const genreIds = seed.genre_ids;
    const chosenGenreId = genreIds[Math.floor(Math.random() * genreIds.length)];

    const mediaType = isShow(seed) ? "tv" : "movie";
    const endpoint = mediaType === "tv" ? "tv" : "movie";

    setIsRecLoading(true);
    setRecContext({
      title: seed.title || seed.name || "",
      mediaType,
    });

    try {
      const res = await fetch(
        `${TMDB_BASE_URL}/discover/${endpoint}?api_key=${API_KEY}&with_genres=${chosenGenreId}&sort_by=popularity.desc`
      );
      const data = await res.json();
      const all = data.results || [];

      const watchedIds = new Set(watched.map((w) => w.id));

      const cleaned = all
        .filter((item) => !watchedIds.has(item.id))
        .slice(0, 8)
        .map((item) => ({
          ...item,
          mediaType,
          title: item.title || item.name,
        }));

      setRecommendations(cleaned);
    } catch (err) {
      console.error("Failed to fetch recommendations", err);
      setRecommendations([]);
    } finally {
      setIsRecLoading(false);
    }
  };

  // Trigga recommendations när watched uppdateras
  useEffect(() => {
    if (watched.length > 0) {
      fetchRecommendations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watched]);

  const renderSmallCard = (label, item, key) => {
    if (!item) return null;

    const year = getYear(item);
    const seasonsCount = getSeasonsCount(item);
    const rating =
      typeof item.vote_average === "number"
        ? item.vote_average.toFixed(1)
        : null;

    return (
      <button
        key={key}
        type="button"
        onClick={() => openDetails(item)}
        className="flex w-full overflow-hidden text-left transition border border-gray-800 rounded-lg bg-gray-900/80 hover:border-yellow-500/80 hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
      >
        <div className="flex-shrink-0 w-16 sm:w-20">
          {item.poster_path ? (
            <img
              src={`${IMAGE_BASE_URL}${item.poster_path}`}
              alt={item.title || item.name}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-xs text-gray-500 bg-gray-800">
              No image
            </div>
          )}
        </div>
        <div className="flex-1 px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            {label}
          </div>
          <div className="text-sm font-bold text-yellow-400 sm:text-base">
            {(item.title || item.name || "").toUpperCase()}
          </div>
          <div className="mt-0.5 text-xs text-gray-300">
            {/* Rad 1: typ + år */}
            <div>
              {item.mediaType === "tv" ? "TV SHOW" : "MOVIE"}
              {year && <> • {year}</>}
            </div>

            {/* Rad 2: säsonger + betyg */}
            <div>
              {seasonsCount && (
                <>
                  {seasonsCount} SEASON{seasonsCount > 1 ? "S" : ""}{" "}
                </>
              )}
              {rating && <> ⭐ {rating}</>}
            </div>

            {/* Rad 3: genres */}
            {item.genres && item.genres.length > 0 && (
              <div className="mt-0.5 text-[10px] text-gray-400">
                {item.genres.map((g) => g.name).join(" • ")}
              </div>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-screen p-4 pb-20">
      {showToast && (
        <div className="fixed z-50 -translate-x-1/2 left-1/2 bottom-24">
          <button
            type="button"
            onClick={() => setShowToast(false)}
            className="px-4 py-2 text-sm text-gray-100 bg-gray-900 border border-gray-700 rounded-lg shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            {toastMessage}
          </button>
        </div>
      )}

      <h1 className="mb-4 text-2xl font-bold text-yellow-400">Overview</h1>

      {/* Snabba siffror */}
      <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-4">
        <div className="p-3 text-center border rounded-lg bg-gray-900/80 border-yellow-500/60">
          <div className="text-xs text-gray-400">Total watched</div>
          <div className="text-2xl font-bold text-yellow-400">
            {watched.length}
          </div>
        </div>
        <div className="p-3 text-center border rounded-lg bg-gray-900/80 border-yellow-500/60">
          <div className="text-xs text-gray-400">Movies</div>
          <div className="text-2xl font-bold text-yellow-400">
            {watchedMovies.length}
          </div>
        </div>
        <div className="p-3 text-center border rounded-lg bg-gray-900/80 border-yellow-500/60">
          <div className="text-xs text-gray-400">Shows</div>
          <div className="text-2xl font-bold text-yellow-400">
            {watchedShows.length}
          </div>
        </div>
        <div className="p-3 text-center border rounded-lg bg-gray-900/80 border-yellow-500/60">
          <div className="text-xs text-gray-400">Favorites</div>
          <div className="text-2xl font-bold text-yellow-400">
            {favorites.length}
          </div>
        </div>
      </div>

      {/* Avsnitts-statistik */}
      <div className="p-4 mb-6 border border-gray-700 rounded-lg bg-gray-900/80">
        <h2 className="mb-2 text-lg font-semibold text-yellow-400">
          Episode progress
        </h2>
        <p className="text-sm text-gray-300">
          You have tracked{" "}
          <span className="font-semibold text-yellow-400">
            {totalEpisodesWatched}
          </span>{" "}
          watched episodes across{" "}
          <span className="font-semibold text-yellow-400">
            {watchedShows.length}
          </span>{" "}
          shows.
        </p>
      </div>

      {/* AI pick */}
      <div className="relative p-4 mb-6 overflow-hidden border rounded-lg border-yellow-500/30 bg-gradient-to-br from-gray-900/80 via-gray-900/90 to-gray-800/60 ring-1 ring-yellow-500/15">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-yellow-400">
                <span aria-hidden>✦</span>
                AI pick
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={pickClientSide}
            disabled={aiLoading}
            className="ai-pick-cta relative isolate overflow-hidden px-4 py-1.5 text-sm font-bold tracking-wide text-gray-900 uppercase transition bg-yellow-500 rounded-lg shadow-lg hover:bg-yellow-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:opacity-60"
          >
            {aiLoading ? "Thinking..." : "Pick something"}
          </button>
        </div>

        <div className="mt-3 border-t border-yellow-500/10" />

        {aiError && <div className="mt-3 text-sm text-red-300">{aiError}</div>}

        {aiPicks.length > 0 && (
          <div className="mt-3 space-y-2">
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
                className="w-full p-3 text-left transition border rounded-lg border-yellow-500/20 bg-gray-900/70 hover:border-yellow-500/70 hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="text-sm font-bold text-yellow-400">
                    {(p.title || "").toUpperCase()}
                  </div>
                  <div className="text-[10px] font-semibold tracking-wide text-gray-400">
                    #{idx + 1}
                  </div>
                </div>
                {p.reason && (
                  <div className="mt-1 text-xs text-gray-300">{p.reason}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Genre breakdown */}
      {topGenres.length > 0 && (
        <div className="p-4 mb-6 border border-gray-700 rounded-lg bg-gray-900/80">
          <h2 className="mb-2 text-lg font-semibold text-yellow-400">
            Top genres
          </h2>
          <p className="mb-3 text-sm text-gray-300">
            Based on your watched movies and shows.
          </p>
          <div className="flex flex-wrap gap-2">
            {topGenres.map(([name, count]) => (
              <span
                key={name}
                className="px-3 py-1 text-xs font-semibold tracking-wide text-yellow-300 uppercase border rounded-full border-yellow-500/70 bg-gray-900/90"
              >
                {name} <span className="text-gray-300">· {count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Because you watched ... */}
      {(isRecLoading || recommendations.length > 0) && (
        <section className="mt-8">
          <h2 className="mb-2 text-xl font-bold tracking-wide text-yellow-400 uppercase">
            Because you watched{" "}
            {recContext?.title
              ? recContext.title.toUpperCase()
              : "one of your shows"}
          </h2>

          {isRecLoading && (
            <div className="py-4 text-sm text-yellow-400">
              Finding similar{" "}
              {recContext?.mediaType === "tv" ? "shows" : "movies"}...
            </div>
          )}

          {!isRecLoading && recommendations.length > 0 && (
            <div className="space-y-3">
              {recommendations.map((item) =>
                renderSmallCard("Recommended", item, item.id)
              )}
            </div>
          )}
        </section>
      )}

      {/* Detalj-modal */}
      {selectedItem &&
        !isLoading &&
        itemDetails &&
        (selectedItem.mediaType === "tv" ? (
          <ShowDetailModal
            show={itemDetails}
            onClose={closeModal}
            showActions
            isWatched={watched.some((w) => w.id === selectedItem.id)}
            isFavorited={favorites.some((f) => f.id === selectedItem.id)}
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
            isWatched={watched.some((w) => w.id === selectedItem.id)}
            isFavorited={favorites.some((f) => f.id === selectedItem.id)}
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
  );
};

export default OverviewPage;
