import React from "react";
import { IMAGE_BASE_URL } from "../config";

const MovieCard = ({ item, onSelect, onRemove, showRemoveButton = true }) => {
  return (
    <div 
      className="relative mb-4 overflow-hidden transition-colors duration-200 border rounded-lg cursor-pointer bg-gray-800/90 border-yellow-900/30 hover:bg-gray-700/90"
      onClick={onSelect ? () => onSelect(item) : undefined}
    >
      {/* Använder flex med bättre proportioner */}
      <div className="flex h-32 sm:h-40">
        {/* Större thumbnail som täcker hela höjden */}
        <div className="flex-shrink-0 w-24 h-full sm:w-28">
          <img
            src={`${IMAGE_BASE_URL}${item.poster_path}`}
            alt={item.title}
            className="object-cover w-full h-full border-r border-yellow-900/30"
          />
        </div>
        
        {/* Innehållscontainer med bättre padding och struktur */}
        <div className="flex flex-col justify-between flex-1 p-3">
          <div>
            <h3 className="text-lg font-semibold text-yellow-400 sm:text-xl line-clamp-1">
              {item.title}
            </h3>
            
            <div className="mt-1 text-sm text-gray-400">
              {item.mediaType === 'tv' ? 'TV Show' : 'Movie'}
              {item.release_date && (
                <span className="ml-2">
                  • {new Date(item.release_date).getFullYear()}
                </span>
              )}
            </div>
            
            {/* Extra info kan läggas till här */}
            {item.mediaType === 'tv' && item.number_of_seasons && (
              <div className="text-sm text-gray-400">
                {item.number_of_seasons} {item.number_of_seasons === 1 ? 'Season' : 'Seasons'}
              </div>
            )}
          </div>
          
          {/* Visa bara Remove-knappen om showRemoveButton är true */}
          {showRemoveButton && (
            <div className="flex justify-end mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(item.id);
                }}
                className="px-3 py-1 text-sm font-medium text-white transition-colors duration-150 rounded-md bg-red-600/80 hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MovieCard;