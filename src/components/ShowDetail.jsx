// ShowDetail.jsx
import React, { useState, useEffect } from "react";
import { API_KEY, TMDB_BASE_URL } from "../config";

const ShowDetail = ({ show, onBack, onRemove }) => {
  const [seasons, setSeasons] = useState(show.seasons || {});
  const [expandedSeason, setExpandedSeason] = useState(null);
  const [episodesData, setEpisodesData] = useState({});

  useEffect(() => {
    const fetchSeasonEpisodes = async (seasonNumber) => {
      try {
        const response = await fetch(
          `${TMDB_BASE_URL}/tv/${show.id}/season/${seasonNumber}?api_key=${API_KEY}`
        );
        const data = await response.json();
        setEpisodesData(prev => ({
          ...prev,
          [seasonNumber]: data.episodes
        }));
      } catch (error) {
        console.error("Error fetching season episodes:", error);
      }
    };

    if (expandedSeason && !episodesData[expandedSeason]) {
      fetchSeasonEpisodes(expandedSeason);
    }
  }, [expandedSeason, show.id]);

  const toggleSeason = (seasonNumber) => {
    setExpandedSeason(expandedSeason === seasonNumber ? null : seasonNumber);
  };

  const updateSeasonProgress = (seasonNumber, episodeNumber, watched) => {
    const currentSeason = seasons[seasonNumber] || { watchedEpisodes: [] };
    let updatedEpisodes = new Set(currentSeason.watchedEpisodes || []);

    if (watched) {
      updatedEpisodes.add(episodeNumber);
    } else {
      updatedEpisodes.delete(episodeNumber);
    }

    const updatedSeasons = {
      ...seasons,
      [seasonNumber]: {
        ...currentSeason,
        watchedEpisodes: Array.from(updatedEpisodes)
      }
    };

    setSeasons(updatedSeasons);

    // Uppdatera localStorage
    const allWatched = JSON.parse(localStorage.getItem("watched")) || [];
    const updatedWatched = allWatched.map(item => {
      if (item.id === show.id) {
        return {
          ...item,
          seasons: updatedSeasons
        };
      }
      return item;
    });
    localStorage.setItem("watched", JSON.stringify(updatedWatched));
  };

// I ShowDetail.jsx, uppdatera toggleAllEpisodesInSeason funktionen:

const toggleAllEpisodesInSeason = (seasonNumber, episodes) => {
  if (!episodes || episodes.length === 0) return;

  const currentSeason = seasons[seasonNumber] || { watchedEpisodes: [] };
  const allEpisodes = episodes.map(ep => ep.episode_number);
  const isAllWatched = allEpisodes.every(epNum => 
    currentSeason.watchedEpisodes?.includes(epNum)
  );

  // Uppdatera hela säsongen på en gång
  const updatedSeasons = {
    ...seasons,
    [seasonNumber]: {
      ...currentSeason,
      watchedEpisodes: isAllWatched ? [] : allEpisodes
    }
  };

  

  setSeasons(updatedSeasons);

  // Uppdatera localStorage
  const allWatched = JSON.parse(localStorage.getItem("watched")) || [];
  const updatedWatched = allWatched.map(item => {
    if (item.id === show.id) {
      return {
        ...item,
        seasons: updatedSeasons
      };
    }
    return item;
  });
  localStorage.setItem("watched", JSON.stringify(updatedWatched));
};
  
  

  return (
    <div className="p-4 min-h-screen pb-20 bg-gray-900">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={onBack}
          className="text-yellow-400 hover:text-yellow-300"
        >
          ← Back
        </button>
        <h2 className="text-2xl font-semibold text-yellow-400">{show.title}</h2>
      </div>

      {/* Säsonger */}
      <div className="space-y-3">
        {[...Array(show.number_of_seasons)].map((_, idx) => {
          const seasonNumber = idx + 1;
          const season = seasons[seasonNumber] || {};
          const episodes = episodesData[seasonNumber] || [];
          const watchedCount = season.watchedEpisodes?.length || 0;
          const totalEpisodes = episodes.length || 0;
          const isExpanded = expandedSeason === seasonNumber;

          return (
            <div key={seasonNumber} className="rounded-lg overflow-hidden">
              {/* Säsongsrubrik */}
              <div 
                onClick={() => toggleSeason(seasonNumber)}
                className="bg-gray-800/90 p-4 flex items-center justify-between cursor-pointer hover:bg-gray-700/90"
              >
                <div className="flex items-center space-x-4">
                  <span className="text-yellow-400">Season {seasonNumber}</span>
                  <span className="text-gray-400">{watchedCount}/{totalEpisodes}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAllEpisodesInSeason(seasonNumber, episodes);
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      watchedCount === totalEpisodes && totalEpisodes > 0 
                        ? 'bg-green-500' 
                        : 'bg-gray-600'
                    }`}
                  >
                    {watchedCount === totalEpisodes && totalEpisodes > 0 && (
                      <span className="text-white">✓</span>
                    )}
                  </button>
                  <span className="text-yellow-400 transform transition-transform">
                    {isExpanded ? '▼' : '▶'}
                  </span>
                </div>
              </div>

              {/* Avsnittslista */}
              {isExpanded && (
                <div className="bg-gray-800/50">
                  {episodes.map(episode => {
                    const isWatched = season.watchedEpisodes?.includes(episode.episode_number);
                    return (
                      <div 
                        key={episode.id}
                        className="p-4 flex items-center justify-between border-t border-gray-700"
                      >
                        <div>
                          <div className="text-sm text-yellow-400">
                            Episode {episode.episode_number}
                          </div>
                          <div className="text-gray-300">{episode.name}</div>
                        </div>
                        <button
                          onClick={() => updateSeasonProgress(
                            seasonNumber,
                            episode.episode_number,
                            !isWatched
                          )}
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isWatched ? 'bg-green-500' : 'bg-gray-600'
                          }`}
                        >
                          {isWatched && <span className="text-white">✓</span>}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ShowDetail;