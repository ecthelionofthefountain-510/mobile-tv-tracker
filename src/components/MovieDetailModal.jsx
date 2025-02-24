import React from "react";
import { IMAGE_BASE_URL } from "../config";

const MovieDetailModal = ({ movie, onClose }) => {
  if (!movie) return null;

  // Stäng modalen om man klickar utanför innehållet
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div 
        className="relative bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 z-10 bg-gray-700 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-600"
        >
          ✕
        </button>
        
        <div className="relative">
          {/* Backdrop image (if available) */}
          {movie.backdrop_path && (
            <div className="w-full h-40 md:h-56 overflow-hidden">
              <img 
                src={`${IMAGE_BASE_URL}${movie.backdrop_path}`}
                alt={`${movie.title} backdrop`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-800"></div>
            </div>
          )}
          
          {/* Poster and basic info */}
          <div className={`flex ${movie.backdrop_path ? 'mt-[-60px]' : 'mt-0'} px-6 relative z-10`}>
            <div className="w-1/3 flex-shrink-0">
              <img
                src={`${IMAGE_BASE_URL}${movie.poster_path}`}
                alt={movie.title}
                className="w-full rounded-md shadow-lg border-2 border-yellow-600/30"
              />
            </div>
            
            <div className="w-2/3 pl-4 pt-2">
              <h2 className="text-2xl font-bold text-yellow-400 mb-1">{movie.title}</h2>
              
              {movie.release_date && (
                <div className="text-gray-300 text-sm mb-2">
                  Released: {new Date(movie.release_date).getFullYear()}
                </div>
              )}
              
              {movie.vote_average > 0 && (
                <div className="flex items-center mb-2">
                  <span className="inline-block bg-yellow-600 text-white text-xs px-2 py-1 rounded-md mr-2">
                    {movie.vote_average.toFixed(1)}/10
                  </span>
                  <div className="text-sm text-gray-400">
                    {movie.vote_count} votes
                  </div>
                </div>
              )}
              
              <div className="text-gray-300 text-sm">
                {movie.runtime ? `${movie.runtime} min` : ""}
              </div>
            </div>
          </div>
        </div>
        
        {/* Movie details */}
        <div className="p-6 pt-3">
          {movie.tagline && (
            <div className="text-yellow-300 italic mb-3">"{movie.tagline}"</div>
          )}
          
          {movie.overview && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-yellow-400 mb-2">Overview</h3>
              <p className="text-gray-300">{movie.overview}</p>
            </div>
          )}
          
          {movie.genres && movie.genres.length > 0 && (
            <div className="mb-3">
              <h3 className="text-md font-semibold text-yellow-400 mb-2">Genres</h3>
              <div className="flex flex-wrap gap-2">
                {movie.genres.map(genre => (
                  <span key={genre.id} className="bg-gray-700 text-gray-300 px-2 py-1 rounded-md text-xs">
                    {genre.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieDetailModal;