import React, { useState, useEffect } from "react";
import { API_KEY, TMDB_BASE_URL, IMAGE_BASE_URL } from "../config";
import NotificationModal from "./NotificationModal";

const ShowDetail = ({ show, onBack, onRemove }) => {
  const [seasons, setSeasons] = useState(show.seasons || {});
  const [expandedSeason, setExpandedSeason] = useState(null);
  const [episodesData, setEpisodesData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [sortOption, setSortOption] = useState("episode_asc");
  const [notification, setNotification] = useState({ show: false, message: "" });
  const [stats, setStats] = useState({ total: 0, watched: 0 });

  // Calculate progress stats on load and when seasons change
  useEffect(() => {
    calculateStats();
  }, [seasons, episodesData]);

  // Calculate watched vs total episodes
  const calculateStats = () => {
    let totalEpisodes = 0;
    let watchedCount = 0;
    
    Object.keys(episodesData).forEach(seasonNum => {
      const episodesList = episodesData[seasonNum] || [];
      totalEpisodes += episodesList.length;
      
      const watchedEpisodes = seasons[seasonNum]?.watchedEpisodes || [];
      watchedCount += watchedEpisodes.length;
    });
    
    setStats({ total: totalEpisodes, watched: watchedCount });
  };

  // Fetch all seasons data on initial load
  useEffect(() => {
    const fetchAllSeasons = async () => {
      try {
        setIsLoading(true);
        setLoadingText("Loading all seasons...");
        
        const promises = [];
        for (let i = 1; i <= show.number_of_seasons; i++) {
          promises.push(fetchSeasonEpisodes(i));
        }
        
        await Promise.all(promises);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching all seasons:", error);
        setIsLoading(false);
        showNotification("Failed to load all seasons. Please try again.");
      }
    };
    
    fetchAllSeasons();
  }, [show.id]);

  // Show notification handler
  const showNotification = (message) => {
    setNotification({
      show: true,
      message
    });
  };

  // Close notification handler
  const closeNotification = () => {
    setNotification({
      show: false,
      message: ""
    });
  };

  // Fetch season episodes data
  const fetchSeasonEpisodes = async (seasonNumber) => {
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/tv/${show.id}/season/${seasonNumber}?api_key=${API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch season ${seasonNumber}`);
      }
      
      const data = await response.json();
      
      setEpisodesData(prev => ({
        ...prev,
        [seasonNumber]: data.episodes
      }));
      
      return data;
    } catch (error) {
      console.error(`Error fetching season ${seasonNumber} episodes:`, error);
      throw error;
    }
  };

  // Toggle season expansion
  const toggleSeason = (seasonNumber) => {
    setExpandedSeason(expandedSeason === seasonNumber ? null : seasonNumber);
  };

  // Get sorted episodes based on current sort option
  const getSortedEpisodes = (episodes) => {
    if (!episodes) return [];
    
    const sortedEpisodes = [...episodes];
    
    switch (sortOption) {
      case "episode_asc":
        return sortedEpisodes.sort((a, b) => a.episode_number - b.episode_number);
      case "episode_desc":
        return sortedEpisodes.sort((a, b) => b.episode_number - a.episode_number);
      case "name_asc":
        return sortedEpisodes.sort((a, b) => a.name.localeCompare(b.name));
      case "name_desc":
        return sortedEpisodes.sort((a, b) => b.name.localeCompare(a.name));
      case "rating_asc":
        return sortedEpisodes.sort((a, b) => a.vote_average - b.vote_average);
      case "rating_desc":
        return sortedEpisodes.sort((a, b) => b.vote_average - a.vote_average);
      case "air_date_asc":
        return sortedEpisodes.sort((a, b) => new Date(a.air_date || 0) - new Date(b.air_date || 0));
      case "air_date_desc":
        return sortedEpisodes.sort((a, b) => new Date(b.air_date || 0) - new Date(a.air_date || 0));
      default:
        return sortedEpisodes;
    }
  };

  // Update single episode watched status
  const updateEpisodeWatched = (seasonNumber, episodeNumber, watched) => {
    const currentSeason = seasons[seasonNumber] || { watchedEpisodes: [] };
    let updatedEpisodes = new Set(currentSeason.watchedEpisodes || []);

    if (watched) {
      updatedEpisodes.add(episodeNumber);
    } else {
      updatedEpisodes.delete(episodeNumber);
    }

    updateSeasonsInStorage(seasonNumber, Array.from(updatedEpisodes));
  };

  // Toggle all episodes in a season (without notification)
  const toggleAllEpisodesInSeason = (seasonNumber, episodes) => {
    if (!episodes || episodes.length === 0) return;

    const currentSeason = seasons[seasonNumber] || { watchedEpisodes: [] };
    const allEpisodes = episodes.map(ep => ep.episode_number);
    const isAllWatched = allEpisodes.every(epNum => 
      currentSeason.watchedEpisodes?.includes(epNum)
    );

    updateSeasonsInStorage(seasonNumber, isAllWatched ? [] : allEpisodes);
  };
  
  // Toggle episodes with filter
  const toggleFilteredEpisodes = async (seasonNumber, episodes, watched, filter) => {
    const currentSeason = seasons[seasonNumber] || { watchedEpisodes: [] };
    let updatedWatchedEpisodes = new Set(currentSeason.watchedEpisodes || []);
    
    // Filter episodes based on criteria
    let targetEpisodes = [];
    switch (filter) {
      case "all":
        targetEpisodes = episodes.map(ep => ep.episode_number);
        break;
      case "first-half":
        const midpoint = Math.ceil(episodes.length / 2);
        targetEpisodes = episodes.slice(0, midpoint).map(ep => ep.episode_number);
        break;
      case "second-half":
        const mid = Math.ceil(episodes.length / 2);
        targetEpisodes = episodes.slice(mid).map(ep => ep.episode_number);
        break;
      case "unseen":
        targetEpisodes = episodes
          .filter(ep => !updatedWatchedEpisodes.has(ep.episode_number))
          .map(ep => ep.episode_number);
        break;
      case "seen":
        targetEpisodes = episodes
          .filter(ep => updatedWatchedEpisodes.has(ep.episode_number))
          .map(ep => ep.episode_number);
        break;
      default:
        targetEpisodes = episodes.map(ep => ep.episode_number);
    }
    
    // Update the watched status
    if (watched) {
      targetEpisodes.forEach(epNum => updatedWatchedEpisodes.add(epNum));
    } else {
      targetEpisodes.forEach(epNum => updatedWatchedEpisodes.delete(epNum));
    }
    
    updateSeasonsInStorage(seasonNumber, Array.from(updatedWatchedEpisodes));
  };

  // Update all seasons at once with specific status (without notification)
  const markAllSeasonsAs = async (watched) => {
    try {
      setIsLoading(true);
      setLoadingText(`Marking all episodes as ${watched ? 'watched' : 'unwatched'}...`);
      
      const updatedSeasons = {};
      
      // Process each season
      for (let i = 1; i <= show.number_of_seasons; i++) {
        // Make sure we have the episodes data
        if (!episodesData[i]) {
          await fetchSeasonEpisodes(i);
        }
        
        const episodes = episodesData[i] || [];
        
        if (watched) {
          // Mark all as watched
          updatedSeasons[i] = {
            watchedEpisodes: episodes.map(ep => ep.episode_number)
          };
        } else {
          // Mark all as unwatched
          updatedSeasons[i] = {
            watchedEpisodes: []
          };
        }
      }
      
      // Update all seasons at once in local storage
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
      
      // Update state
      setSeasons(updatedSeasons);
      setIsLoading(false);
    } catch (error) {
      console.error("Error marking all seasons:", error);
      setIsLoading(false);
    }
  };
  
  // Helper to update seasons in localStorage
  const updateSeasonsInStorage = (seasonNumber, watchedEpisodes) => {
    // Update local state first
    const updatedSeasons = {
      ...seasons,
      [seasonNumber]: {
        ...seasons[seasonNumber],
        watchedEpisodes
      }
    };
    
    setSeasons(updatedSeasons);
    
    // Update localStorage
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
      {/* Header with progress bar */}
      <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm z-20 pb-4 pt-2">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onBack}
            className="text-yellow-400 hover:text-yellow-300 flex items-center"
          >
            <span className="mr-1">←</span> Back
          </button>
          <h2 className="text-xl font-semibold text-yellow-400 truncate max-w-[50%]">
            {show.title}
          </h2>
          <button
            onClick={() => onRemove(show.id)}
            className="px-3 py-1 bg-red-600/80 hover:bg-red-700 text-white text-sm rounded-md"
          >
            Remove
          </button>
        </div>
        
        {/* Overall progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-300">Overall Progress</span>
            <span className="text-yellow-400">
              {stats.watched}/{stats.total} ({stats.total > 0 ? Math.round((stats.watched / stats.total) * 100) : 0}%)
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div 
              className="bg-yellow-500 h-2.5 rounded-full" 
              style={{ width: `${stats.total > 0 ? (stats.watched / stats.total) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
        
        {/* Global actions - optimized for small screens */}
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => markAllSeasonsAs(true)}
              className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md whitespace-nowrap overflow-hidden"
            >
              MARK ALL WATCHED
            </button>
            <button
              onClick={() => markAllSeasonsAs(false)}
              className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-md whitespace-nowrap overflow-hidden"
            >
              MARK ALL UNWATCHED
            </button>
          </div>
          
          {/* Sort options */}
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="bg-gray-800 text-yellow-400 border border-yellow-600/30 rounded-md px-2 py-1 text-sm"
          >
            <option value="episode_asc">Episode ↑</option>
            <option value="episode_desc">Episode ↓</option>
            <option value="name_asc">Name A-Z</option>
            <option value="name_desc">Name Z-A</option>
            <option value="rating_asc">Rating ↑</option>
            <option value="rating_desc">Rating ↓</option>
            <option value="air_date_asc">Air Date ↑</option>
            <option value="air_date_desc">Air Date ↓</option>
          </select>
        </div>
      </div>
      
      {/* Seasons list */}
      <div className="space-y-4">
        {[...Array(show.number_of_seasons)].map((_, idx) => {
          const seasonNumber = idx + 1;
          const season = seasons[seasonNumber] || {};
          const episodes = episodesData[seasonNumber] || [];
          const sortedEpisodes = getSortedEpisodes(episodes);
          const watchedCount = season.watchedEpisodes?.length || 0;
          const totalEpisodes = episodes.length || 0;
          const isExpanded = expandedSeason === seasonNumber;
          const progressPercent = totalEpisodes > 0 ? (watchedCount / totalEpisodes) * 100 : 0;

          return (
            <div key={seasonNumber} className="rounded-lg overflow-hidden border border-yellow-900/20 bg-gray-800/40">
              {/* Season header */}
              <div 
                onClick={() => toggleSeason(seasonNumber)}
                className="bg-gray-800/90 p-3 cursor-pointer hover:bg-gray-700/90 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <span className="text-yellow-400 font-medium mr-2">
                      Season {seasonNumber}
                    </span>
                    <span className="text-gray-400 text-sm">
                      {watchedCount}/{totalEpisodes} Episodes
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAllEpisodesInSeason(seasonNumber, episodes);
                      }}
                      className={`px-2 py-1 text-xs rounded-md border ${
                        watchedCount === totalEpisodes && totalEpisodes > 0
                          ? 'bg-green-600 text-white border-green-700'
                          : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                      }`}
                    >
                      {watchedCount === totalEpisodes && totalEpisodes > 0
                        ? 'Watched'
                        : 'Mark All'}
                    </button>
                    <span className="text-yellow-400 transform transition-transform duration-300">
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div 
                    className="bg-yellow-500 h-1.5 rounded-full transition-all duration-500" 
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>

              {/* Episodes list - only show when expanded */}
              {isExpanded && (
                <div className="bg-gray-800/50 p-3">
                  {/* Simplified batch operations - optimized for mobile with separated controls */}
                  <div className="mb-3 flex justify-between">
                    <button 
                      onClick={() => toggleFilteredEpisodes(seasonNumber, episodes, true, "unseen")}
                      className="px-2 py-1 bg-green-700/70 hover:bg-green-700 text-white text-xs rounded-md"
                    >
                      Mark Unseen
                    </button>
                    <button 
                      onClick={() => toggleFilteredEpisodes(seasonNumber, episodes, false, "seen")}
                      className="px-2 py-1 bg-gray-700/70 hover:bg-gray-700 text-white text-xs rounded-md"
                    >
                      Unmark Seen
                    </button>
                  </div>
                  
                  {/* Episodes grid for larger screens, list for mobile */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {sortedEpisodes.map(episode => {
                      const isWatched = season.watchedEpisodes?.includes(episode.episode_number);
                      const airDate = episode.air_date ? new Date(episode.air_date) : null;
                      
                      return (
                        <div 
                          key={episode.id}
                          className={`p-3 rounded-md flex items-center justify-between ${
                            isWatched 
                              ? 'bg-green-800/20 border border-green-800/30' 
                              : 'bg-gray-700/30 border border-gray-700/30'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            {/* Episode Image (if available) */}
                            {episode.still_path && (
                              <img 
                                src={`${IMAGE_BASE_URL}${episode.still_path}`} 
                                alt={episode.name}
                                className="w-12 h-8 object-cover rounded border-0"
                              />
                            )}
                            
                            <div>
                              <div className="text-sm text-yellow-400">
                                Episode {episode.episode_number}
                                {episode.vote_average > 0 && (
                                  <span className="ml-2 text-gray-400">
                                    ★ {episode.vote_average.toFixed(1)}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-300 font-medium">{episode.name}</div>
                              {airDate && (
                                <div className="text-xs text-gray-400">
                                  {airDate.toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <button
                            onClick={() => updateEpisodeWatched(
                              seasonNumber,
                              episode.episode_number,
                              !isWatched
                            )}
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              isWatched 
                                ? 'bg-green-600 hover:bg-green-700' 
                                : 'bg-gray-600 hover:bg-gray-700'
                            }`}
                          >
                            {isWatched && <span className="text-white">✓</span>}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Loading Indicator */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <div className="text-yellow-400 text-lg mb-3">{loadingText}</div>
            <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          </div>
        </div>
      )}
      
      {/* Notification Modal - only used for errors now */}
      {notification.show && (
        <NotificationModal
          message={notification.message}
          onClose={closeNotification}
          autoCloseTime={2000}
        />
      )}
    </div>
  );
};

export default ShowDetail;