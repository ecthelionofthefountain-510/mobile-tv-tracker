import React, { useState } from "react";
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

const MovieCard = ({
  item,
  onSelect,
  onRemove,
  onRate,
  showRemoveButton = true,
}) => {
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
  const ratingValue =
    typeof displayItem.userRating === "number" && displayItem.userRating > 0
      ? Math.max(1, Math.min(5, Math.round(displayItem.userRating)))
      : 0;
  const canRate = typeof onRate === "function";
  const [isEditingRating, setIsEditingRating] = useState(false);
  const showRatingPicker = canRate && (ratingValue === 0 || isEditingRating);

  const isSelectable = typeof onSelect === "function";

  const handleCardKeyDown = (e) => {
    if (!isSelectable) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(displayItem);
    }
  };

  return (
    <div className={`relative mb-4 ${ratingValue > 0 ? "pt-2" : ""}`}>
      {ratingValue > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!canRate) return;
            setIsEditingRating((prev) => !prev);
          }}
          className={
            "absolute right-3 top-0 z-20 -translate-y-1/2 rounded-full border border-yellow-300/40 bg-gray-900/95 px-2 py-0.5 text-[11px] font-semibold text-yellow-200 shadow-sm " +
            (canRate
              ? "cursor-pointer transition-colors hover:bg-gray-800/90"
              : "pointer-events-none")
          }
          aria-label={
            canRate
              ? `Current rating ${ratingValue} of 5. Tap to edit rating`
              : `Current rating ${ratingValue} of 5`
          }
        >
          {ratingValue}/5
        </button>
      )}

      <div
        className={`app-card app-card-hover relative ring-1 ring-inset ring-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${
          isSelectable ? "cursor-pointer" : ""
        }`}
        onClick={isSelectable ? () => onSelect(displayItem) : undefined}
        role={isSelectable ? "button" : undefined}
        tabIndex={isSelectable ? 0 : undefined}
        onKeyDown={handleCardKeyDown}
        aria-label={isSelectable ? `Open details for ${titleText}` : undefined}
      >
        <div className="flex p-3">
          <div className="flex-shrink-0 w-24 h-36 sm:w-28 sm:h-40">
            <img
              src={
                displayItem.poster_path
                  ? `${IMAGE_BASE_URL}${displayItem.poster_path}`
                  : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='112' height='168' viewBox='0 0 112 168'%3E%3Crect width='112' height='168' fill='%23374151'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='0.3em' fill='%236B7280' font-family='Arial' font-size='12'%3ENo Image%3C/text%3E%3C/svg%3E"
              }
              alt={titleText}
              className="object-cover w-full h-full app-poster"
            />
          </div>

          <div className="ml-4 flex min-w-0 flex-1 flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-100 line-clamp-1">
                {titleText}
              </h3>

              <div className="mt-1 text-sm text-gray-300">
                {displayItem.mediaType === "tv" ? "TV Show" : "Movie"}
                {displayItem.release_date && (
                  <span className="ml-2">
                    • {new Date(displayItem.release_date).getFullYear()}
                  </span>
                )}
              </div>

              {/* Genre-visning */}
              {genres.length > 0 && (
                <div className="mt-1 text-sm text-gray-200">
                  {genres.slice(0, 3).join(", ")}
                  {genres.length > 3 && (
                    <span className="text-gray-300">
                      {" "}
                      +{genres.length - 3} more
                    </span>
                  )}
                </div>
              )}

              {/* Extra info för TV-serier */}
              {displayItem.mediaType === "tv" &&
                displayItem.number_of_seasons && (
                  <div className="mt-1 text-sm text-gray-300">
                    {displayItem.number_of_seasons}{" "}
                    {displayItem.number_of_seasons === 1 ? "Season" : "Seasons"}
                  </div>
                )}

              {showRatingPicker && (
                <div className="mt-1.5 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = star <= ratingValue;
                    const label =
                      star === ratingValue
                        ? `Set movie rating to ${star} of 5 (tap again to clear)`
                        : `Set movie rating to ${star} of 5`;

                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRate(displayItem, star === ratingValue ? 0 : star);
                          setIsEditingRating(false);
                        }}
                        className={
                          "text-sm leading-none transition-colors " +
                          (active
                            ? "text-yellow-300 hover:text-yellow-200"
                            : "text-gray-600 hover:text-gray-400")
                        }
                        aria-label={label}
                      >
                        ★
                      </button>
                    );
                  })}
                  <span className="ml-1 text-[11px] text-gray-400">
                    {ratingValue > 0 ? "Update" : "Rate"}
                  </span>
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
                  className="app-button-danger px-3 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieCard;
