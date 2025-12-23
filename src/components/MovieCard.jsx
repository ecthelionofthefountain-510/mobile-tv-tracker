import React from "react";
import { IMAGE_BASE_URL } from "../config";

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
  37: "Western",
};

const MovieCard = ({ item, onSelect, onRemove, showRemoveButton = true }) => {
  const displayItem = item || {};
  const titleText = displayItem.title || displayItem.name || "Untitled";

  // Förbättrad genre-hantering
  const getGenres = () => {
    // Om item.genres finns som objekt array (från detaljerad API-anrop)
    if (item.genres && Array.isArray(item.genres) && item.genres.length > 0) {
      return item.genres
        .map((g) => (typeof g === "object" ? g.name : GENRE_MAP[g]))
        .filter(Boolean);
    }

    // Om item.genre_ids finns (från sök-API)
    if (
      item.genre_ids &&
      Array.isArray(item.genre_ids) &&
      item.genre_ids.length > 0
    ) {
      return item.genre_ids.map((id) => GENRE_MAP[id]).filter(Boolean);
    }

    // Fallback - returnera tom array
    return [];
  };

  const genres = getGenres();

  const isSelectable = typeof onSelect === "function";

  const handleCardKeyDown = (e) => {
    if (!isSelectable) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(displayItem);
    }
  };

  return (
    <div
      className={`relative mb-4 overflow-hidden transition-colors duration-200 border rounded-lg bg-gray-800 border-yellow-900/30 hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${
        isSelectable ? "cursor-pointer" : ""
      }`}
      onClick={isSelectable ? () => onSelect(displayItem) : undefined}
      role={isSelectable ? "button" : undefined}
      tabIndex={isSelectable ? 0 : undefined}
      onKeyDown={handleCardKeyDown}
      aria-label={isSelectable ? `Open details for ${titleText}` : undefined}
    >
      <div className="flex">
        <div className="flex-shrink-0 w-24 self-stretch min-h-[8rem] sm:w-28 sm:min-h-[10rem]">
          <img
            src={
              displayItem.poster_path
                ? `${IMAGE_BASE_URL}${displayItem.poster_path}`
                : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='112' height='168' viewBox='0 0 112 168'%3E%3Crect width='112' height='168' fill='%23374151'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='0.3em' fill='%236B7280' font-family='Arial' font-size='12'%3ENo Image%3C/text%3E%3C/svg%3E"
            }
            alt={titleText}
            className="object-cover w-full h-full border-r border-yellow-900/30"
          />
        </div>

        <div className="flex flex-col justify-between flex-1 min-w-0 p-3">
          <div>
            <h3 className="text-lg font-semibold text-yellow-400 sm:text-xl line-clamp-1">
              {titleText}
            </h3>

            <div className="mt-1 text-sm text-gray-400">
              {displayItem.mediaType === "tv" ? "TV Show" : "Movie"}
              {displayItem.release_date && (
                <span className="ml-2">
                  • {new Date(displayItem.release_date).getFullYear()}
                </span>
              )}
            </div>

            {/* Genre-visning */}
            {genres.length > 0 && (
              <div className="mt-1 text-sm text-gray-300">
                {genres.slice(0, 3).join(", ")}
                {genres.length > 3 && (
                  <span className="text-gray-400">
                    {" "}
                    +{genres.length - 3} more
                  </span>
                )}
              </div>
            )}

            {/* Extra info för TV-serier */}
            {displayItem.mediaType === "tv" &&
              displayItem.number_of_seasons && (
                <div className="mt-1 text-sm text-gray-400">
                  {displayItem.number_of_seasons}{" "}
                  {displayItem.number_of_seasons === 1 ? "Season" : "Seasons"}
                </div>
              )}
          </div>

          {showRemoveButton && (
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(displayItem.id);
                }}
                className="px-3 py-1 text-sm font-medium text-white transition-colors duration-150 rounded-md bg-red-600/80 hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
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
