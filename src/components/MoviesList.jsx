// MoviesList.jsx with alphabetical sorting and search
import React, { useState, useEffect } from "react";
import { IMAGE_BASE_URL } from "../config";

const MoviesList = () => {
  const [watchedMovies, setWatchedMovies] = useState([]);
  const [filteredMovies, setFilteredMovies] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

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

  const removeMovie = (id) => {
    const allWatched = JSON.parse(localStorage.getItem("watched")) || [];
    const updatedWatched = allWatched.filter(item => item.id !== id);
    localStorage.setItem("watched", JSON.stringify(updatedWatched));
    
    const updatedMovies = watchedMovies.filter(movie => movie.id !== id);
    setWatchedMovies(updatedMovies);
    
    // Update filtered list as well
    setFilteredMovies(updatedMovies.filter(movie => 
      movie.title.toLowerCase().includes(searchTerm.toLowerCase())
    ));
  };

  return (
    <div className="p-4 min-h-screen pb-20">
      <div className="sticky top-0 z-10 bg-transparent pt-1 pb-3">
        <div className="relative">
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
              Search
            </button>
          </div>
        </div>
        {searchTerm && (
          <div className="mt-2 text-sm text-gray-400">
            Found {filteredMovies.length} {filteredMovies.length === 1 ? "movie" : "movies"}
          </div>
        )}
      </div>

      {filteredMovies.map((movie) => (
        <div 
          key={movie.id}
          className="mb-4 relative bg-gray-800/90 rounded-lg border border-yellow-900/30"
        >
          <div className="flex p-4">
            <img
              src={`${IMAGE_BASE_URL}${movie.poster_path}`}
              alt={movie.title}
              className="w-24 h-36 object-cover rounded-md border-2 border-yellow-600/30"
            />
            <div className="flex-grow ml-4">
              <h3 className="text-2xl font-semibold text-yellow-400">
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
            <button
              onClick={() => removeMovie(movie.id)}
              className="absolute bottom-4 right-4 px-3 py-1 bg-red-600/80 hover:bg-red-700 text-white rounded-md"
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      
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