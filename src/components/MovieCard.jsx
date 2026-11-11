import React, { useState } from "react";
import { FaRegCommentDots, FaRegClock } from "react-icons/fa";
import { IMAGE_BASE_URL } from "../config";
import { genreNamesFromItem } from "../utils/genreMap";
import { normalizeRating10, formatRating10 } from "../utils/rating";
import RatingInput from "./RatingInput";

const MovieCard = ({
  item,
  onSelect,
  onRemove,
  onRate,
  showRemoveButton = true,
}) => {
  const displayItem = item || {};
  const titleText = displayItem.title || displayItem.name || "Untitled";

  const genres = genreNamesFromItem(item, Infinity);
  const ratingValue = normalizeRating10(displayItem.userRating) ?? 0;
  const noteText =
    typeof displayItem.userComment === "string"
      ? displayItem.userComment.trim()
      : "";
  const tmdbRating =
    typeof displayItem.vote_average === "number" && displayItem.vote_average > 0
      ? displayItem.vote_average.toFixed(1)
      : null;
  const runtimeLabel = (() => {
    const mins = displayItem.runtime;
    if (typeof mins !== "number" || mins <= 0) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  })();
  const canRate = typeof onRate === "function";

  const [isEditing, setIsEditing] = useState(false);
  const [draftRating, setDraftRating] = useState(ratingValue);
  const [draftComment, setDraftComment] = useState(noteText);

  const isSelectable = typeof onSelect === "function";

  const openEditor = (e) => {
    e?.stopPropagation();
    if (!canRate) return;
    setDraftRating(ratingValue);
    setDraftComment(noteText);
    setIsEditing(true);
  };

  const saveEditor = (e) => {
    e?.stopPropagation();
    onRate?.(displayItem, draftRating, draftComment);
    setIsEditing(false);
  };

  const handleCardKeyDown = (e) => {
    if (!isSelectable) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(displayItem);
    }
  };

  return (
    <div className="relative mb-4 sm:mr-2">
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
          <div className="relative flex-shrink-0 w-24 h-36 sm:w-28 sm:h-40">
            <img
              src={
                displayItem.poster_path
                  ? `${IMAGE_BASE_URL}${displayItem.poster_path}`
                  : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='112' height='168' viewBox='0 0 112 168'%3E%3Crect width='112' height='168' fill='%23374151'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='0.3em' fill='%236B7280' font-family='Arial' font-size='12'%3ENo Image%3C/text%3E%3C/svg%3E"
              }
              alt={titleText}
              className="object-cover w-full h-full app-poster"
            />
            {canRate ? (
              <button
                type="button"
                onClick={openEditor}
                className={`absolute bottom-1.5 left-1.5 z-20 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold shadow-[0_4px_12px_rgba(0,0,0,0.5)] backdrop-blur-sm transition-colors ${
                  ratingValue > 0
                    ? "border border-yellow-300/50 bg-gray-950/85 text-yellow-200 hover:bg-gray-900/90"
                    : "border border-white/20 bg-gray-950/80 text-gray-100 hover:bg-gray-900/85"
                }`}
                aria-label={
                  ratingValue > 0
                    ? `Current rating ${formatRating10(ratingValue)} of 10. Tap to update rating and note`
                    : "Rate this movie"
                }
              >
                {ratingValue > 0 ? (
                  <>
                    <span aria-hidden="true">★</span>
                    <span>{formatRating10(ratingValue)}</span>
                  </>
                ) : (
                  <>
                    <span className="text-yellow-300/80" aria-hidden="true">
                      ☆
                    </span>
                    <span>Rate</span>
                  </>
                )}
              </button>
            ) : (
              ratingValue > 0 && (
                <div className="pointer-events-none absolute bottom-1.5 left-1.5 z-20 inline-flex items-center gap-1 rounded-md border border-yellow-300/50 bg-gray-950/85 px-2 py-0.5 text-xs font-bold text-yellow-200 shadow-[0_4px_12px_rgba(0,0,0,0.5)] backdrop-blur-sm">
                  <span aria-hidden="true">★</span>
                  <span>{formatRating10(ratingValue)}</span>
                </div>
              )
            )}
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
                    <span className="text-gray-300"> +{genres.length - 3} more</span>
                  )}
                </div>
              )}

              {tmdbRating && (
                <div className="mt-1 flex items-center gap-1 text-sm text-gray-300">
                  <span className="text-yellow-300/80" aria-hidden="true">
                    ★
                  </span>
                  <span>TMDb {tmdbRating}</span>
                </div>
              )}

              {runtimeLabel && (
                <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-300">
                  <FaRegClock
                    className="text-gray-400"
                    aria-hidden="true"
                  />
                  <span>{runtimeLabel}</span>
                </div>
              )}

              {noteText && !isEditing && (
                <div className="mt-1.5 flex items-start gap-1.5 text-xs text-gray-400">
                  <FaRegCommentDots
                    className="mt-0.5 flex-shrink-0 text-yellow-300/70"
                    aria-hidden="true"
                  />
                  <span className="line-clamp-2 italic">{noteText}</span>
                </div>
              )}

              {isEditing && (
                <div
                  className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <RatingInput
                    value={draftRating}
                    onChange={setDraftRating}
                    idBase={`movie-${displayItem.id}`}
                  />
                  <textarea
                    value={draftComment}
                    onChange={(e) => setDraftComment(e.target.value)}
                    placeholder="A quick note — e.g. why you stopped, or a verdict…"
                    rows={2}
                    className="app-input mt-3 w-full resize-none text-sm"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditing(false);
                      }}
                      className="app-button-ghost px-3 py-1.5 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveEditor}
                      className="app-button-primary px-3 py-1.5 text-xs"
                    >
                      Save
                    </button>
                  </div>
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
