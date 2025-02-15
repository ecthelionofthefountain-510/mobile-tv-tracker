// MoviesList.jsx
import React, { useState, useEffect } from "react";
import { IMAGE_BASE_URL } from "../config";

const MoviesList = () => {
  const [watchedMovies, setWatchedMovies] = useState([]);

  useEffect(() => {
    const allWatched = JSON.parse(localStorage.getItem("watched")) || [];
    const movies = allWatched.filter(item => item.mediaType === "movie");
    setWatchedMovies(movies);
  }, []);

  const removeMovie = (id) => {
    const allWatched = JSON.parse(localStorage.getItem("watched")) || [];
    const updatedWatched = allWatched.filter(item => item.id !== id);
    localStorage.setItem("watched", JSON.stringify(updatedWatched));
    setWatchedMovies(prev => prev.filter(movie => movie.id !== id));
  };

  return (
    <div className="p-4 min-h-screen pb-20">
      {watchedMovies.map((movie) => (
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
      
      {watchedMovies.length === 0 && (
        <div className="text-center py-10">
          <p className="text-gray-400">No movies in your watched list</p>
          <p className="text-yellow-500 mt-2">Start adding some movies!</p>
        </div>
      )}
    </div>
  );
};

export default MoviesList;