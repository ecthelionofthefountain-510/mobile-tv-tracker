import React from "react";
import { IMAGE_BASE_URL } from "../config";

const FavoriteCard = ({ item, onClick, onRemove, onAddToWatched, alreadyWatched }) => {
  return (
    <div 
      className="mb-4 relative bg-gray-800/90 rounded-lg overflow-hidden border border-yellow-900/30 hover:bg-gray-700/90 transition-colors duration-200 cursor-pointer"
      onClick={onClick}
    >
      {/* Använder flex med bättre proportioner */}
      <div className="flex h-32 sm:h-40">
        {/* Större thumbnail som täcker hela höjden */}
        <div className="h-full w-24 sm:w-28 flex-shrink-0">
          <img
            src={`${IMAGE_BASE_URL}${item.poster_path}`}
            alt={item.title}
            className="h-full w-full object-cover border-r border-yellow-900/30"
          />
        </div>
        
        {/* Innehållscontainer med bättre padding och struktur */}
        <div className="flex-1 flex flex-col justify-between p-3">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-yellow-400 line-clamp-1">
              {item.title}
            </h3>
            
            <span className="inline-block px-2 py-1 bg-yellow-600/20 text-yellow-400 text-xs rounded-full mt-1">
              {item.mediaType === 'tv' ? 'TV Series' : 'Movie'}
            </span>
          </div>
          
          {/* Knappar med bättre layout */}
          <div className="flex flex-wrap gap-2 mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item.id, e);
              }}
              className="px-3 py-1 bg-red-600/80 hover:bg-red-700 text-white rounded-md transition-colors duration-200 text-sm"
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
        </div>
      </div>
    </div>
  );
};

export default FavoriteCard;