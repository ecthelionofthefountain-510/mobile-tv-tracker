// MoviesList.jsx with alphabetical sorting, search, and X button in corner
import React, { useState, useEffect } from "react";
import { IMAGE_BASE_URL, API_KEY, TMDB_BASE_URL } from "../config";
import MovieDetailModal from "./MovieDetailModal";
import { SwipeableList, SwipeableListItem } from 'react-swipeable-list';
import 'react-swipeable-list/dist/styles.css';
import SwipeableMovieCard from './SwipeableMovieCard';
import SwipeInfoToast from "./SwipeInfoToast";

const MoviesList = () => {
  const [watchedMovies, setWatchedMovies] = useState([]);
  const [filteredMovies, setFilteredMovies] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [movieDetails, setMovieDetails] = useState(null);
  const [sortBy, setSortBy] = useState("title"); // "title" eller "dateAdded"
  const [showSwipeInfo, setShowSwipeInfo] = useState(true);

  useEffect(() => {
    const allWatched = JSON.parse(localStorage.getItem("watched")) || [];
    const movies = allWatched.filter(item => item.mediaType === "movie");
    
    setWatchedMovies(sortMovies(movies, sortBy));
    setFilteredMovies(sortMovies(movies, sortBy));
  }, [sortBy]);

  useEffect(() => {
    if (!localStorage.getItem("swipeInfoSeen")) {
      setShowSwipeInfo(true);
      localStorage.setItem("swipeInfoSeen", "1");
    }
  }, []);

  const sortMovies = (movies, sortBy) => {
    if (sortBy === "title") {
      return [...movies].sort((a, b) =>
        a.title.toLowerCase().localeCompare(b.title.toLowerCase())
      );
    } else if (sortBy === "dateAdded") {
      return [...movies].sort((a, b) =>
        new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0)
      );
    }
    return movies;
  };

  // Handle search input changes
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    let filtered = watchedMovies;
    if (value.trim() !== "") {
      filtered = watchedMovies.filter(movie =>
        movie.title.toLowerCase().includes(value.toLowerCase())
      );
    }
    setFilteredMovies(sortMovies(filtered, sortBy));
  };

  // Fetch detailed movie information
  const fetchMovieDetails = async (movieId) => {
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/movie/${movieId}?api_key=${API_KEY}`
      );
      const data = await response.json();
      setMovieDetails(data);
    } catch (error) {
      console.error("Error fetching movie details:", error);
    }
  };

  // Handle selecting a movie for detailed view
  const handleMovieSelect = (movie) => {
    setSelectedMovie(movie);
    fetchMovieDetails(movie.id);
  };

  // Close the movie detail modal
  const closeMovieModal = () => {
    setSelectedMovie(null);
    setMovieDetails(null);
  };

  const removeMovie = (id) => {
    // Ta bort filmen från watchedMovies
    const updatedMovies = watchedMovies.filter(movie => movie.id !== id);
    setWatchedMovies(updatedMovies);
    setFilteredMovies(updatedMovies.filter(movie =>
      movie.title.toLowerCase().includes(searchTerm.toLowerCase())
    ));
    localStorage.setItem("watched", JSON.stringify(updatedMovies));
    if (selectedMovie && selectedMovie.id === id) {
      closeMovieModal();
    }
  };

  const addToFavorites = (movie) => {
    // Lägg till filmen i favoriter om den inte redan finns där
    const favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    if (favorites.some(fav => fav.id === movie.id)) {
      // Visa notification om du vill
      return;
    }
    const updatedFavorites = [...favorites, { ...movie, dateAdded: new Date().toISOString() }];
    localStorage.setItem("favorites", JSON.stringify(updatedFavorites));

    // Ta bort filmen från watchedMovies
    const updatedMovies = watchedMovies.filter(m => m.id !== movie.id);
    setWatchedMovies(updatedMovies);
    setFilteredMovies(updatedMovies.filter(m =>
      m.title.toLowerCase().includes(searchTerm.toLowerCase())
    ));
    localStorage.setItem("watched", JSON.stringify(updatedMovies));
  };

  const addToWatched = (movie) => {
    // Lägg till logik för att lägga till i "watched" här
    alert(`Lägger till "${movie.title}" i din lista över sedda filmer!`);
  };

  return (
    <div className="min-h-screen p-4 pb-20">
      {/* Search section with enhanced background */}
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
                    setFilteredMovies(watchedMovies);
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
              Found {filteredMovies.length} {filteredMovies.length === 1 ? "movie" : "movies"}
            </div>
          )}
        </div>
      </div>

      {/* Sorting and title section */}
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-yellow-400">Your Movies</div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="px-2 py-1 text-sm text-white bg-gray-800 border border-yellow-500 rounded"
        >
          <option value="title">A-Ö</option>
          <option value="dateAdded">Senast tillagd</option>
        </select>
      </div>

      <SwipeableList>
        {filteredMovies.map(movie => (
          <SwipeableMovieCard
            key={movie.id}
            movie={movie}
            onSelect={handleMovieSelect}
            onRemove={removeMovie}
            onAddToWatched={addToWatched}         // Funktion för vänster swipe
            onAddToFavorites={addToFavorites}     // Funktion för höger swipe
          />
        ))}
      </SwipeableList>

      {/* Movie Detail Modal */}
      {selectedMovie && movieDetails && (
        <MovieDetailModal 
          movie={movieDetails} 
          onClose={closeMovieModal}
        />
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

      {showSwipeInfo && (
        <SwipeInfoToast
          onClose={() => setShowSwipeInfo(false)}
          leftAction={{
            icon: "👈",
            color: "text-red-400",
            label: "VÄNSTER",
            text: "för att ta bort från listan"
          }}
          rightAction={{
            icon: "👉",
            color: "text-yellow-400",
            label: "HÖGER",
            text: "för att lägga tillbaka i favoriter"
          }}
        />
      )}
    </div>
  );
};

export default MoviesList;