// ShowsList.jsx
import React, { useState, useEffect } from "react";
import { API_KEY, TMDB_BASE_URL } from "../config";
import ShowDetail from "./ShowDetail";
import SwipeableShowCard from "./SwipeableShowCard";
import ShowDetailModal from "./ShowDetailModal";
import BackupControls from "./BackupControls";
import { useWatchedList } from "../hooks/useWatchedList";
import { cachedFetchJson } from "../utils/tmdbCache";

// ev. SwipeInfoToast om du har den
// import SwipeInfoToast from "./SwipeInfoToast";

const ShowsList = () => {
  const [filteredShows, setFilteredShows] = useState([]);
  const [selectedShow, setSelectedShow] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForModal, setShowForModal] = useState(null);
  const [showDetails, setShowDetails] = useState(null);
  const [sortBy, setSortBy] = useState("title");
  const [showSwipeInfo, setShowSwipeInfo] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all"); // "all", "inProgress", "done"

  // Normalisering flyttad hit och används av hooken
  const normalizeShows = (items) => {
    let changed = false;

    const normalized = items.map((item) => {
      if (item.mediaType !== "tv") return item;
      if (typeof item.completed === "boolean") return item;

      // 1) Säsonger och avsnitt
      if (item.seasons && Array.isArray(item.seasons)) {
        const allSeasonsComplete = item.seasons.every(
          (season) =>
            Array.isArray(season.episodes) &&
            season.episodes.every((ep) => !!ep.watched)
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
  };

  const {
    items: watchedShowsRaw,
    loading,
    refresh,
    remove,
  } = useWatchedList("tv", { normalize: normalizeShows });

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

  // Bygg filteredShows varje gång basdata eller filter ändras
  useEffect(() => {
    const sorted = sortShows(watchedShowsRaw, sortBy);
    const filtered = filterShows(sorted, searchTerm, statusFilter);
    setFilteredShows(filtered);
  }, [watchedShowsRaw, sortBy, searchTerm, statusFilter]);

  // Swipe-info som innan
  useEffect(() => {
    if (!localStorage.getItem("swipeInfoSeen")) {
      setShowSwipeInfo(true);
    }
  }, []);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const fetchShowDetails = async (showId) => {
    try {
      const [details, credits, videos] = await Promise.all([
        cachedFetchJson(`${TMDB_BASE_URL}/tv/${showId}?api_key=${API_KEY}`, {
          ttlMs: 6 * 60 * 60 * 1000,
        }),
        cachedFetchJson(
          `${TMDB_BASE_URL}/tv/${showId}/credits?api_key=${API_KEY}`,
          { ttlMs: 24 * 60 * 60 * 1000 }
        ),
        cachedFetchJson(
          `${TMDB_BASE_URL}/tv/${showId}/videos?api_key=${API_KEY}`,
          { ttlMs: 24 * 60 * 60 * 1000 }
        ),
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
      const details = await cachedFetchJson(
        `${TMDB_BASE_URL}/tv/${show.id}?api_key=${API_KEY}`,
        { ttlMs: 6 * 60 * 60 * 1000 }
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
    }
  };

  const closeShowModal = () => {
    setShowForModal(null);
    setShowDetails(null);
  };

  const removeShow = async (id) => {
    await remove(id);

    if (showForModal && showForModal.id === id) {
      closeShowModal();
    }
    if (selectedShow && selectedShow.id === id) {
      setSelectedShow(null);
    }
  };

  const addToFavorites = async (show) => {
    const favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    if (favorites.some((fav) => fav.id === show.id)) return;

    const updatedFavorites = [
      ...favorites,
      { ...show, dateAdded: new Date().toISOString() },
    ];
    localStorage.setItem("favorites", JSON.stringify(updatedFavorites));

    await removeShow(show.id);
  };

  const handleCloseSwipeInfo = () => {
    setShowSwipeInfo(false);
    localStorage.setItem("swipeInfoSeen", "true");
  };

  const refreshWatchedFromStorage = async () => {
    await refresh();
  };

  const watchedCount = watchedShowsRaw.length;

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

  return (
    <div className="min-h-screen p-4 pb-20 bg-gray-900">
      {/* Search */}
      <div className="sticky top-0 z-20 mb-4 border border-gray-800 rounded-lg shadow-lg bg-gray-900">
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
                    handleSearch({ target: { value: searchTerm } });
                  }
                }}
                className="w-full p-2 pl-8 text-white placeholder-gray-400 bg-gray-800 border border-yellow-500 rounded-md"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                🔍
              </div>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                  aria-label="Clear search"
                >
                  ✖️
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleSearch({ target: { value: searchTerm } })}
              className="p-2 font-bold text-gray-900 transition duration-300 bg-yellow-500 rounded-md hover:bg-yellow-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
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
        <div className="font-semibold text-yellow-400">
          Watched ({watchedCount})
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1 text-sm text-white bg-gray-800 border border-yellow-500 rounded"
          >
            <option value="all">All</option>
            <option value="inProgress">In progress</option>
            <option value="done">Done</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-24 px-2 py-1 text-sm text-yellow-400 bg-gray-800 border border-gray-700 rounded-lg"
          >
            <option value="title">A-Ö</option>
            <option value="dateAdded">Most recent</option>
          </select>
        </div>
      </div>

      {/* Listan */}
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
  );
};

export default ShowsList;
