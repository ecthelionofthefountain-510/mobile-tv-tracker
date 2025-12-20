import React from "react";
import { IMAGE_BASE_URL } from "../config";

const MediaCard = ({
  item,
  onSelect,
  onRemove,
  onAddToWatched,
  alreadyWatched,
  showAddToWatched = true,
}) => {
  return (
    <div
      className="mb-4 relative overflow-hidden rounded-lg border border-yellow-900/30 group"
      onClick={() => onSelect(item)}
    >
      {/* Bakgrundsbild med mörkare overlay */}
      <div className="absolute inset-0 bg-gray-900"></div>

      <div className="flex p-3 relative z-10">
        {/* Poster/Thumbnail */}
        <div className="w-24 h-36 flex-shrink-0">
          <img
            src={`${IMAGE_BASE_URL}${item.poster_path}`}
            alt={item.title}
            className="w-full h-full object-cover rounded-md shadow-lg border-2 border-yellow-600/30"
          />
        </div>

        {/* Innehåll */}
        <div className="ml-4 flex-1 min-w-0">
          <h3 className="text-xl font-bold text-yellow-400 mb-1 truncate">
            {item.title}
          </h3>

          <div className="text-sm text-yellow-300/70 mb-1">
            {item.mediaType === "tv" ? "TV SERIES" : "MOVIE"}
          </div>

          {item.number_of_seasons && (
            <div className="text-sm text-gray-400 mb-1">
              {item.number_of_seasons}{" "}
              {item.number_of_seasons === 1 ? "SEASON" : "SEASONS"}
            </div>
          )}

          {/* Visa sedda avsnitt för serier */}
          {item.mediaType === "tv" && item.seasons && (
            <div className="text-sm text-gray-400 mb-1">
              {Object.values(item.seasons).reduce(
                (sum, season) => sum + (season.watchedEpisodes?.length || 0),
                0
              )}{" "}
              EPISODES WATCHED
            </div>
          )}

          {/* Utgivnings-/sändningsdatum */}
          {(item.first_air_date || item.release_date) && (
            <div className="text-sm text-gray-400 mb-1">
              {item.first_air_date ? "FIRST AIRED: " : "RELEASED: "}
              {new Date(item.first_air_date || item.release_date).getFullYear()}
            </div>
          )}

          {/* Små ikonknappar */}
          <div className="flex mt-2 space-x-2">
            {showAddToWatched && !alreadyWatched && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToWatched(item, e);
                }}
                className="w-8 h-8 bg-green-600 hover:bg-green-700 text-white rounded-full flex items-center justify-center"
                title="Add to watched"
              >
                ✓
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item.id, e);
              }}
              className="w-8 h-8 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center"
              title="Remove"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* Status badge */}
      {alreadyWatched && (
        <div className="absolute top-0 right-0 bg-green-600 text-white text-xs px-2 py-1 rounded-bl">
          WATCHED
        </div>
      )}
    </div>
  );
};

export default MediaCard;
