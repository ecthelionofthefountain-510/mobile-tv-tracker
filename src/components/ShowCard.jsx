import React from "react";
import { IMAGE_BASE_URL } from "../config";

const ShowCard = ({ item, onSelect, onDetailsClick, onRemove }) => {
  // Räkna antal sedda avsnitt
  const watchedEpisodes = item.seasons ? 
    Object.values(item.seasons)
      .reduce((sum, season) => sum + (season.watchedEpisodes?.length || 0), 0) : 0;

  return (
    <div 
      className="mb-4 relative bg-gray-800/90 rounded-lg overflow-hidden border border-yellow-900/30 hover:bg-gray-700/90 transition-colors duration-200 cursor-pointer"
      onClick={() => onSelect(item)}
    >
      {/* Använder flex med bättre proportioner */}
      <div className="flex h-32 sm:h-40">
        {/* Större thumbnail som täcker hela höjden */}
        <div className="h-full w-24 sm:w-28 flex-shrink-0">
          <img
            src={`${IMAGE_BASE_URL}${item.poster_path}`}
            alt={item.title}
            className="h-full w-full object-cover border-r border-yellow-900/30"
            onClick={(e) => {
              e.stopPropagation();
              if (onDetailsClick) onDetailsClick(item);
            }}
          />
        </div>
        
        {/* Innehållscontainer med bättre padding och struktur */}
        <div className="flex-1 flex flex-col justify-between p-3">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-yellow-400 line-clamp-1">
              {item.title}
            </h3>
            
            <div className="text-gray-400 text-sm mt-1">
              {item.number_of_seasons} {item.number_of_seasons === 1 ? 'Season' : 'Seasons'} • TV Show
            </div>
            
            {watchedEpisodes > 0 && (
              <div className="text-gray-400 text-sm mt-1">
                {watchedEpisodes} episodes watched
              </div>
            )}
            
            {item.first_air_date && (
              <div className="text-gray-400 text-sm mt-1">
                First aired: {new Date(item.first_air_date).getFullYear()}
              </div>
            )}
          </div>
          
          {/* Knapp sektion i botten av kortet */}
          <div className="flex justify-end mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item.id);
              }}
              className="px-3 py-1 bg-red-600/80 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors duration-150"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShowCard;