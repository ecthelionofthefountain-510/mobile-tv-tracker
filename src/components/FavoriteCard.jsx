import React, { useRef } from "react";
import { IMAGE_BASE_URL } from "../config";

// Genre-mappning
const GENRE_MAP = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western"
};

const FavoriteCard = ({ item, onClick, onRemove, onAddToWatched, alreadyWatched, showButtons = true }) => {
  const touchStartX = useRef(null);
  const touchMoved = useRef(false);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchMoved.current = false;
  };

  const handleTouchMove = (e) => {
    if (touchStartX.current !== null) {
      const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
      if (dx > 10) touchMoved.current = true; // 10px threshold
    }
  };

  const handleTouchEnd = (e) => {
    // Om det inte var en swipe, kör click
    if (!touchMoved.current && onClick) onClick(e);
    touchStartX.current = null;
    touchMoved.current = false;
  };

  // Genre-hantering
  const getGenres = () => {
    if (item.genres && Array.isArray(item.genres) && item.genres.length > 0) {
      return item.genres.map(g => typeof g === "object" ? g.name : GENRE_MAP[g]).filter(Boolean);
    }
    if (item.genre_ids && Array.isArray(item.genre_ids) && item.genre_ids.length > 0) {
      return item.genre_ids.map(id => GENRE_MAP[id]).filter(Boolean);
    }
    return [];
  };

  const genres = getGenres();

  return (
    <div
      className="relative mb-4 overflow-hidden transition-colors duration-200 border rounded-lg cursor-pointer bg-gray-800/90 border-yellow-900/30 hover:bg-gray-700/90"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex h-32 sm:h-40">
        <div className="flex-shrink-0 w-24 h-full sm:w-28">
          <img
            src={item.poster_path ? `${IMAGE_BASE_URL}${item.poster_path}` : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='112' height='168' viewBox='0 0 112 168'%3E%3Crect width='112' height='168' fill='%23374151'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='0.3em' fill='%236B7280' font-family='Arial' font-size='12'%3ENo Image%3C/text%3E%3C/svg%3E"}
            alt={item.title}
            className="object-cover w-full h-full border-r border-yellow-900/30"
          />
        </div>
        <div className="flex flex-col justify-between flex-1 p-3">
          <div>
            <h3 className="text-lg font-semibold text-yellow-400 sm:text-xl line-clamp-1">
              {item.title}
            </h3>
            <span className="inline-block px-2 py-1 mt-1 text-xs text-yellow-400 rounded-full bg-yellow-600/20">
              {item.mediaType === 'tv' ? 'TV Series' : 'Movie'}
            </span>
            {/* Genre-visning */}
            {genres.length > 0 && (
              <div className="mt-1 text-sm text-gray-300">
                {genres.slice(0, 3).join(", ")}
                {genres.length > 3 && <span className="text-gray-400"> +{genres.length - 3} more</span>}
              </div>
            )}
          </div>
          {/* Visa knappar bara om showButtons är true */}
          {showButtons && (
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(item.id, e);
                }}
                className="px-3 py-1 text-sm text-white transition-colors duration-200 rounded-md bg-red-600/80 hover:bg-red-700"
              >
                Remove
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToWatched(item, e);
                }}
                disabled={alreadyWatched}
                className={`px-3 py-1 text-white rounded-md transition-colors duration-200 text-sm ${
                  alreadyWatched 
                    ? 'bg-green-700 cursor-not-allowed' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {alreadyWatched ? 'Already Watched' : 'Add to Watched'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FavoriteCard;