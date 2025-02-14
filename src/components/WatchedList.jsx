import React, { useState, useEffect } from "react";
import { API_KEY, TMDB_BASE_URL, IMAGE_BASE_URL } from "../config";

const WatchedList = () => {
  const [watchedContent, setWatchedContent] = useState([]);
  const [expandedShow, setExpandedShow] = useState(null);
  const [expandedSeason, setExpandedSeason] = useState(null);
  const [seasonDetails, setSeasonDetails] = useState({});

  useEffect(() => {
    const storedWatched = JSON.parse(localStorage.getItem("watched")) || [];
    setWatchedContent(storedWatched);
  }, []);

  const fetchSeasonDetails = async (showId, seasonNumber) => {
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/tv/${showId}/season/${seasonNumber}?api_key=${API_KEY}`
      );
      const data = await response.json();
      setSeasonDetails(prev => ({
        ...prev,
        [`${showId}_${seasonNumber}`]: data.episodes
      }));
    } catch (error) {
      console.error("Error fetching season details:", error);
    }
  };

  const toggleShowExpansion = async (show) => {
    if (expandedShow === show.id) {
      setExpandedShow(null);
      setExpandedSeason(null);
    } else {
      setExpandedShow(show.id);
      // Hämta säsongsdetaljer för första säsongen
      if (show.mediaType === 'tv' && !seasonDetails[`${show.id}_1`]) {
        await fetchSeasonDetails(show.id, 1);
      }
    }
  };

  const toggleSeasonExpansion = async (showId, seasonNumber) => {
    const key = `${showId}_${seasonNumber}`;
    if (expandedSeason === key) {
      setExpandedSeason(null);
    } else {
      setExpandedSeason(key);
      if (!seasonDetails[key]) {
        await fetchSeasonDetails(showId, seasonNumber);
      }
    }
  };

  const updateEpisodeProgress = (showId, seasonNumber, episodeNumber, watched) => {
    const updatedContent = watchedContent.map(item => {
      if (item.id === showId) {
        const seasons = item.seasons || {};
        const season = seasons[seasonNumber] || { watchedEpisodes: [] };
        
        let watchedEpisodes = new Set(season.watchedEpisodes || []);
        if (watched) {
          watchedEpisodes.add(episodeNumber);
        } else {
          watchedEpisodes.delete(episodeNumber);
        }
        
        return {
          ...item,
          seasons: {
            ...seasons,
            [seasonNumber]: {
              ...season,
              watchedEpisodes: Array.from(watchedEpisodes)
            }
          }
        };
      }
      return item;
    });
    
    setWatchedContent(updatedContent);
    localStorage.setItem("watched", JSON.stringify(updatedContent));
  };

  const isEpisodeWatched = (show, seasonNumber, episodeNumber) => {
    return show.seasons?.[seasonNumber]?.watchedEpisodes?.includes(episodeNumber) || false;
  };

  const getSeasonProgress = (show, seasonNumber) => {
    const watchedEpisodes = show.seasons?.[seasonNumber]?.watchedEpisodes || [];
    return watchedEpisodes.length;
  };

  const removeFromWatched = (id) => {
    const updatedList = watchedContent.filter((item) => item.id !== id);
    setWatchedContent(updatedList);
    localStorage.setItem("watched", JSON.stringify(updatedList));
  };

  return (
    <div className="p-4 min-h-screen pb-20">
      <h2 className="text-2xl font-bold text-yellow-400 mb-6 text-center tracking-wider">
        Watched List
      </h2>
      <div className="grid grid-cols-1 gap-4">
        {watchedContent.map((item) => (
         <div key={item.id} className="relative bg-gray-800 bg-opacity-90 rounded-lg p-4 shadow-xl border border-yellow-900/30">
         <div className="flex items-start space-x-4">
           <div className="relative w-24 h-36 flex-shrink-0">
             <img
               src={`${IMAGE_BASE_URL}${item.poster_path}`}
               alt={item.title}
               className="w-full h-full object-cover rounded-md shadow-lg border-2 border-yellow-600/30"
             />
           </div>
           
           <div className="flex-grow">
             <h3 className="text-lg font-semibold text-yellow-400 mb-2">
               {item.title}
             </h3>
             {item.mediaType === 'tv' && (
               <button
                 onClick={() => toggleShowExpansion(item)}
                 className="text-sm text-yellow-400 hover:text-yellow-300 mb-2"
               >
                 {expandedShow === item.id ? 'Hide Seasons' : 'Show Seasons'}
               </button>
             )}
         
       
         <button
           onClick={() => removeFromWatched(item.id)}
           className="absolute bottom-4 right-4 px-3 py-1 bg-red-600/80 hover:bg-red-700 text-white rounded-md"
         >
           Remove
         </button>
              </div>
            </div>

            {/* Säsongsöversikt för TV-serier */}
            {item.mediaType === 'tv' && expandedShow === item.id && (
              <div className="mt-4 space-y-2">
                {[...Array(item.number_of_seasons || 0)].map((_, idx) => {
                  const seasonNumber = idx + 1;
                  const key = `${item.id}_${seasonNumber}`;
                  const episodes = seasonDetails[key] || [];
                  const progress = getSeasonProgress(item, seasonNumber);

                  return (
                    <div key={seasonNumber} className="bg-gray-700/50 p-2 rounded">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => toggleSeasonExpansion(item.id, seasonNumber)}
                          className="text-yellow-400 hover:text-yellow-300"
                        >
                          Season {seasonNumber}
                        </button>
                        <span className="text-sm text-gray-300">
                          {progress}/{episodes.length || '?'} episodes
                        </span>
                      </div>

                      {/* Avsnittsöversikt */}
                      {expandedSeason === key && episodes.map(episode => (
                        <div 
                          key={episode.id}
                          className="mt-2 pl-4 flex items-center justify-between bg-gray-600/30 p-2 rounded"
                        >
                          <span className="text-sm text-gray-200">
                            {episode.episode_number}. {episode.name}
                          </span>
                          <button
                            onClick={() => updateEpisodeProgress(
                              item.id,
                              seasonNumber,
                              episode.episode_number,
                              !isEpisodeWatched(item, seasonNumber, episode.episode_number)
                            )}
                            className={`w-6 h-6 rounded-full flex items-center justify-center ${
                              isEpisodeWatched(item, seasonNumber, episode.episode_number)
                                ? 'bg-green-500'
                                : 'bg-gray-600'
                            }`}
                          >
                            {isEpisodeWatched(item, seasonNumber, episode.episode_number) && (
                              <span className="text-white text-sm">✓</span>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        
        {watchedContent.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-400">No watched content yet.</p>
            <p className="text-yellow-500 mt-2">Start watching!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WatchedList;