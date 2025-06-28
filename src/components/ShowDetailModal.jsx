import React from "react";
import { IMAGE_BASE_URL } from "../config";
import { useSwipeable } from 'react-swipeable';

const ShowDetailModal = ({ show, onClose }) => {
  const handlers = useSwipeable({
    onSwipedDown: () => onClose(),
    preventScrollOnSwipe: true,
    trackTouch: true,
    delta: 30,
  });

  if (!show) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      {...handlers}
      className="fixed inset-0 z-50 flex items-center justify-center p-0 bg-black bg-opacity-75 sm:p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="relative bg-gray-800 rounded-none sm:rounded-lg shadow-xl w-full max-w-full sm:max-w-2xl max-h-[100vh] sm:max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute z-20 px-4 py-2 text-white bg-gray-700 rounded-md top-2 right-2 hover:bg-gray-600"
        >
          Close
        </button>
        {show.backdrop_path && (
          <div className="relative w-full h-40 overflow-hidden md:h-56">
            <img
              src={`${IMAGE_BASE_URL}${show.backdrop_path}`}
              alt={`${show.title || show.name} backdrop`}
              className="object-cover w-full h-full"
            />
            <div className="absolute inset-0 z-0 bg-black bg-opacity-70"></div>
          </div>
        )}
        <div className="relative z-10 flex justify-center mb-4 -mt-16">
          <img
            src={show.poster_path ? `${IMAGE_BASE_URL}${show.poster_path}` : "/no-profile.png"}
            alt={show.title || show.name}
            className="bg-gray-900 border-2 rounded-md shadow-lg w-28 sm:w-32 md:w-40 border-yellow-600/30"
          />
        </div>
        <div className="px-6 mt-2 text-left">
          <h2 className="mb-1 text-3xl font-bold text-yellow-400">{show.title || show.name}</h2>
          {show.tagline && (
            <div className="mb-2 text-lg italic text-yellow-300">"{show.tagline}"</div>
          )}
          <div className="flex items-center gap-2 mb-2">
            {show.vote_average > 0 && (
              <span className="inline-block px-2 py-1 text-sm font-semibold text-white bg-yellow-600 rounded">{show.vote_average.toFixed(1)} / 10</span>
            )}
            {show.vote_count > 0 && (
              <span className="text-sm text-gray-200">{show.vote_count} votes</span>
            )}
          </div>
          <div className="mb-2 text-base font-medium text-gray-200">
            {show.genres && show.genres.map(g => g.name).join(", ")}
          </div>
          {show.first_air_date && (
            <div className="mb-1 text-sm text-gray-200">
              First aired: {new Date(show.first_air_date).getFullYear()}
            </div>
          )}
          {show.last_air_date && (
            <div className="mb-1 text-sm text-gray-200">
              Last aired: {new Date(show.last_air_date).getFullYear()}
            </div>
          )}
          <div className="mb-1 text-sm text-gray-200">
            {show.number_of_seasons} {show.number_of_seasons === 1 ? 'Season' : 'Seasons'}
            {show.number_of_episodes && ` • ${show.number_of_episodes} Episodes`}
          </div>
          {show.networks && show.networks.length > 0 && (
            <div className="mt-2 text-xs text-gray-400">
              Networks: {show.networks.map(n => n.name).join(", ")}
            </div>
          )}
        </div>
        <div className="p-6 pt-3 pb-28">
          {show.overview && (
            <div className="mb-4">
              <h3 className="mb-2 text-lg font-semibold text-yellow-400">Overview</h3>
              <p className="text-gray-300">{show.overview}</p>
            </div>
          )}
          {show.credits && show.credits.cast && (
            <div className="mb-4">
              <h3 className="mb-2 text-lg font-semibold text-yellow-400">Cast</h3>
              <div className="flex gap-2 overflow-x-auto">
                {show.credits.cast.slice(0, 10).map(actor => (
                  <div key={actor.id} className="flex flex-col items-center w-20 overflow-hidden">
                    <img
                      src={actor.profile_path ? `${IMAGE_BASE_URL}${actor.profile_path}` : "/no-profile.png"}
                      alt={actor.name}
                      className="object-cover border rounded-full h-26 w-26 min-w-16 min-h-16 aspect-square"
                    />
                    <span className="mt-1 text-xs text-center text-gray-300">{actor.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {show.videos && show.videos.results && show.videos.results.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-lg font-semibold text-yellow-400">Watch trailer</h3>
              <a
                href={`https://www.youtube.com/watch?v=${show.videos.results[0].key}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 font-bold text-gray-900 bg-yellow-500 rounded"
              >
                ▶️ Watch trailer
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShowDetailModal;