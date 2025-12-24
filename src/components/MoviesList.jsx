// MoviesList.jsx
import React, { useState, useEffect } from "react";
import { API_KEY, TMDB_BASE_URL } from "../config";
import MovieDetailModal from "./MovieDetailModal";
import { SwipeableList } from "react-swipeable-list";
import "react-swipeable-list/dist/styles.css";
import SwipeableMovieCard from "./SwipeableMovieCard";
import { useWatchedList } from "../hooks/useWatchedList";
import { cachedFetchJson } from "../utils/tmdbCache";
import {
  loadFavorites,
  saveFavorites,
  favoriteIdentity,
} from "../utils/favoritesStorage";
// import SwipeInfoToast from "./SwipeInfoToast";

const MoviesList = () => {
  const [filteredMovies, setFilteredMovies] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [movieDetails, setMovieDetails] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [sortBy, setSortBy] = useState("title"); // "title" | "dateAdded"
  const [showSwipeInfo, setShowSwipeInfo] = useState(false);

  // Här behöver vi ingen normalize-funktion – filmer är alltid “klara”
  const {
    items: watchedMoviesRaw,
    loading,
    error: watchedError,
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
      setErrorMessage("Could not load movie details.");
    }
  };

  const handleMovieSelect = (movie) => {
    setErrorMessage("");
    setSelectedMovie(movie);
    fetchMovieDetails(movie.id);
  };

  const closeMovieModal = () => {
    setSelectedMovie(null);
    setMovieDetails(null);
    setErrorMessage("");
  };

  const removeMovie = async (id) => {
    await remove(id);

    if (selectedMovie && selectedMovie.id === id) {
      closeMovieModal();
    }
  };

  const addToFavorites = async (movie) => {
    const favorites = loadFavorites();
    const normalizedMovie = {
      ...movie,
      mediaType: "movie",
    };
    if (
      favorites.some(
        (fav) => favoriteIdentity(fav) === favoriteIdentity(normalizedMovie)
      )
    ) {
      return;
    }

    const updatedFavorites = [
      ...favorites,
      { ...normalizedMovie, dateAdded: new Date().toISOString() },
    ];
    saveFavorites(updatedFavorites);

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
          className="px-4 py-2 text-sm font-semibold text-yellow-300 bg-gray-800 border border-yellow-500 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
        >
          <option value="title">A-Ö</option>
          <option value="dateAdded">Most recent</option>
        </select>
      </div>

      {(watchedError || errorMessage) && (
        <div className="mb-3 text-sm text-red-300">
          {watchedError || errorMessage}
        </div>
      )}

      {loading && (
        <div className="py-8 text-center text-gray-400">Loading…</div>
      )}

      {/* List with swipe-cards */}
      {!loading && (
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
      )}

      {/* Movie Detail Modal */}
      {selectedMovie && movieDetails && (
        <MovieDetailModal movie={movieDetails} onClose={closeMovieModal} />
      )}

      {!loading && filteredMovies.length === 0 && (
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
    </div>
  );
};

export default MoviesList;
