// ShowsList.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { API_KEY, TMDB_BASE_URL } from "../config";
import ShowDetail from "./ShowDetail";
import SwipeableShowCard from "./SwipeableShowCard";
import ShowDetailModal from "./ShowDetailModal";
import { useWatchedList } from "../hooks/useWatchedList";
import { cachedFetchJson } from "../utils/tmdbCache";
import { loadWatchedAll, saveWatchedAll } from "../utils/watchedStorage";
import SearchIcon from "../icons/SearchIcon";
import {
  loadFavorites,
  saveFavorites,
  favoriteIdentity,
} from "../utils/favoritesStorage";
import { loadAppPreference } from "../utils/appPreferences";

// ev. SwipeInfoToast om du har den
// import SwipeInfoToast from "./SwipeInfoToast";

const ShowsList = () => {
  const initialSort = loadAppPreference("defaultSort", "dateAdded");
  const [filteredShows, setFilteredShows] = useState([]);
  const [selectedShow, setSelectedShow] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForModal, setShowForModal] = useState(null);
  const [showDetails, setShowDetails] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingUndo, setPendingUndo] = useState(null);
  const [ratingPromptQueue, setRatingPromptQueue] = useState([]);
  const [activeRatingPrompt, setActiveRatingPrompt] = useState(null);
  const [sortBy, setSortBy] = useState(
    initialSort === "title" || initialSort === "incomplete"
      ? initialSort
      : "dateAdded",
  );

  const listScrollYRef = useRef(0);
  const undoTimerRef = useRef(null);
  const prevCompletionMapRef = useRef(new Map());
  const sameId = (a, b) => String(a) === String(b);

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
    } else if (sortBy === "incomplete") {
      return [...shows].sort((a, b) => {
        const aDone = Number(!!a?.completed);
        const bDone = Number(!!b?.completed);
        if (aDone !== bDone) return aDone - bDone; // incomplete first

        const dateCmp =
          new Date(b?.dateAdded || 0) - new Date(a?.dateAdded || 0);
        if (dateCmp) return dateCmp;

        return (a.title || a.name || "")
          .toLowerCase()
          .localeCompare((b.title || b.name || "").toLowerCase());
      });
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

  useEffect(() => {
    const currentMap = new Map();
    watchedShowsRaw.forEach((show) => {
      currentMap.set(String(show.id), {
        completed: !!show.completed,
        userRating:
          typeof show.userRating === "number" && show.userRating > 0
            ? show.userRating
            : 0,
      });
    });

    if (prevCompletionMapRef.current.size === 0) {
      prevCompletionMapRef.current = currentMap;
      return;
    }

    const newlyCompletedWithoutRating = watchedShowsRaw.filter((show) => {
      const previous = prevCompletionMapRef.current.get(String(show.id));
      if (!previous) return false;
      return (
        !previous.completed &&
        !!show.completed &&
        !(typeof show.userRating === "number" && show.userRating > 0)
      );
    });

    if (newlyCompletedWithoutRating.length > 0) {
      const activeId = activeRatingPrompt
        ? String(activeRatingPrompt.id)
        : null;
      setRatingPromptQueue((prev) => {
        const existingIds = new Set(prev.map((entry) => String(entry.id)));
        if (activeId) existingIds.add(activeId);

        const additions = newlyCompletedWithoutRating.filter(
          (entry) => !existingIds.has(String(entry.id)),
        );

        if (additions.length === 0) return prev;
        return [...prev, ...additions];
      });
    }

    prevCompletionMapRef.current = currentMap;
  }, [activeRatingPrompt, watchedShowsRaw]);

  useEffect(() => {
    if (!activeRatingPrompt && ratingPromptQueue.length > 0) {
      const [next, ...rest] = ratingPromptQueue;
      setActiveRatingPrompt(next);
      setRatingPromptQueue(rest);
    }
  }, [activeRatingPrompt, ratingPromptQueue]);

  useEffect(
    () => () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    },
    [],
  );

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

  const queueUndo = useCallback((item, label) => {
    if (!item) return;

    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }

    setPendingUndo({ item, label });
    undoTimerRef.current = setTimeout(() => {
      setPendingUndo(null);
      undoTimerRef.current = null;
    }, 5000);
  }, []);

  const handleUndoRemove = useCallback(async () => {
    if (!pendingUndo?.item) return;

    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }

    try {
      const all = (await loadWatchedAll()) || [];
      const exists = all.some(
        (entry) =>
          sameId(entry?.id, pendingUndo.item?.id) &&
          entry?.mediaType === pendingUndo.item?.mediaType,
      );

      if (!exists) {
        await saveWatchedAll([...all, pendingUndo.item]);
        await refresh();
      }
      setPendingUndo(null);
    } catch (err) {
      console.error("Could not restore removed show", err);
      setErrorMessage("Could not restore removed show.");
    }
  }, [pendingUndo, refresh]);

  const removeShow = useCallback(
    async (id, options = {}) => {
      const { allowUndo = true } = options;
      const removedItem = watchedShowsRaw.find((item) => sameId(item?.id, id));
      await remove(id);

      if (showForModal && showForModal.id === id) {
        closeShowModal();
      }
      if (selectedShow && selectedShow.id === id) {
        setSelectedShow(null);
      }

      if (allowUndo && removedItem) {
        const removedTitle = removedItem.title || removedItem.name || "Show";
        queueUndo(removedItem, removedTitle);
      }

      setRatingPromptQueue((prev) =>
        prev.filter((entry) => !sameId(entry?.id, id)),
      );
      setActiveRatingPrompt((prev) =>
        prev && sameId(prev?.id, id) ? null : prev,
      );
    },
    [
      closeShowModal,
      queueUndo,
      remove,
      selectedShow,
      showForModal,
      watchedShowsRaw,
    ],
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

      await removeShow(show.id, { allowUndo: false });
    },
    [removeShow],
  );

  const handleShowRate = useCallback(
    async (show, rating) => {
      if (!show?.id) return;

      const mainContent =
        typeof document !== "undefined"
          ? document.querySelector(".main-content")
          : null;
      const savedMainScrollTop = mainContent ? mainContent.scrollTop : 0;
      const savedWindowScrollY =
        typeof window !== "undefined" ? window.scrollY : 0;

      const normalizedRating = Math.max(
        0,
        Math.min(5, Math.round(Number(rating) || 0)),
      );

      try {
        const all = (await loadWatchedAll()) || [];
        const updated = all.map((entry) => {
          if (!sameId(entry?.id, show.id) || entry?.mediaType !== "tv") {
            return entry;
          }
          return {
            ...entry,
            userRating: normalizedRating > 0 ? normalizedRating : undefined,
          };
        });

        await saveWatchedAll(updated);
        await refresh();

        // Keep the user's scroll position stable after the list refresh.
        setTimeout(() => {
          if (mainContent) {
            mainContent.scrollTop = savedMainScrollTop;
          }
          if (typeof window !== "undefined") {
            window.scrollTo({ top: savedWindowScrollY, left: 0 });
          }
        }, 0);
      } catch (err) {
        console.error("Could not save show rating", err);
        setErrorMessage("Could not save show rating.");
      }
    },
    [refresh],
  );

  const dismissRatingPrompt = useCallback(() => {
    setActiveRatingPrompt(null);
  }, []);

  const submitRatingFromPrompt = useCallback(
    async (rating) => {
      if (!activeRatingPrompt?.id) return;
      await handleShowRate(activeRatingPrompt, rating);
      setActiveRatingPrompt(null);
    },
    [activeRatingPrompt, handleShowRate],
  );

  const openRatingPromptForShow = useCallback(
    (show) => {
      if (!show?.id) return;

      setRatingPromptQueue((prev) =>
        prev.filter((entry) => !sameId(entry?.id, show.id)),
      );
      setActiveRatingPrompt(show);
    },
    [sameId],
  );

  const refreshWatchedFromStorage = useCallback(async () => {
    await refresh();
  }, [refresh]);

  const sortOptions = [
    { value: "dateAdded", label: "Most recent" },
    { value: "title", label: "A-Ö" },
    { value: "incomplete", label: "Not finished" },
  ];

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
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="font-semibold text-gray-100">
            Watched ({watchedCount})
          </div>
          <div
            className="flex flex-wrap items-center justify-end gap-2"
            aria-label="Sort watched shows"
          >
            {sortOptions.map((option) => {
              const isActive = sortBy === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSortBy(option.value)}
                  className={"app-chip " + (isActive ? "app-chip-active" : "")}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
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
                onRequestRating={openRatingPromptForShow}
              />
            ))}
          </div>
        )}

        {!loading && filteredShows.length === 0 && (
          <div className="py-10">
            {watchedShowsRaw.length === 0 ? (
              <div className="max-w-md p-6 mx-auto space-y-3 text-center app-panel">
                <p className="text-base font-semibold text-gray-100">
                  No shows in your watched list
                </p>
                <p className="text-sm text-gray-400">
                  Start tracking and we will keep your progress in one place.
                </p>
                <Link
                  to="/search"
                  className="px-4 py-2 mt-2 app-button-primary"
                >
                  Find shows
                </Link>
              </div>
            ) : (
              <div className="max-w-md p-6 mx-auto space-y-3 text-center app-panel">
                <p className="text-base font-semibold text-gray-100">
                  No shows match your search
                </p>
                <p className="text-sm text-gray-400">
                  Try a shorter title or clear the current filter.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="px-4 py-2 mt-2 app-button-ghost"
                >
                  Clear search
                </button>
              </div>
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

        {pendingUndo && (
          <div className="fixed left-0 right-0 z-50 flex justify-center px-4 pointer-events-none bottom-24">
            <div className="flex items-center justify-between w-full max-w-lg gap-3 pointer-events-auto app-toast app-toast-pop">
              <span className="min-w-0 text-sm text-yellow-100 truncate">
                Removed {pendingUndo.label}
              </span>
              <button
                type="button"
                onClick={handleUndoRemove}
                className="px-3 py-1 text-xs font-semibold transition-colors border rounded-lg border-yellow-300/45 bg-yellow-300/15 text-yellow-50 hover:bg-yellow-300/25"
              >
                Undo
              </button>
            </div>
          </div>
        )}

        {activeRatingPrompt && (
          <div className="fixed left-0 right-0 z-50 flex justify-center px-4 pointer-events-none bottom-40">
            <div
              className="w-full max-w-lg p-4 border shadow-2xl pointer-events-auto app-toast-pop flex flex-col rounded-2xl border-yellow-300/25 bg-gray-900/95 backdrop-blur"
              style={{
                boxShadow:
                  "0 14px 34px rgba(0,0,0,0.55),inset 0 0 0 1px rgba(255,255,255,0.05)",
              }}
            >
              <p className="text-sm font-semibold leading-snug tracking-normal text-yellow-100 normal-case truncate text-center">
                {activeRatingPrompt?.title ||
                  activeRatingPrompt?.name ||
                  "Rate this show"}
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => {
                      void submitRatingFromPrompt(star);
                    }}
                    className="text-[30px] leading-none text-yellow-300 transition-colors hover:text-yellow-200"
                    aria-label={`Rate show ${star} of 5`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <div className="flex justify-center mt-3">
                <button
                  type="button"
                  onClick={dismissRatingPrompt}
                  className="px-4 py-1.5 text-xs font-semibold leading-none text-gray-200 transition-colors border rounded-lg border-white/15 bg-white/5 hover:bg-white/10"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShowsList;
