import React, { useRef } from "react";

const MovieDetailModal = ({
  movie,
  onClose,
  showActions = false,
  isWatched = false,
  isFavorited = false,
  onAddToWatched,
  onAddToFavorites,
}) => {
  // Mock IMAGE_BASE_URL for demonstration
  const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

  // Swipe to close
  const touchStartY = useRef(null);

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartY.current === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    if (touchEndY - touchStartY.current > 80) {
      // 80px swipe down
      onClose();
    }
    touchStartY.current = null;
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!movie) return null;

  // Mock data for demonstration if movie is empty
  const mockMovie = {
    title: "Sample Movie",
    tagline: "This is a sample movie tagline",
    vote_average: 7.8,
    vote_count: 2150,
    genres: [{ name: "Action" }, { name: "Drama" }],
    release_date: "2023-05-15",
    runtime: 128,
    overview:
      "This is a sample overview of the movie. It describes the plot, characters, and what makes this movie interesting to watch.",
    credits: {
      cast: [
        { id: 1, name: "Actor One", profile_path: null },
        { id: 2, name: "Actor Two", profile_path: null },
        { id: 3, name: "Actor Three", profile_path: null },
        { id: 4, name: "Actor Four", profile_path: null },
        { id: 5, name: "Actor Five", profile_path: null },
        { id: 6, name: "Actor Six", profile_path: null },
        { id: 7, name: "Actor Seven", profile_path: null },
        { id: 8, name: "Actor Eight", profile_path: null },
        { id: 9, name: "Actor Nine", profile_path: null },
        { id: 10, name: "Actor Ten", profile_path: null },
      ],
    },
    videos: {
      results: [{ key: "dQw4w9WgXcQ" }],
    },
  };

  const displayMovie = movie ?? mockMovie;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 bg-black bg-opacity-75 sm:p-4"
      onClick={handleBackdropClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="relative bg-gray-800 rounded-none sm:rounded-lg shadow-xl w-full max-w-full sm:max-w-2xl max-h-[100vh] sm:max-h-[90vh] overflow-y-auto hide-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Backdrop image */}
        {displayMovie.backdrop_path && (
          <div className="relative w-full h-40 overflow-hidden md:h-56">
            <img
              src={`${IMAGE_BASE_URL}${displayMovie.backdrop_path}`}
              alt={`${displayMovie.title} backdrop`}
              className="object-cover w-full h-full"
            />
            <div className="absolute inset-0 z-0 bg-black bg-opacity-70"></div>
            <button
              onClick={onClose}
              className="absolute p-1 transition rounded top-2 right-2 hover:bg-gray-800"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6 text-gray-300 hover:text-yellow-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Poster centrerad */}
        <div className="relative z-10 flex flex-col items-center mb-4 -mt-16">
          <img
            src={
              displayMovie.poster_path
                ? `${IMAGE_BASE_URL}${displayMovie.poster_path}`
                : "/no-profile.png"
            }
            alt={displayMovie.title}
            className="bg-gray-900 border-2 rounded-md shadow-lg w-28 sm:w-32 md:w-40 border-yellow-600/30"
          />

          {showActions && (
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => onAddToWatched?.(displayMovie)}
                disabled={!onAddToWatched}
                className={`px-3 py-2 text-xs font-semibold rounded transition
                  ${
                    isWatched
                      ? "bg-green-600 text-white cursor-default"
                      : "bg-yellow-500 text-gray-900 hover:bg-yellow-600"
                  }
                `}
              >
                {isWatched ? "Remove Watched" : "Add to Watched"}
              </button>

              <button
                type="button"
                onClick={() => onAddToFavorites?.(displayMovie)}
                disabled={!onAddToFavorites}
                className={`px-3 py-2 text-xs font-semibold rounded transition
                  ${
                    isFavorited
                      ? "bg-yellow-400 text-gray-900 cursor-default"
                      : "bg-gray-700 text-yellow-400 hover:bg-yellow-600 hover:text-gray-900"
                  }
                `}
              >
                {isFavorited ? "Unfavorite" : "Favorite"}
              </button>
            </div>
          )}
        </div>

        {/* All info/text under postern */}
        <div className="px-6 mt-2 text-left">
          <h2 className="mb-1 text-3xl font-bold text-yellow-400">
            {displayMovie.title}
          </h2>
          {displayMovie.tagline && (
            <div className="mb-2 text-lg italic text-yellow-300">
              "{displayMovie.tagline}"
            </div>
          )}
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block px-2 py-1 text-sm font-semibold text-white bg-yellow-600 rounded">
              {displayMovie.vote_average?.toFixed(2)} / 10
            </span>
            <span className="text-sm text-gray-200">
              {displayMovie.vote_count} votes
            </span>
          </div>
          <div className="mb-2 text-base font-medium text-gray-200">
            {displayMovie.genres &&
              displayMovie.genres.map((g) => g.name).join(", ")}
          </div>
          {displayMovie.release_date && (
            <div className="mb-1 text-sm text-gray-200">
              Release date: {displayMovie.release_date}
            </div>
          )}
          {displayMovie.runtime && (
            <div className="mb-1 text-sm text-gray-200">
              Runtime: {displayMovie.runtime} min
            </div>
          )}
        </div>

        {/* Movie details */}
        <div className="p-6 pt-3 pb-28">
          {/* Overview */}
          {displayMovie.overview && (
            <div className="mb-4">
              <h3 className="mb-2 text-lg font-semibold text-yellow-400">
                Overview
              </h3>
              <p className="text-gray-300">{displayMovie.overview}</p>
            </div>
          )}

          {/* Cast */}
          {displayMovie.credits && displayMovie.credits.cast && (
            <div className="mb-4">
              <h3 className="mb-2 text-lg font-semibold text-yellow-400">
                Cast
              </h3>
              <div className="grid grid-cols-5 gap-4 py-2 sm:gap-6 md:gap-4 lg:gap-6">
                {displayMovie.credits.cast.slice(0, 10).map((actor) => (
                  <div key={actor.id} className="flex flex-col items-center">
                    <div className="relative flex-shrink-0 w-16 h-16 mb-2 overflow-hidden bg-gray-900 border-2 rounded-full border-yellow-600/30">
                      <img
                        src={
                          actor.profile_path
                            ? `${IMAGE_BASE_URL}${actor.profile_path}`
                            : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23374151'/%3E%3Cpath d='M32 20c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 20c-8.8 0-16 7.2-16 16v8h32v-8c0-8.8-7.2-16-16-16z' fill='%236B7280'/%3E%3C/svg%3E"
                        }
                        alt={actor.name}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <span className="max-w-full text-xs leading-tight text-center text-gray-300 break-words">
                      {actor.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trailer */}
          {displayMovie.videos &&
            displayMovie.videos.results &&
            displayMovie.videos.results.length > 0 && (
              <div className="mb-4">
                <h3 className="mb-2 text-lg font-semibold text-yellow-400">
                  Watch trailer
                </h3>
                <div className="flex flex-row items-center justify-between gap-3">
                  <a
                    href={`https://www.youtube.com/watch?v=${displayMovie.videos.results[0].key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 font-bold text-gray-900 bg-yellow-500 rounded"
                  >
                    ▶️ Watch trailer
                  </a>
                  <button
                    onClick={onClose}
                    className="px-6 py-2 text-base font-bold text-gray-900 transition bg-yellow-400 rounded-full shadow-lg hover:bg-yellow-500"
                    style={{ minWidth: 80 }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
        </div>

        {/* Close button at the bottom */}
        <div className="sticky bottom-0 left-0 z-30 flex justify-end w-full p-4 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent"></div>
      </div>
    </div>
  );
};

export default MovieDetailModal;
