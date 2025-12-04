// ShowsList.jsx
import React, { useState, useEffect } from "react";
import { API_KEY, TMDB_BASE_URL } from "../config";
import ShowDetail from "./ShowDetail";
import SwipeableShowCard from "./SwipeableShowCard";
import ShowDetailModal from "./ShowDetailModal";
import BackupControls from "./BackupControls";
import SwipeInfoToast from "./SwipeInfoToast";

import {
  loadWatchedAll,
  saveWatchedAll,
  ensurePersistentStorage,
} from "../utils/watchedStorage";

const ShowsList = () => {
  const [watchedShows, setWatchedShows] = useState([]);
  const [filteredShows, setFilteredShows] = useState([]);
  const [selectedShow, setSelectedShow] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForModal, setShowForModal] = useState(null);
  const [showDetails, setShowDetails] = useState(null);
  const [sortBy, setSortBy] = useState("title");
  const [showSwipeInfo, setShowSwipeInfo] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "inProgress" | "done"

  // ---------------- Helpers ----------------

  const normalizeWatched = (items) => {
    let changed = false;

    const normalized = items.map((item) => {
      if (typeof item.completed === "boolean") return item;

      // 1) Har säsonger/avsnitt
      if (item.seasons && Array.isArray(item.seasons)) {
        const allSeasonsComplete = item.seasons.every((season) =>
          Array.isArray(season.episodes) &&
          season.episodes.every((ep) => !!ep.watched)
        );
        const completedFlag = !!allSeasonsComplete;
        if (completedFlag) changed = true;
        return { ...item, completed: completedFlag };
      }

      // 2) Har watchedCount/totalEpisodes
      if (
        typeof item.watchedCount === "number" &&
        typeof item.totalEpisodes === "number"
      ) {
        const completedFlag =
          item.totalEpisodes > 0 &&
          item.watchedCount === item.totalEpisodes;
        if (completedFlag) changed = true;
        return { ...item, completed: completedFlag };
      }

      // 3) Default
      return { ...item, completed: false };
    });

    return { normalized, changed };
  };

  const sortShows = (shows, sortBy) => {
    if (sortBy === "title") {
      return [...shows].sort((a, b) =>
        (a.title || a.name || "")
          .toLowerCase()
          .localeCompare((b.title || b.name || "").toLowerCase())
      );
    } else if (sortBy === "dateAdded") {
      return [...shows].sort(
        (a, b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0)
      );
    }
    return shows;
  };

  const filterShows = (shows, search, status) => {
    let filtered = [...shows];

    if (status === "inProgress") {
      filtered = filtered.filter((s) => !s.completed);
    } else if (status === "done") {
      filtered = filtered.filter((s) => s.completed);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((s) =>
        (s.title || s.name || "").toLowerCase().includes(q)
      );
    }

    return filtered;
  };

  // ---------------- Effects ----------------

  // Ladda watched shows vid start + när sorteringen ändras
  useEffect(() => {
    let isCancelled = false;

    (async () => {
      await ensurePersistentStorage();

      const allWatchedRaw = await loadWatchedAll();
      const { normalized, changed } = normalizeWatched(allWatchedRaw);

      if (changed) {
        await saveWatchedAll(normalized);
      }

      const shows = normalized.filter((item) => item.mediaType === "tv");
      const sorted = sortShows(shows, sortBy);

      if (!isCancelled) {
        setWatchedShows(sorted);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [sortBy]);

  // Håll filteredShows i sync med watchedShows + search + statusFilter
  useEffect(() => {
    setFilteredShows(filterShows(watchedShows, searchTerm, statusFilter));
  }, [watchedShows, searchTerm, statusFilter]);

  // Swipe-info som innan, detta kan vara kvar i localStorage
  useEffect(() => {
    if (!localStorage.getItem("swipeInfoSeen")) {
      setShowSwipeInfo(true);
    }
  }, []);

  // ---------------- Handlers ----------------

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
  };

  const fetchShowDetails = async (showId) => {
    try {
      const [details, credits, videos] = await Promise.all([
        fetch(`${TMDB_BASE_URL}/tv/${showId}?api_key=${API_KEY}`).then((res) =>
          res.json()
        ),
        fetch(
          `${TMDB_BASE_URL}/tv/${showId}/credits?api_key=${API_KEY}`
        ).then((res) => res.json()),
        fetch(
          `${TMDB_BASE_URL}/tv/${showId}/videos?api_key=${API_KEY}`
        ).then((res) => res.json()),
      ]);
      setShowDetails({ ...details, credits, videos });
    } catch (err) {
      console.error(err);
    }
  };

  const handleShowModalSelect = (show) => {
    setShowForModal(show);
    fetchShowDetails(show.id);
  };

  const handleShowSelect = async (show) => {
    try {
      const details = await fetch(
        `${TMDB_BASE_URL}/tv/${show.id}?api_key=${API_KEY}`
      ).then((res) => res.json());
      setSelectedShow({ ...show, ...details });
    } catch (err) {
      console.error("Kunde inte hämta show-detaljer", err);
    }
  };

  const closeShowModal = () => {
    setShowForModal(null);
    setShowDetails(null);
  };

  const handleShowUpdated = (updatedShow) => {
    const updatedShows = watchedShows.map((show) =>
      show.id === updatedShow.id ? updatedShow : show
    );
    setWatchedShows(updatedShows);
  };

  const removeShow = async (id) => {
    const allWatched = await loadWatchedAll();
    const updatedAll = allWatched.filter((item) => item.id !== id);
    await saveWatchedAll(updatedAll);

    const updatedShows = watchedShows.filter((show) => show.id !== id);
    setWatchedShows(updatedShows);

    if (showForModal && showForModal.id === id) {
      closeShowModal();
    }
    setSelectedShow(null);
  };

  const addToFavorites = async (show) => {
    const favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    if (favorites.some((fav) => fav.id === show.id)) return;

    const updatedFavorites = [
      ...favorites,
      { ...show, dateAdded: new Date().toISOString() },
    ];
    localStorage.setItem("favorites", JSON.stringify(updatedFavorites));

    // Ta bort från watched
    const allWatched = await loadWatchedAll();
    const updatedAll = allWatched.filter((item) => item.id !== show.id);
    await saveWatchedAll(updatedAll);

    const updatedWatched = watchedShows.filter((s) => s.id !== show.id);
    setWatchedShows(updatedWatched);
  };

  const handleCloseSwipeInfo = () => {
    setShowSwipeInfo(false);
    localStorage.setItem("swipeInfoSeen", "true");
  };

  const refreshWatchedFromStorage = async () => {
    const allWatchedRaw = await loadWatchedAll();
    const { normalized, changed } = normalizeWatched(allWatchedRaw);
    if (changed) {
      await saveWatchedAll(normalized);
    }

    const shows = normalized.filter((item) => item.mediaType === "tv");
    const sorted = sortShows(shows, sortBy);

    setWatchedShows(sorted);
  };

  // ---------------- Detail view ----------------

  if (selectedShow) {
    return (
      <ShowDetail
        show={selectedShow}
        onBack={() => {
          refreshWatchedFromStorage();
          setSelectedShow(null);
        }}
        onRemove={removeShow}
        onWatchedChanged={refreshWatchedFromStorage}
      />
    );
  }

  // ---------------- Render list ----------------

  return (
    <div className="min-h-screen p-4 pb-20">
      {/* Search-baren */}
      <div className="sticky top-0 z-10 mb-4 border border-gray-800 rounded-lg shadow-lg bg-gray-900/95 backdrop-blur-md">
        <div className="p-1">
          <div className="flex items-center space-x-2">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Search your shows..."
                value={searchTerm}
                onChange={handleSearch}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleSearch(e);
                  }
                }}
                className="w-full p-2 pl-8 text-white placeholder-gray-400 bg-gray-800 border border-yellow-500 rounded-md"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                🔍
              </div>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  ✖️
                </button>
              )}
            </div>
            <button
              onClick={handleSearch}
              className="p-2 font-bold text-gray-900 transition duration-300 bg-yellow-500 rounded-md hover:bg-yellow-600"
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

      {/* Header med sort + statusfilter */}
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-yellow-400">Watched Shows</div>
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-2 py-1 text-sm text-white bg-gray-800 border border-yellow-500 rounded"
          >
            <option value="title">A-Ö</option>
            <option value="dateAdded">Most recent</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1 text-sm text-white bg-gray-800 border border-yellow-500 rounded"
          >
            <option value="all">All</option>
            <option value="inProgress">In progress</option>
            <option value="done">Done</option>
          </select>
        </div>
      </div>

      {/* Lista */}
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

      {filteredShows.length === 0 && (
        <div className="py-10 text-center">
          {watchedShows.length === 0 ? (
            <>
              <p className="text-gray-400">No shows in your watched list</p>
              <p className="mt-2 text-yellow-500">Start adding some shows!</p>
            </>
          ) : (
            <p className="text-gray-400">No shows match your search</p>
          )}
        </div>
      )}

      {showSwipeInfo && (
        <SwipeInfoToast
          onClose={handleCloseSwipeInfo}
          leftAction={{
            icon: "👈",
            color: "text-red-400",
            label: "VÄNSTER",
            text: "för att ta bort från listan",
          }}
          rightAction={{
            icon: "👉",
            color: "text-yellow-400",
            label: "HÖGER",
            text: "för att lägga tillbaka i favoriter",
          }}
        />
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
  );
};

export default ShowsList;