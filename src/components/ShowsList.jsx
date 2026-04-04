// ShowsList.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { API_KEY, TMDB_BASE_URL } from "../config";
import ShowDetail from "./ShowDetail";
import SwipeableShowCard from "./SwipeableShowCard";
import ShowDetailModal from "./ShowDetailModal";
import BackupControls from "./BackupControls";
import { useWatchedList } from "../hooks/useWatchedList";
import { cachedFetchJson } from "../utils/tmdbCache";
import SearchIcon from "../icons/SearchIcon";
import {
  loadFavorites,
  saveFavorites,
  favoriteIdentity,
} from "../utils/favoritesStorage";

// ev. SwipeInfoToast om du har den
// import SwipeInfoToast from "./SwipeInfoToast";

const ShowsList = () => {
  const [filteredShows, setFilteredShows] = useState([]);
  const [selectedShow, setSelectedShow] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForModal, setShowForModal] = useState(null);
  const [showDetails, setShowDetails] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [sortBy, setSortBy] = useState("dateAdded");
  const [showSwipeInfo, setShowSwipeInfo] = useState(false);

  const listScrollYRef = useRef(0);

  // Normalisering används av hooken (memoized för att undvika refresh-loop)
  const normalizeShows = useCallback((items) => {
    let changed = false;

    const normalized = items.map((item) => {
      if (item.mediaType !== "tv") return item;
      if (typeof item.completed === "boolean") return item;

      // 1) Säsonger och avsnitt
      if (item.seasons && Array.isArray(item.seasons)) {
        const allSeasonsComplete = item.seasons.every(
          (season) =>
            Array.isArray(season.episodes) &&
            season.episodes.every((ep) => !!ep.watched),
        );
        const completedFlag = !!allSeasonsComplete;
        if (completedFlag) changed = true;
        return { ...item, completed: completedFlag };
      }

      // 2) watchedCount/totalEpisodes
      if (
        typeof item.watchedCount === "number" &&
        typeof item.totalEpisodes === "number"
      ) {
        const completedFlag =
          item.totalEpisodes > 0 && item.watchedCount === item.totalEpisodes;
        if (completedFlag) changed = true;
        return { ...item, completed: completedFlag };
      }

      // 3) default
      return { ...item, completed: false };
    });

    return { normalized, changed };
  }, []);

  const {
    items: watchedShowsRaw,
    loading,
    error: watchedError,
    refresh,
    remove,
  } = useWatchedList("tv", { normalize: normalizeShows });

  const sortShows = (shows, sortBy) => {
    if (sortBy === "title") {
      return [...shows].sort((a, b) =>
        (a.title || a.name || "")
          .toLowerCase()
          .localeCompare((b.title || b.name || "").toLowerCase()),
      );
    } else if (sortBy === "dateAdded") {
      return [...shows].sort(
        (a, b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0),
      );
    }
    return shows;
  };

  const filterShows = (shows, search) => {
    let filtered = [...shows];

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((s) =>
        (s.title || s.name || "").toLowerCase().includes(q),
      );
    }

    return filtered;
  };

  // Bygg filteredShows varje gång basdata eller filter ändras
  useEffect(() => {
    const sorted = sortShows(watchedShowsRaw, sortBy);
    const filtered = filterShows(sorted, searchTerm);
    setFilteredShows(filtered);
  }, [watchedShowsRaw, sortBy, searchTerm]);

  // Swipe-info som innan
  useEffect(() => {
    if (!localStorage.getItem("swipeInfoSeen")) {
      setShowSwipeInfo(true);
    }
  }, []);

  const handleSearch = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const fetchShowDetails = useCallback(async (showId) => {
    try {
      const [details, credits, videos] = await Promise.all([
        cachedFetchJson(`${TMDB_BASE_URL}/tv/${showId}?api_key=${API_KEY}`, {
          ttlMs: 6 * 60 * 60 * 1000,
        }),
        cachedFetchJson(
          `${TMDB_BASE_URL}/tv/${showId}/credits?api_key=${API_KEY}`,
          { ttlMs: 24 * 60 * 60 * 1000 },
        ),
        cachedFetchJson(
          `${TMDB_BASE_URL}/tv/${showId}/videos?api_key=${API_KEY}`,
          { ttlMs: 24 * 60 * 60 * 1000 },
        ),
      ]);
      setShowDetails({ ...details, credits, videos });
    } catch (err) {
      console.error(err);
      setErrorMessage("Could not load show details.");
    }
  }, []);

  const handleShowModalSelect = useCallback(
    (show) => {
      setErrorMessage("");
      setShowForModal(show);
      fetchShowDetails(show.id);
    },
    [fetchShowDetails],
  );

  const handleShowSelect = useCallback(async (show) => {
    try {
      listScrollYRef.current =
        typeof window !== "undefined" ? window.scrollY : 0;
      setErrorMessage("");
      const details = await cachedFetchJson(
        `${TMDB_BASE_URL}/tv/${show.id}?api_key=${API_KEY}`,
        { ttlMs: 6 * 60 * 60 * 1000 },
      );
      // TMDB details innehåller `seasons` som en array (metadata) och kan annars skriva över
      // vår progress-`seasons` (object med watchedEpisodes). Bevara progress-strukturen.
      const progressSeasons =
        show.seasons && !Array.isArray(show.seasons) ? show.seasons : undefined;

      setSelectedShow({
        ...show,
        ...details,
        seasons: progressSeasons,
        number_of_seasons: show.number_of_seasons ?? details?.number_of_seasons,
        number_of_episodes:
          show.number_of_episodes ?? details?.number_of_episodes,
      });
    } catch (err) {
      console.error("Kunde inte hämta show-detaljer", err);
      setErrorMessage("Could not load show details.");
    }
  }, []);

  const closeShowModal = useCallback(() => {
    setShowForModal(null);
    setShowDetails(null);
    setErrorMessage("");
  }, []);

  const removeShow = useCallback(
    async (id) => {
      await remove(id);

      if (showForModal && showForModal.id === id) {
        closeShowModal();
      }
      if (selectedShow && selectedShow.id === id) {
        setSelectedShow(null);
      }
    },
    [closeShowModal, remove, selectedShow, showForModal],
  );

  const addToFavorites = useCallback(
    async (show) => {
      const favorites = await loadFavorites();
      const normalizedShow = {
        ...show,
        mediaType: "tv",
      };
      if (
        favorites.some(
          (fav) => favoriteIdentity(fav) === favoriteIdentity(normalizedShow),
        )
      ) {
        return;
      }

      const updatedFavorites = [
        ...favorites,
        { ...normalizedShow, dateAdded: new Date().toISOString() },
      ];
      const ok = await saveFavorites(updatedFavorites);
      if (!ok) return;

      await removeShow(show.id);
    },
    [removeShow],
  );

  const handleCloseSwipeInfo = useCallback(() => {
    setShowSwipeInfo(false);
    localStorage.setItem("swipeInfoSeen", "true");
  }, []);

  const refreshWatchedFromStorage = useCallback(async () => {
    await refresh();
  }, [refresh]);

  const watchedCount = watchedShowsRaw.length;

  if (selectedShow) {
    return (
      <ShowDetail
        show={selectedShow}
        onBack={() => {
          refreshWatchedFromStorage();
          setSelectedShow(null);
          setTimeout(() => {
            if (typeof window === "undefined") return;
            window.scrollTo({ top: listScrollYRef.current || 0, left: 0 });
          }, 0);
        }}
        onRemove={removeShow}
        onWatchedChanged={refreshWatchedFromStorage}
      />
    );
  }

  return (
    <div className="app-page">
      <div className="app-container">
        {/* Search */}
        <div className="sticky top-0 z-20 mb-4 app-panel">
          <div className="p-3">
            <div className="flex items-center space-x-2">
              <div className="relative flex-grow">
                <input
                  type="text"
                  placeholder="Search your shows..."
                  value={searchTerm}
                  onChange={handleSearch}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch({ target: { value: searchTerm } });
                    }
                  }}
                  className="pr-10 pl-9 app-input"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                  <SearchIcon className="text-gray-400" size={18} />
                </div>
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleSearch({ target: { value: searchTerm } })}
                className="px-4 app-button-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              >
                GO!
              </button>
            </div>
            {searchTerm && (
              <div className="mt-2 text-sm text-gray-400">
                Found {filteredShows.length}{" "}
                {filteredShows.length === 1 ? "show" : "shows"}
              </div>
            )}
          </div>
        </div>

        {/* Sort + filterrad */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="font-semibold text-gray-100">
            Watched ({watchedCount})
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="app-select focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            aria-label="Sort watched shows"
          >
            <option value="title">A-Ö</option>
            <option value="dateAdded">Most recent</option>
          </select>
        </div>

        {(watchedError || errorMessage) && (
          <div className="flex items-center justify-between gap-3 p-3 mb-3 border rounded-2xl border-white/10 bg-white/5">
            <div className="min-w-0 text-sm text-red-300">
              {watchedError || errorMessage}
            </div>
            <button
              type="button"
              onClick={() => {
                setErrorMessage("");
                refreshWatchedFromStorage();
                if (showForModal?.id) fetchShowDetails(showForModal.id);
              }}
              className="flex-none px-3 py-1 text-sm app-button-ghost focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              Try again
            </button>
          </div>
        )}

        {loading && (
          <div className="space-y-4" aria-label="Loading shows">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 app-card">
                <div className="flex items-center gap-3">
                  <div className="flex-none w-12 h-16 rounded-xl bg-white/5" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="w-2/3 h-4 rounded-lg bg-white/5" />
                    <div className="w-1/3 h-3 rounded-lg bg-white/5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Listan */}
        {!loading && (
          <div className="space-y-4">
            {filteredShows.map((show) => (
              <SwipeableShowCard
                key={show.id}
                show={show}
                swipeStartThreshold={30}
                onSelect={handleShowSelect}
                onShowInfo={handleShowModalSelect}
                onRemove={removeShow}
                onAddToFavorites={addToFavorites}
              />
            ))}
          </div>
        )}

        {!loading && filteredShows.length === 0 && (
          <div className="py-10 text-center">
            {watchedShowsRaw.length === 0 ? (
              <>
                <p className="text-gray-400">No shows in your watched list</p>
                <p className="mt-2 text-yellow-500">Start adding some shows!</p>
              </>
            ) : (
              <p className="text-gray-400">No shows match your search</p>
            )}
          </div>
        )}

        {showForModal && showDetails && (
          <ShowDetailModal
            show={showDetails}
            onClose={() => {
              closeShowModal();
              refreshWatchedFromStorage();
            }}
            onWatchedChanged={refreshWatchedFromStorage}
          />
        )}

        <BackupControls onRestore={refreshWatchedFromStorage} />
      </div>
    </div>
  );
};

export default ShowsList;
