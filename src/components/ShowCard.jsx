import React from "react";
import { IMAGE_BASE_URL } from "../config";
import { genreNamesFromItem } from "../utils/genreMap";

const ShowCard = ({
  item,
  onSelect,
  onRemove,
  onShowInfo,
  onRequestRating,
  showRemoveButton = true,
}) => {
  const displayItem = item || {};
  const nameText = displayItem.name || displayItem.title || "Untitled";

  const genres = genreNamesFromItem(item, Infinity);

  const getWatchedEpisodeCount = () => {
    const seasons = displayItem?.seasons;
    if (!seasons || typeof seasons !== "object") return 0;
    return Object.values(seasons).reduce(
      (sum, season) => sum + (season?.watchedEpisodes?.length || 0),
      0,
    );
  };

  const getTotalEpisodeCount = () => {
    const explicit =
      displayItem?.number_of_episodes ??
      displayItem?.totalEpisodes ??
      displayItem?.total_episodes;
    return typeof explicit === "number" && explicit > 0 ? explicit : null;
  };

  const watchedEpisodes = getWatchedEpisodeCount();
  const totalEpisodes = getTotalEpisodeCount();

  const progressRatio = (() => {
    if (displayItem?.completed) return 1;
    if (!totalEpisodes) return null;
    return Math.max(0, Math.min(1, watchedEpisodes / totalEpisodes));
  })();

  const progressPercent =
    progressRatio === null ? null : Math.round(progressRatio * 100);
  const ratingValue =
    typeof displayItem.userRating === "number" && displayItem.userRating > 0
      ? Math.max(1, Math.min(5, Math.round(displayItem.userRating)))
      : 0;
  const showRatingBadge = !!displayItem?.completed || ratingValue > 0;
  const canRequestRating = typeof onRequestRating === "function";

  const isSelectable = typeof onSelect === "function";

  const handleCardKeyDown = (e) => {
    if (!isSelectable) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(displayItem);
    }
  };

  return (
    <div className="relative mb-4">
      {showRatingBadge &&
        (canRequestRating ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRequestRating(displayItem);
            }}
            className="absolute right-1 top-1 z-20 rounded-full border border-yellow-300/45 bg-gray-900/95 px-2.5 py-0.5 text-[11px] font-semibold text-yellow-200 shadow-[0_6px_18px_rgba(0,0,0,0.35)] transition-colors hover:bg-gray-800/90 sm:-right-2 sm:top-2"
            aria-label={
              ratingValue > 0
                ? `Current rating ${ratingValue} of 5. Tap to update rating`
                : "Rate this show"
            }
          >
            {ratingValue > 0 ? `${ratingValue}/5` : "Rate"}
          </button>
        ) : (
          <div className="pointer-events-none absolute right-1 top-1 z-20 rounded-full border border-yellow-300/45 bg-gray-900/95 px-2.5 py-0.5 text-[11px] font-semibold text-yellow-200 shadow-[0_6px_18px_rgba(0,0,0,0.35)] sm:-right-2 sm:top-2">
            {ratingValue > 0 ? `${ratingValue}/5` : "Rate"}
          </div>
        ))}

      <div
        className={`app-card app-card-hover relative ring-1 ring-inset ring-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${
          isSelectable ? "cursor-pointer" : ""
        }`}
        onClick={isSelectable ? () => onSelect(displayItem) : undefined}
        role={isSelectable ? "button" : undefined}
        tabIndex={isSelectable ? 0 : undefined}
        onKeyDown={handleCardKeyDown}
        aria-label={isSelectable ? `Open details for ${nameText}` : undefined}
      >
        <div className="flex flex-col">
          <div className="flex p-3">
            <button
              type="button"
              className="flex-shrink-0 w-24 h-36 sm:w-28 sm:h-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              onClick={(e) => {
                e.stopPropagation();
                if (onShowInfo) onShowInfo(displayItem);
              }}
              aria-label={`Show info for ${displayItem.name}`}
            >
              <img
                src={
                  displayItem.poster_path
                    ? `${IMAGE_BASE_URL}${displayItem.poster_path}`
                    : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='112' height='168' viewBox='0 0 112 168'%3E%3Crect width='112' height='168' fill='%23374151'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='0.3em' fill='%236B7280' font-family='Arial' font-size='12'%3ENo Image%3C/text%3E%3C/svg%3E"
                }
                alt={nameText}
                className="object-cover w-full h-full app-poster"
              />
            </button>
            <div className="flex flex-col justify-between flex-1 min-w-0 pr-4 ml-4">
              <div>
                <h3 className="text-xl font-bold text-gray-100 truncate">
                  {nameText}
                </h3>
                <div className="mt-1 text-sm text-gray-300 truncate">
                  TV Show
                  {displayItem.first_air_date && (
                    <span className="ml-2">
                      • {new Date(displayItem.first_air_date).getFullYear()}
                    </span>
                  )}
                </div>
                {genres.length > 0 && (
                  <div className="mt-1 text-sm text-gray-200 truncate">
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
                {displayItem.number_of_seasons && (
                  <div className="mt-1 text-sm text-gray-300">
                    {displayItem.number_of_seasons}{" "}
                    {displayItem.number_of_seasons === 1 ? "Season" : "Seasons"}
                  </div>
                )}

                {totalEpisodes !== null ? (
                  <div className="mt-1 text-sm text-gray-300">
                    Episodes: {watchedEpisodes}/{totalEpisodes}
                  </div>
                ) : watchedEpisodes > 0 ? (
                  <div className="mt-1 text-sm text-gray-300">
                    Episodes watched: {watchedEpisodes}
                  </div>
                ) : null}
              </div>
              {showRemoveButton && (
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(displayItem);
                    }}
                    className="px-3 py-1 app-button-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>

          {progressPercent !== null && (
            <div className="px-3 pb-3">
              <div className="w-full h-1.5 rounded-full bg-white/10">
                <div
                  className={`h-1.5 rounded-full ${
                    progressPercent === 100 ? "bg-emerald-500" : "bg-yellow-400"
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShowCard;
