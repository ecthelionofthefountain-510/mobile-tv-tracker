import React from "react";
import { IMAGE_BASE_URL } from "../config";

const MovieDetailModal = ({ movie, onClose }) => {
  if (!movie) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-0 bg-black bg-opacity-75 sm:p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="relative bg-gray-800 rounded-none sm:rounded-lg shadow-xl w-full max-w-full sm:max-w-2xl max-h-[100vh] sm:max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button up top, always visible */}
        <button
          onClick={onClose}
          className="absolute z-20 px-4 py-2 text-white bg-gray-700 rounded-md top-2 right-2 hover:bg-gray-600"
        >
          Close
        </button>

        {/* Backdrop image */}
        {movie.backdrop_path && (
          <div className="relative w-full h-40 overflow-hidden md:h-56">
            <img 
              src={`${IMAGE_BASE_URL}${movie.backdrop_path}`}
              alt={`${movie.title} backdrop`}
              className="object-cover w-full h-full"
            />
            <div className="absolute inset-0 z-0 bg-black bg-opacity-70"></div>
          </div>
        )}

        {/* Poster centrerad */}
        <div className="relative z-10 flex justify-center mb-4 -mt-16">
          <img
            src={movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : "/no-profile.png"}
            alt={movie.title}
            className="bg-gray-900 border-2 rounded-md shadow-lg w-28 sm:w-32 md:w-40 border-yellow-600/30"
          />
        </div>

        {/* All info/text under postern */}
        <div className="px-6 mt-2 text-left">
          <h2 className="mb-1 text-3xl font-bold text-yellow-400">{movie.title}</h2>
          {movie.tagline && (
            <div className="mb-2 text-lg italic text-yellow-300">"{movie.tagline}"</div>
          )}
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block px-2 py-1 text-sm font-semibold text-white bg-yellow-600 rounded">{movie.vote_average?.toFixed(2)} / 10</span>
            <span className="text-sm text-gray-200">{movie.vote_count} votes</span>
          </div>
          <div className="mb-2 text-base font-medium text-gray-200">
            {movie.genres && movie.genres.map(g => g.name).join(", ")}
          </div>
          {movie.release_date && (
            <div className="mb-1 text-sm text-gray-200">
              Release date: {movie.release_date}
            </div>
          )}
          {movie.runtime && (
            <div className="mb-1 text-sm text-gray-200">
              Runtime: {movie.runtime} min
            </div>
          )}
        </div>
        
        {/* Movie details */}
        <div className="p-6 pt-3 pb-28">
          {/* Overview */}
          {movie.overview && (
            <div className="mb-4">
              <h3 className="mb-2 text-lg font-semibold text-yellow-400">Overview</h3>
              <p className="text-gray-300">{movie.overview}</p>
            </div>
          )}

          {/* Cast */}
          {movie.credits && movie.credits.cast && (
            <div className="mb-4">
              <h3 className="mb-1 font-semibold text-yellow-400">Cast</h3>
              <div className="flex gap-2 overflow-x-auto">
                {movie.credits.cast.slice(0, 10).map(actor => (
                  <div key={actor.id} className="flex flex-col items-center w-20">
                    <img
                      src={actor.profile_path ? `${IMAGE_BASE_URL}${actor.profile_path}` : "/no-profile.png"}
                      alt={actor.name}
                      className="object-cover w-16 h-16 border rounded-full aspect-square"
                    />
                    <span className="mt-1 text-xs text-center text-gray-300">{actor.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trailer */}
          {movie.videos && movie.videos.results && movie.videos.results.length > 0 && (
            <div className="mb-4">
              <a
                href={`https://www.youtube.com/watch?v=${movie.videos.results[0].key}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 font-bold text-gray-900 bg-yellow-500 rounded"
              >
                ▶️ Watch trailer
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MovieDetailModal;