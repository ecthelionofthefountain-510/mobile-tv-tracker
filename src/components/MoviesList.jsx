// MoviesList.jsx
import React, { useState, useEffect } from "react";
import { IMAGE_BASE_URL, API_KEY, TMDB_BASE_URL } from "../config";
import MovieDetailModal from "./MovieDetailModal";
import { SwipeableList } from "react-swipeable-list";
import "react-swipeable-list/dist/styles.css";
import SwipeableMovieCard from "./SwipeableMovieCard";
// import SwipeInfoToast from "./SwipeInfoToast";

import {
  loadWatchedAll,
  saveWatchedAll,
  ensurePersistentStorage,
} from "../utils/watchedStorage";

const MoviesList = () => {
  const [watchedMovies, setWatchedMovies] = useState([]);
  const [filteredMovies, setFilteredMovies] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [movieDetails, setMovieDetails] = useState(null);
  const [sortBy, setSortBy] = useState("title"); // "title" eller "dateAdded"

  // ---------- Helpers ----------

  const sortMovies = (movies, sortBy) => {
    if (sortBy === "title") {
      return [...movies].sort((a, b) =>
        (a.title || "")
          .toLowerCase()
          .localeCompare((b.title || "").toLowerCase())
      );
    } else if (sortBy === "dateAdded") {
      return [...movies].sort(
        (a, b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0)
      );
    }
    return movies;
  };

  const filterMovies = (movies, search) => {
    if (!search.trim()) return movies;

    const q = search.toLowerCase();
    return movies.filter((m) =>
      (m.title || "").toLowerCase().includes(q)
    );
  };

  // ---------- Effects ----------

  // Ladda watched movies + sortering
  useEffect(() => {
    let isCancelled = false;

    (async () => {
      await ensurePersistentStorage();

      const allWatched = await loadWatchedAll();
      const movies = allWatched.filter((item) => item.mediaType === "movie");
      const sorted = sortMovies(movies, sortBy);

      if (!isCancelled) {
        setWatchedMovies(sorted);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [sortBy]);

  // Håll filteredMovies i sync med watchedMovies + search
  useEffect(() => {
    setFilteredMovies(filterMovies(watchedMovies, searchTerm));
  }, [watchedMovies, searchTerm]);

  // ---------- Handlers ----------

  const handleSearch = (eOrValue) => {
    const value =
      typeof eOrValue === "string" ? eOrValue : eOrValue.target.value;
    setSearchTerm(value);
  };

  const fetchMovieDetails = async (movieId) => {
    try {
      const [details, credits, videos] = await Promise.all([
        fetch(`${TMDB_BASE_URL}/movie/${movieId}?api_key=${API_KEY}`).then(
          (res) => res.json()
        ),
        fetch(
          `${TMDB_BASE_URL}/movie/${movieId}/credits?api_key=${API_KEY}`
        ).then((res) => res.json()),
        fetch(
          `${TMDB_BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}`
        ).then((res) => res.json()),
      ]);
      setMovieDetails({ ...details, credits, videos });
    } catch (err) {
      console.error(err);
    }
  };

  const handleMovieSelect = (movie) => {
    setSelectedMovie(movie);
    fetchMovieDetails(movie.id);
  };

  const closeMovieModal = () => {
    setSelectedMovie(null);
    setMovieDetails(null);
  };

  const removeMovie = async (id) => {
    // Ta bort från global watched-storage
    const allWatched = await loadWatchedAll();
    const updatedAll = allWatched.filter(
      (item) => !(item.mediaType === "movie" && item.id === id)
    );
    await saveWatchedAll(updatedAll);

    // Uppdatera state
    const updatedMovies = watchedMovies.filter((movie) => movie.id !== id);
    setWatchedMovies(updatedMovies);

    if (selectedMovie && selectedMovie.id === id) {
      closeMovieModal();
    }
  };

  const addToFavorites = async (movie) => {
    const favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    if (favorites.some((fav) => fav.id === movie.id)) {
      return;
    }

    const updatedFavorites = [
      ...favorites,
      { ...movie, dateAdded: new Date().toISOString() },
    ];
    localStorage.setItem("favorites", JSON.stringify(updatedFavorites));

    // Ta bort filmen från watched (globalt)
    const allWatched = await loadWatchedAll();
    const updatedAll = allWatched.filter(
      (item) => !(item.mediaType === "movie" && item.id === movie.id)
    );
    await saveWatchedAll(updatedAll);

    // Ta bort filmen från lokala listan
    const updatedMovies = watchedMovies.filter((m) => m.id !== movie.id);
    setWatchedMovies(updatedMovies);
  };

  // Mest för att SwipeableMovieCard förväntar sig prop:en,
  // men du använder Search-sidan för att lägga till filmer.
  const addToWatched = (movie) => {
    alert(`"${movie.title}" is already in your watched list.`);
  };

  // ---------- Render ----------

  return (
    <div className="min-h-screen p-4 pb-20">
      {/* Search section */}
      <div className="sticky top-0 z-10 mb-4 border border-gray-800 rounded-lg shadow-lg bg-gray-900/95 backdrop-blur-md">
        <div className="p-1">
          <div className="flex items-center space-x-2">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Search your movies..."
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
              onClick={() => handleSearch(searchTerm)}
              className="p-2 font-bold text-gray-900 transition duration-300 bg-yellow-500 rounded-md hover:bg-yellow-600"
            >
              GO!
            </button>
          </div>

          {searchTerm && (
            <div className="mt-2 text-sm text-gray-400">
              Found {filteredMovies.length}{" "}
              {filteredMovies.length === 1 ? "movie" : "movies"}
            </div>
          )}
        </div>
      </div>

      {/* Sorting */}
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-yellow-400">Watched Movies</div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-2 py-1 text-sm text-white bg-gray-800 border border-yellow-500 rounded"
        >
          <option value="title">A-Ö</option>
          <option value="dateAdded">Most recent</option>
        </select>
      </div>

      {/* Lista */}
      <SwipeableList swipeStartThreshold={30}>
        {filteredMovies.map((movie) => (
          <SwipeableMovieCard
            key={movie.id}
            movie={movie}
            onSelect={handleMovieSelect}
            onRemove={removeMovie}
            onAddToWatched={addToWatched}
            onAddToFavorites={addToFavorites}
          />
        ))}
      </SwipeableList>

      {/* Movie Detail Modal */}
      {selectedMovie && movieDetails && (
        <MovieDetailModal movie={movieDetails} onClose={closeMovieModal} />
      )}

      {filteredMovies.length === 0 && (
        <div className="py-10 text-center">
          {watchedMovies.length === 0 ? (
            <>
              <p className="text-gray-400">No movies in your watched list</p>
              <p className="mt-2 text-yellow-500">Start adding some movies!</p>
            </>
          ) : (
            <p className="text-gray-400">No movies match your search</p>
          )}
        </div>
      )}

      {/* Om du vill återaktivera swipe-info någon gång:
      
      {showSwipeInfo && (
        <SwipeInfoToast
          onClose={() => setShowSwipeInfo(false)}
          leftAction={{
            icon: "👈",
            color: "text-red-400",
            label: "LEFT",
            text: "to remove from list",
          }}
          rightAction={{
            icon: "👉",
            color: "text-yellow-400",
            label: "RIGHT",
            text: "to move to favorites",
          }}
        />
      )}
      
      */}
    </div>
  );
};

export default MoviesList;