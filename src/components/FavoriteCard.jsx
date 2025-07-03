import React from "react";
import { IMAGE_BASE_URL } from "../config";

const FavoriteCard = ({ item, onClick, onRemove, onAddToWatched, alreadyWatched, showButtons = true }) => {
  return (
    <div
      className="relative mb-4 overflow-hidden transition-colors duration-200 border rounded-lg cursor-pointer bg-gray-800/90 border-yellow-900/30 hover:bg-gray-700/90"
      onClick={onClick}
    >
      <div className="flex h-32 sm:h-40">
        <div className="flex-shrink-0 w-24 h-full sm:w-28">
          <img
            src={`${IMAGE_BASE_URL}${item.poster_path}`}
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