// MoviesList.jsx with alphabetical sorting, search, and X button in corner
import React, { useState, useEffect } from "react";
import { IMAGE_BASE_URL, API_KEY, TMDB_BASE_URL } from "../config";
import MovieDetailModal from "./MovieDetailModal";

const MoviesList = () => {
  const [watchedMovies, setWatchedMovies] = useState([]);
  const [filteredMovies, setFilteredMovies] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [movieDetails, setMovieDetails] = useState(null);

  useEffect(() => {
    const allWatched = JSON.parse(localStorage.getItem("watched")) || [];
    const movies = allWatched.filter(item => item.mediaType === "movie");
    
    // Sort movies alphabetically by title
    const sortedMovies = movies.sort((a, b) => 
      a.title.toLowerCase().localeCompare(b.title.toLowerCase())
    );
    
    setWatchedMovies(sortedMovies);
    setFilteredMovies(sortedMovies);
  }, []);

  // Handle search input changes
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.trim() === "") {
      setFilteredMovies(watchedMovies);
    } else {
      const filtered = watchedMovies.filter(movie => 
        movie.title.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredMovies(filtered);
    }
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

  const removeMovie = (id, e) => {
    if (e) {
      e.stopPropagation();
    }
    
    const allWatched = JSON.parse(localStorage.getItem("watched")) || [];
    const updatedWatched = allWatched.filter(item => item.id !== id);
    localStorage.setItem("watched", JSON.stringify(updatedWatched));
    
    const updatedMovies = watchedMovies.filter(movie => movie.id !== id);
    setWatchedMovies(updatedMovies);
    
    // Update filtered list as well
    setFilteredMovies(updatedMovies.filter(movie => 
      movie.title.toLowerCase().includes(searchTerm.toLowerCase())
    ));
    
    // Close modal if the removed movie is currently selected
    if (selectedMovie && selectedMovie.id === id) {
      closeMovieModal();
    }
  };

  return (
    <div className="p-4 min-h-screen pb-20">
      {/* Search section with enhanced background */}
      <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-md shadow-lg rounded-lg border border-gray-800 mb-4">
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
                className="w-full p-2 pl-8 border border-yellow-500 rounded-md bg-gray-800 text-white placeholder-gray-400"
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
              className="p-2 bg-yellow-500 text-gray-900 font-bold rounded-md hover:bg-yellow-600 transition duration-300"
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

      {filteredMovies.map((movie) => (
        <div 
          key={movie.id}
          className="mb-4 relative bg-gray-800/90 rounded-lg border border-yellow-900/30"
          onClick={() => handleMovieSelect(movie)}
        >
          {/* X button in the top-right corner - UPDATED STYLING */}
          <button
            onClick={(e) => removeMovie(movie.id, e)}
            className="absolute top-0 right-0 z-60 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md transition-colors transform translate-x-1/2 -translate-y-1/2"
            aria-label="Remove movie"
          >
            ✕
          </button>
          
          <div className="flex p-1 relative h-10" style={{ minHeight: '150px' }}>
            <img
              src={`${IMAGE_BASE_URL}${movie.poster_path}`}
              alt={movie.title}
              className="w-24 h-36 object-cover rounded-md border-2 border-yellow-600/30 cursor-pointer hover:opacity-80 transition-opacity"
            />
            <div className="flex-grow ml-4 flex flex-col">
              <div className="pb-12">
                <h3 className="text-2xl font-semibold text-yellow-400 line-clamp-2">
                  {movie.title}
                </h3>
                <div className="text-gray-400 mt-1">
                  Movie
                </div>
                {movie.release_date && (
                  <div className="text-gray-400 mt-1">
                    Released: {new Date(movie.release_date).getFullYear()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {/* Movie Detail Modal */}
      {selectedMovie && movieDetails && (
        <MovieDetailModal 
          movie={movieDetails} 
          onClose={closeMovieModal}
        />
      )}
      
      {filteredMovies.length === 0 && (
        <div className="text-center py-10">
          {watchedMovies.length === 0 ? (
            <>
              <p className="text-gray-400">No movies in your watched list</p>
              <p className="text-yellow-500 mt-2">Start adding some movies!</p>
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