import React from "react";

const ShowDetailModal = ({
  show,
  onClose,
  showActions = false,
  isWatched = false,
  isFavorited = false,
  onAddToWatched,
  onAddToFavorites,
}) => {
  // Mock IMAGE_BASE_URL for demonstration
  const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

  // Simple touch handling for swipe down
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    e.currentTarget.startY = touch.clientY;
  };

  const handleTouchMove = (e) => {
    if (!e.currentTarget.startY) return;

    const touch = e.touches[0];
    const diffY = touch.clientY - e.currentTarget.startY;

    if (diffY > 50) {
      // Swipe down threshold
      onClose();
    }
  };

  if (!show) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Mock data for demonstration if show is empty
  const mockShow = {
    title: "Sample TV Show",
    name: "Sample TV Show",
    tagline: "This is a sample tagline",
    vote_average: 8.5,
    vote_count: 1250,
    genres: [{ name: "Drama" }, { name: "Action" }],
    first_air_date: "2020-01-01",
    last_air_date: "2023-12-31",
    number_of_seasons: 4,
    number_of_episodes: 48,
    networks: [{ name: "Netflix" }, { name: "HBO" }],
    overview:
      "This is a sample overview of the TV show. It describes the plot, characters, and what makes this show interesting to watch.",
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

  const displayShow = show || mockShow;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 bg-black bg-opacity-75 sm:p-4"
      onClick={handleBackdropClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <div
        className="relative bg-gray-800 rounded-none sm:rounded-lg shadow-xl w-full max-w-full sm:max-w-2xl max-h-[100vh] sm:max-h-[90vh] overflow-y-auto hide-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {displayShow.backdrop_path && (
          <div className="relative w-full h-40 overflow-hidden md:h-56">
            <img
              src={`${IMAGE_BASE_URL}${displayShow.backdrop_path}`}
              alt={`${displayShow.title || displayShow.name} backdrop`}
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
        <div className="relative z-10 flex flex-col items-center mb-4 -mt-16">
          <img
            src={
              displayShow.poster_path
                ? `${IMAGE_BASE_URL}${displayShow.poster_path}`
                : "/no-profile.png"
            }
            alt={displayShow.title || displayShow.name}
            className="bg-gray-900 border-2 rounded-md shadow-lg w-28 sm:w-32 md:w-40 border-yellow-600/30"
          />

          {showActions && (
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => onAddToWatched?.(displayShow)}
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
                onClick={() => onAddToFavorites?.(displayShow)}
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
        <div className="px-6 mt-2 text-left">
          <h2 className="mb-1 text-3xl font-bold text-yellow-400">
            {displayShow.title || displayShow.name}
          </h2>
          {displayShow.tagline && (
            <div className="mb-2 text-lg italic text-yellow-300">
              "{displayShow.tagline}"
            </div>
          )}
          <div className="flex items-center gap-2 mb-2">
            {displayShow.vote_average > 0 && (
              <span className="inline-block px-2 py-1 text-sm font-semibold text-white bg-yellow-600 rounded">
                {displayShow.vote_average.toFixed(1)} / 10
              </span>
            )}
            {displayShow.vote_count > 0 && (
              <span className="text-sm text-gray-200">
                {displayShow.vote_count} votes
              </span>
            )}
          </div>
          <div className="mb-2 text-base font-medium text-gray-200">
            {displayShow.genres &&
              displayShow.genres.map((g) => g.name).join(", ")}
          </div>
          {displayShow.first_air_date && (
            <div className="mb-1 text-sm text-gray-200">
              First aired: {new Date(displayShow.first_air_date).getFullYear()}
            </div>
          )}
          {displayShow.last_air_date && (
            <div className="mb-1 text-sm text-gray-200">
              Last aired: {new Date(displayShow.last_air_date).getFullYear()}
            </div>
          )}
          <div className="mb-1 text-sm text-gray-200">
            {displayShow.number_of_seasons}{" "}
            {displayShow.number_of_seasons === 1 ? "Season" : "Seasons"}
            {displayShow.number_of_episodes &&
              ` • ${displayShow.number_of_episodes} Episodes`}
          </div>
          {displayShow.networks && displayShow.networks.length > 0 && (
            <div className="mt-2 text-xs text-gray-400">
              Networks: {displayShow.networks.map((n) => n.name).join(", ")}
            </div>
          )}
        </div>
        <div className="p-6 pt-3 pb-28">
          {displayShow.overview && (
            <div className="mb-4">
              <h3 className="mb-2 text-lg font-semibold text-yellow-400">
                Overview
              </h3>
              <p className="text-gray-300">{displayShow.overview}</p>
            </div>
          )}
          {displayShow.credits && displayShow.credits.cast && (
            <div className="mb-4">
              <h3 className="mb-2 text-lg font-semibold text-yellow-400">
                Cast
              </h3>
              <div className="grid grid-cols-5 gap-4 py-2 sm:gap-6 md:gap-4 lg:gap-6">
                {displayShow.credits.cast.slice(0, 10).map((actor) => (
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
          {displayShow.videos &&
            displayShow.videos.results &&
            displayShow.videos.results.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-row items-center justify-between gap-3">
                  <a
                    href={`https://www.youtube.com/watch?v=${displayShow.videos.results[0].key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-2 text-base font-bold text-gray-900 transition bg-yellow-400 rounded-full shadow-lg hover:bg-yellow-500"
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
        <div className="sticky bottom-0 left-0 z-30 flex justify-end w-full p-4 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent"></div>
      </div>
    </div>
  );
};

export default ShowDetailModal;
