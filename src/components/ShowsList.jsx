import React, { useState, useEffect } from "react";
import { IMAGE_BASE_URL, API_KEY, TMDB_BASE_URL } from "../config";
import ShowDetail from "./ShowDetail";
import ShowDetailModal from "./ShowDetailModal";
import ShowCard from "./ShowCard";
import SwipeableShowCard from './SwipeableShowCard';
import SwipeInfoToast from "./SwipeInfoToast";

const ShowsList = () => {
  const [watchedShows, setWatchedShows] = useState([]);
  const [filteredShows, setFilteredShows] = useState([]);
  const [selectedShow, setSelectedShow] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForModal, setShowForModal] = useState(null);
  const [showDetails, setShowDetails] = useState(null);
  const [sortBy, setSortBy] = useState("title");
  const [showSwipeInfo, setShowSwipeInfo] = useState(true);

  useEffect(() => {
    const allWatched = JSON.parse(localStorage.getItem("watched")) || [];
    const shows = allWatched.filter(item => item.mediaType === "tv");
    setWatchedShows(sortShows(shows, sortBy));
    setFilteredShows(sortShows(shows, sortBy));
  }, [sortBy]);

  useEffect(() => {
    if (!localStorage.getItem("swipeInfoSeen")) {
      setShowSwipeInfo(true);
      localStorage.setItem("swipeInfoSeen", "1");
    }
  }, []);

  const sortShows = (shows, sortBy) => {
    if (sortBy === "title") {
      return [...shows].sort((a, b) =>
        (a.title || a.name).toLowerCase().localeCompare((b.title || b.name).toLowerCase())
      );
    } else if (sortBy === "dateAdded") {
      return [...shows].sort((a, b) =>
        new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0)
      );
    }
    return shows;
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.trim() === "") {
      setFilteredShows(watchedShows);
    } else {
      const filtered = watchedShows.filter(show =>
        show.title.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredShows(filtered);
    }
  };

  const fetchShowDetails = async (showId) => {
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/tv/${showId}?api_key=${API_KEY}`
      );
      const data = await response.json();
      setShowDetails(data);
    } catch (error) {
      console.error("Error fetching show details:", error);
    }
  };

  const handleShowSelect = (show) => {
    setSelectedShow({ ...show });
  };

  const handleShowModalSelect = (show) => {
    setShowForModal(show);
    fetchShowDetails(show.id);
  };

  const closeShowModal = () => {
    setShowForModal(null);
    setShowDetails(null);
  };

  const handleShowUpdated = (updatedShow) => {
    const updatedShows = watchedShows.map(show =>
      show.id === updatedShow.id ? updatedShow : show
    );
    setWatchedShows(updatedShows);
    setFilteredShows(updatedShows.filter(show =>
      show.title.toLowerCase().includes(searchTerm.toLowerCase())
    ));
  };

  const removeShow = (id) => {
    const allWatched = JSON.parse(localStorage.getItem("watched")) || [];
    const updatedWatched = allWatched.filter(item => item.id !== id);
    localStorage.setItem("watched", JSON.stringify(updatedWatched));
    const updatedShows = watchedShows.filter(show => show.id !== id);
    setWatchedShows(updatedShows);
    setFilteredShows(updatedShows.filter(show =>
      show.title.toLowerCase().includes(searchTerm.toLowerCase())
    ));
    if (showForModal && showForModal.id === id) {
      closeShowModal();
    }
    setSelectedShow(null);
  };

  // Lägg till i favoriter-funktion (dummy)
  const addToFavorites = (show) => {
    alert(`Lägg till "${show.title}" i favoriter!`);
  };

  if (selectedShow) {
    return (
      <ShowDetail
        show={selectedShow}
        onBack={() => {
          const allWatched = JSON.parse(localStorage.getItem("watched")) || [];
          const updatedShow = allWatched.find(item => item.id === selectedShow.id);
          if (updatedShow) {
            handleShowUpdated(updatedShow);
          }
          setSelectedShow(null);
        }}
        onRemove={removeShow}
      />
    );
  }

  return (
    <div className="min-h-screen p-4 pb-20">
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
                  if (e.key === 'Enter') {
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
                  onClick={() => {
                    setSearchTerm("");
                    setFilteredShows(watchedShows);
                  }}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  ✖️
                </button>
              )}
            </div>
            <button
              onClick={() => handleSearch({ target: { value: searchTerm } })}
              className="p-2 font-bold text-gray-900 transition duration-300 bg-yellow-500 rounded-md hover:bg-yellow-600"
            >
              GO!
            </button>
          </div>
          {searchTerm && (
            <div className="mt-2 text-sm text-gray-400">
              Found {filteredShows.length} {filteredShows.length === 1 ? "show" : "shows"}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-yellow-400">Your Shows</div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="px-2 py-1 text-sm text-white bg-gray-800 border border-yellow-500 rounded"
        >
          <option value="title">A-Ö</option>
          <option value="dateAdded">Senast tillagd</option>
        </select>
      </div>

      <div className="space-y-4">
        {filteredShows.map((show) => (
          <SwipeableShowCard
            key={show.id}
            show={show}
            onSelect={handleShowSelect}
            onRemove={removeShow}
            onAddToFavorites={addToFavorites}
          />
        ))}
      </div>

      {showForModal && showDetails && (
        <ShowDetailModal
          show={showDetails}
          onClose={closeShowModal}
        />
      )}

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
        <SwipeInfoToast onClose={() => setShowSwipeInfo(false)} />
      )}
    </div>
  );
};

export default ShowsList;