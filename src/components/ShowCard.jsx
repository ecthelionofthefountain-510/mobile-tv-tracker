import React from "react";

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

const ShowCard = ({ item, onSelect, onRemove, showRemoveButton = true }) => {
  const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

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

  // Mock data för demonstration (valfritt, ta bort om du inte behöver)
  const mockItem = {
    id: 1,
    name: "Sample Show",
    poster_path: null,
    mediaType: "tv",
    first_air_date: "2022-01-01",
    genre_ids: [18, 9648],
    ...item
  };

  const displayItem = { ...mockItem, ...item };

  return (
    <div
      className="relative mb-4 overflow-hidden transition-colors duration-200 border rounded-lg cursor-pointer bg-gray-800/90 border-yellow-900/30 hover:bg-gray-700/90"
      onClick={onSelect ? () => onSelect(displayItem) : undefined}
    >
      <div className="flex h-32 sm:h-40">
        <div className="flex-shrink-0 w-24 h-full sm:w-28">
          <img
            src={displayItem.poster_path ? `${IMAGE_BASE_URL}${displayItem.poster_path}` : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='112' height='168' viewBox='0 0 112 168'%3E%3Crect width='112' height='168' fill='%23374151'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='0.3em' fill='%236B7280' font-family='Arial' font-size='12'%3ENo Image%3C/text%3E%3C/svg%3E"}
            alt={displayItem.name}
            className="object-cover w-full h-full border-r border-yellow-900/30"
          />
        </div>
        <div className="flex flex-col justify-between flex-1 min-w-0 p-3">
          <div>
            <h3 className="text-lg font-semibold text-yellow-400 truncate sm:text-xl">
              {displayItem.name}
            </h3>
            <div className="mt-1 text-sm text-gray-400 truncate">
              TV Show
              {displayItem.first_air_date && (
                <span className="ml-2">
                  • {new Date(displayItem.first_air_date).getFullYear()}
                </span>
              )}
            </div>
            {genres.length > 0 && (
              <div className="mt-1 text-sm text-gray-300 truncate">
                {genres.slice(0, 3).join(", ")}
                {genres.length > 3 && <span className="text-gray-400"> +{genres.length - 3} more</span>}
              </div>
            )}
            {/* Extra info för TV-serier */}
            {displayItem.number_of_seasons && (
              <div className="mt-1 text-sm text-gray-400">
                {displayItem.number_of_seasons} {displayItem.number_of_seasons === 1 ? 'Season' : 'Seasons'}
              </div>
            )}
            
          </div>
          {showRemoveButton && (
            <div className="flex justify-end mt-2">
              <button
                onClick={e => {
                  e.stopPropagation();
                  onRemove(displayItem);
                }}
                className="px-3 py-1 text-sm font-medium text-red-600 transition-colors duration-200 bg-red-100 rounded-full hover:bg-red-200"
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

export default ShowCard;