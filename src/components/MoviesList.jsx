// MoviesList.jsx
import React, { useState, useEffect } from "react";
import { API_KEY, TMDB_BASE_URL } from "../config";
import MovieDetailModal from "./MovieDetailModal";
import { SwipeableList } from "react-swipeable-list";
import "react-swipeable-list/dist/styles.css";
import SwipeableMovieCard from "./SwipeableMovieCard";
import { useWatchedList } from "../hooks/useWatchedList";
import { cachedFetchJson } from "../utils/tmdbCache";
// import SwipeInfoToast from "./SwipeInfoToast";

const MoviesList = () => {
  const [filteredMovies, setFilteredMovies] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [movieDetails, setMovieDetails] = useState(null);
  const [sortBy, setSortBy] = useState("title"); // "title" | "dateAdded"
  const [showSwipeInfo, setShowSwipeInfo] = useState(false);

  // Här behöver vi ingen normalize-funktion – filmer är alltid “klara”
  const {
    items: watchedMoviesRaw,
    loading,
    refresh,
    remove,
  } = useWatchedList("movie");

  // Sorteringsfunktion
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

  // Filtrering + sök
  const filterMovies = (movies, search) => {
    let filtered = [...movies];

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((m) =>
        (m.title || "").toLowerCase().includes(q)
      );
    }

    return filtered;
  };

  // Bygg filteredMovies varje gång basdata eller filter ändras
  useEffect(() => {
    const sorted = sortMovies(watchedMoviesRaw, sortBy);
    const filtered = filterMovies(sorted, searchTerm);
    setFilteredMovies(filtered);
  }, [watchedMoviesRaw, sortBy, searchTerm]);

  // Swipe-info (valfritt, samma som på shows)
  useEffect(() => {
    if (!localStorage.getItem("swipeInfoMoviesSeen")) {
      setShowSwipeInfo(true);
    }
  }, []);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // Hämta detaljinformation för film
  const fetchMovieDetails = async (movieId) => {
    try {
      const [details, credits, videos] = await Promise.all([
        cachedFetchJson(
          `${TMDB_BASE_URL}/movie/${movieId}?api_key=${API_KEY}`,
          { ttlMs: 6 * 60 * 60 * 1000 }
        ),
        cachedFetchJson(
          `${TMDB_BASE_URL}/movie/${movieId}/credits?api_key=${API_KEY}`,
          { ttlMs: 24 * 60 * 60 * 1000 }
        ),
        cachedFetchJson(
          `${TMDB_BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}`,
          { ttlMs: 24 * 60 * 60 * 1000 }
        ),
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
    await remove(id);

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

    await removeMovie(movie.id);
  };

  const moviesCount = watchedMoviesRaw.length;

  return (
    <div className="min-h-screen p-4 pb-20 bg-gray-900">
      {/* Search section */}
      <div className="sticky top-0 z-20 mb-4 border border-gray-800 rounded-lg shadow-lg bg-gray-900">
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
                  onClick={() => setSearchTerm("")}
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
              Found {filteredMovies.length}{" "}
              {filteredMovies.length === 1 ? "movie" : "movies"}
            </div>
          )}
        </div>
      </div>

      {/* Sorting + title */}
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-yellow-400">
          Watched ({moviesCount})
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-2 py-1 text-sm text-white bg-gray-800 border border-yellow-500 rounded"
        >
          <option value="title">A-Ö</option>
          <option value="dateAdded">Most recent</option>
        </select>
      </div>

      {/* List with swipe-cards */}
      <SwipeableList swipeStartThreshold={30}>
        {filteredMovies.map((movie) => (
          <SwipeableMovieCard
            key={movie.id}
            movie={movie}
            onSelect={handleMovieSelect}
            onRemove={removeMovie}
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
          {watchedMoviesRaw.length === 0 ? (
            <>
              <p className="text-gray-400">No movies in your watched list</p>
              <p className="mt-2 text-yellow-500">Start adding some movies!</p>
            </>
          ) : (
            <p className="text-gray-400">No movies match your search</p>
          )}
        </div>
      )}

      {/* {showSwipeInfo && (
        <SwipeInfoToast
          onClose={() => {
            setShowSwipeInfo(false);
            localStorage.setItem("swipeInfoMoviesSeen", "1");
          }}
          leftAction={{
            icon: "👈",
            color: "text-red-400",
            label: "LEFT",
            text: "to remove from list"
          }}
          rightAction={{
            icon: "👉",
            color: "text-yellow-400",
            label: "RIGHT",
            text: "to add to favorites"
          }}
        />
      )} */}
    </div>
  );
};

export default MoviesList;
