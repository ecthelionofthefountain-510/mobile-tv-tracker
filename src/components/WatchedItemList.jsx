// WatchedItemList.jsx
import React, { useState } from "react";
import { IMAGE_BASE_URL } from "../config";

const SeasonHeader = ({ season, totalEpisodes, watchedEpisodes, isExpanded, onToggle, onToggleAll }) => {
  const allWatched = watchedEpisodes === totalEpisodes;
  
  return (
    <div 
      onClick={onToggle}
      className="flex items-center justify-between p-3 bg-gray-800/90 rounded-lg cursor-pointer hover:bg-gray-700/90 border border-yellow-900/30"
    >
      <div className="flex items-center space-x-4">
        <span className="text-yellow-400 text-lg">Season {season}</span>
        <span className="text-sm text-gray-400">{watchedEpisodes}/{totalEpisodes}</span>
      </div>
      <div className="flex items-center space-x-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleAll();
          }}
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            allWatched ? 'bg-green-500' : 'bg-gray-600'
          }`}
        >
          {allWatched && <span className="text-white">✓</span>}
        </button>
        <span className="text-yellow-400">
          {isExpanded ? '▼' : '▶'}
        </span>
      </div>
    </div>
  );
};

const Episode = ({ episode, isWatched, onToggle }) => {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg mt-2">
      <div className="flex items-center space-x-3">
        <img 
          src={episode.still_path ? `${IMAGE_BASE_URL}${episode.still_path}` : '/placeholder.jpg'} 
          alt={episode.name}
          className="w-16 h-9 object-cover rounded"
        />
        <div>
          <div className="text-sm text-yellow-400">
            S{episode.season_number.toString().padStart(2, '0')} | E{episode.episode_number.toString().padStart(2, '0')}
          </div>
          <div className="text-white">{episode.name}</div>
        </div>
      </div>
      <button
        onClick={() => onToggle(episode.episode_number)}
        className={`w-8 h-8 rounded-full flex items-center justify-center ${
          isWatched ? 'bg-green-500' : 'bg-gray-600'
        }`}
      >
        {isWatched && <span className="text-white">✓</span>}
      </button>
    </div>
  );
};

const ShowDetails = ({ item, onUpdateSeasons }) => {
  const [expandedSeasons, setExpandedSeasons] = useState(new Set());

  const toggleSeason = (seasonNumber) => {
    const newExpanded = new Set(expandedSeasons);
    if (newExpanded.has(seasonNumber)) {
      newExpanded.delete(seasonNumber);
    } else {
      newExpanded.add(seasonNumber);
    }
    setExpandedSeasons(newExpanded);
  };

  const toggleAllEpisodes = (seasonNumber, episodes) => {
    if (!episodes || episodes.length === 0) return;

    const watchedEpisodes = item.seasons?.[seasonNumber]?.watchedEpisodes || [];
    const allWatched = episodes.length === watchedEpisodes.length;

    episodes.forEach(episode => {
      onUpdateSeasons(item.id, seasonNumber, episode.episode_number, !allWatched);
    });
  };

  return (
    <div className="space-y-3">
      {[...Array(item.number_of_seasons)].map((_, idx) => {
        const seasonNumber = idx + 1;
        const episodes = item.episodes?.[seasonNumber] || [];
        const watchedEpisodes = item.seasons?.[seasonNumber]?.watchedEpisodes || [];
        const isExpanded = expandedSeasons.has(seasonNumber);

        return (
          <div key={seasonNumber} className="space-y-2">
            <SeasonHeader
              season={seasonNumber}
              totalEpisodes={episodes.length}
              watchedEpisodes={watchedEpisodes.length}
              isExpanded={isExpanded}
              onToggle={() => toggleSeason(seasonNumber)}
              onToggleAll={() => toggleAllEpisodes(seasonNumber, episodes)}
            />
            
            {isExpanded && (
              <div className="ml-4 space-y-2">
                {episodes.map(episode => (
                  <Episode
                    key={episode.id}
                    episode={episode}
                    isWatched={watchedEpisodes.includes(episode.episode_number)}
                    onToggle={(epNumber) => {
                      onUpdateSeasons(
                        item.id,
                        seasonNumber,
                        epNumber,
                        !watchedEpisodes.includes(epNumber)
                      );
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const WatchedItemList = ({ items, title, onRemove, onUpdateSeasons }) => {
  return (
    <div className="p-4 min-h-screen pb-20">
      {items.map((item) => (
        <div key={item.id} className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl text-yellow-400">{item.title}</h2>
              <div className="text-gray-400">
                {item.number_of_seasons} Seasons • {item.mediaType === 'tv' ? 'TV Show' : 'Movie'}
              </div>
            </div>
            <button
              onClick={() => onRemove(item.id)}
              className="px-3 py-1 bg-red-600/80 hover:bg-red-700 text-white rounded-md"
            >
              Remove
            </button>
          </div>

          {item.mediaType === 'tv' && (
            <ShowDetails
              item={item}
              onUpdateSeasons={onUpdateSeasons}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default WatchedItemList;