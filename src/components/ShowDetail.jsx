import React, { useState, useEffect, useCallback, useRef } from "react";
import { API_KEY, TMDB_BASE_URL, IMAGE_BASE_URL } from "../config";
import NotificationModal from "./NotificationModal";
import CongratsToast from "./CongratsToast";
import { loadWatchedAll, saveWatchedAll } from "../utils/watchedStorage";
import { cachedFetchJson } from "../utils/tmdbCache";

const ShowDetail = ({ show, onBack, onRemove }) => {
  const [seasons, setSeasons] = useState(() => {
    if (show?.seasons && !Array.isArray(show.seasons)) return show.seasons;
    return {};
  });
  const [expandedSeason, setExpandedSeason] = useState(null);
  const [episodesData, setEpisodesData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [notification, setNotification] = useState({
    show: false,
    message: "",
  });
  const [stats, setStats] = useState({ total: 0, watched: 0 });
  const [hasChanges, setHasChanges] = useState(false);
  const [sortBy, setSortBy] = useState("title"); // "title" eller "dateAdded"
  const [searchTerm, setSearchTerm] = useState("");
  const [watchedMovies, setWatchedMovies] = useState([]);
  const [filteredMovies, setFilteredMovies] = useState([]);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [showCongrats, setShowCongrats] = useState(false);
  const prevCompletionRef = useRef(false);

  const sameEntry = (a, b) =>
    String(a?.id) === String(b?.id) &&
    (a?.mediaType || (a?.first_air_date ? "tv" : "movie")) ===
      (b?.mediaType || (b?.first_air_date ? "tv" : "movie"));

  // Calculate progress stats on load and when seasons change
  useEffect(() => {
    calculateStats();
  }, [seasons, episodesData]);

  // Save changes to localStorage whenever seasons data changes
  useEffect(() => {
    if (hasChanges) {
      void saveChangesToStorage();
    }
  }, [seasons, hasChanges]);

  // Load progress from localStorage on mount
  useEffect(() => {
    (async () => {
      const allWatched = await loadWatchedAll();
      const found = allWatched.find((item) =>
        sameEntry(item, { id: show.id, mediaType: "tv" }),
      );
      if (found && found.seasons && !Array.isArray(found.seasons)) {
        setSeasons(found.seasons);
      }
    })();
  }, [show.id]);

  const computeCompletion = useCallback(
    (nextSeasons) => {
      const watchedCount = Object.values(nextSeasons || {}).reduce(
        (sum, season) => sum + (season?.watchedEpisodes?.length || 0),
        0,
      );

      const totalFromEpisodesData = Object.keys(episodesData).reduce(
        (sum, seasonNum) => sum + ((episodesData[seasonNum] || []).length || 0),
        0,
      );

      const totalEpisodes =
        typeof show?.number_of_episodes === "number" &&
        show.number_of_episodes > 0
          ? show.number_of_episodes
          : totalFromEpisodesData;

      return totalEpisodes > 0 && watchedCount === totalEpisodes;
    },
    [episodesData, show?.number_of_episodes],
  );

  // Fire celebration exactly when we transition to 100% watched (after user changes)
  useEffect(() => {
    const isCompletedNow = computeCompletion(seasons);

    if (hasChanges && isCompletedNow && !prevCompletionRef.current) {
      setShowCongrats(true);
    }

    prevCompletionRef.current = isCompletedNow;
  }, [computeCompletion, hasChanges, seasons]);

  // Function to save changes to storage (robust: upsert + id-typ-säker)
  const saveChangesToStorage = useCallback(async () => {
    const allWatched = await loadWatchedAll();
    const isCompleted = computeCompletion(seasons);

    const idx = allWatched.findIndex((item) =>
      sameEntry(item, { id: show.id, mediaType: "tv" }),
    );
    let updatedAll;

    if (idx >= 0) {
      updatedAll = allWatched.map((item) =>
        sameEntry(item, { id: show.id, mediaType: "tv" })
          ? {
              ...item,
              mediaType: "tv",
              seasons,
              completed: isCompleted,
            }
          : item,
      );
    } else {
      const toAdd = {
        id: show.id,
        mediaType: "tv",
        title: show.title || show.name || "",
        name: show.name,
        poster_path: show.poster_path ?? null,
        posterPath: show.poster_path ?? null,
        number_of_seasons: show.number_of_seasons,
        number_of_episodes: show.number_of_episodes,
        seasons,
        completed: isCompleted,
        dateAdded: new Date().toISOString(),
      };
      updatedAll = [...allWatched, toAdd];
    }

    await saveWatchedAll(updatedAll);
    setHasChanges(false);
  }, [
    computeCompletion,
    sameEntry,
    seasons,
    show.id,
    show.name,
    show.number_of_episodes,
    show.number_of_seasons,
    show.poster_path,
    show.title,
  ]);

  // Modified onBack handler to ensure changes are saved
  const handleBack = async () => {
    if (hasChanges) {
      await saveChangesToStorage();
    }

    // Trigger the onBack callback to navigate back
    onBack();
  };

  // Calculate watched vs total episodes
  const calculateStats = () => {
    let totalEpisodes = 0;
    let watchedCount = 0;

    Object.keys(episodesData).forEach((seasonNum) => {
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
      message,
    });
  };

  // Close notification handler
  const closeNotification = () => {
    setNotification({
      show: false,
      message: "",
    });
  };

  // Fetch season episodes data
  const fetchSeasonEpisodes = async (seasonNumber) => {
    try {
      const data = await cachedFetchJson(
        `${TMDB_BASE_URL}/tv/${show.id}/season/${seasonNumber}?api_key=${API_KEY}`,
        { ttlMs: 24 * 60 * 60 * 1000 },
      );

      setEpisodesData((prev) => ({
        ...prev,
        [seasonNumber]: data.episodes,
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

    // Default: episode order (ascending)
    return [...episodes].sort((a, b) => a.episode_number - b.episode_number);
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

    updateSeasonsInState(seasonNumber, Array.from(updatedEpisodes));
  };

  // Toggle all episodes in a season (without notification)
  const toggleAllEpisodesInSeason = (seasonNumber, episodes) => {
    if (!episodes || episodes.length === 0) return;

    const currentSeason = seasons[seasonNumber] || { watchedEpisodes: [] };
    const allEpisodes = episodes.map((ep) => ep.episode_number);
    const isAllWatched = allEpisodes.every((epNum) =>
      currentSeason.watchedEpisodes?.includes(epNum),
    );

    updateSeasonsInState(seasonNumber, isAllWatched ? [] : allEpisodes);
  };

  // Toggle episodes with filter
  const toggleFilteredEpisodes = async (
    seasonNumber,
    episodes,
    watched,
    filter,
  ) => {
    const currentSeason = seasons[seasonNumber] || { watchedEpisodes: [] };
    let updatedWatchedEpisodes = new Set(currentSeason.watchedEpisodes || []);

    // Filter episodes based on criteria
    let targetEpisodes = [];
    switch (filter) {
      case "all":
        targetEpisodes = episodes.map((ep) => ep.episode_number);
        break;
      case "first-half":
        const midpoint = Math.ceil(episodes.length / 2);
        targetEpisodes = episodes
          .slice(0, midpoint)
          .map((ep) => ep.episode_number);
        break;
      case "second-half":
        const mid = Math.ceil(episodes.length / 2);
        targetEpisodes = episodes.slice(mid).map((ep) => ep.episode_number);
        break;
      case "unseen":
        targetEpisodes = episodes
          .filter((ep) => !updatedWatchedEpisodes.has(ep.episode_number))
          .map((ep) => ep.episode_number);
        break;
      case "seen":
        targetEpisodes = episodes
          .filter((ep) => updatedWatchedEpisodes.has(ep.episode_number))
          .map((ep) => ep.episode_number);
        break;
      default:
        targetEpisodes = episodes.map((ep) => ep.episode_number);
    }

    // Update the watched status
    if (watched) {
      targetEpisodes.forEach((epNum) => updatedWatchedEpisodes.add(epNum));
    } else {
      targetEpisodes.forEach((epNum) => updatedWatchedEpisodes.delete(epNum));
    }

    updateSeasonsInState(seasonNumber, Array.from(updatedWatchedEpisodes));
  };

  // Update all seasons at once with specific status (without notification)
  const markAllSeasonsAs = async (watched) => {
    try {
      setIsLoading(true);
      setLoadingText(
        `Marking all episodes as ${watched ? "watched" : "unwatched"}...`,
      );

      const updatedSeasons = {};

      // Process each season
      for (let i = 1; i <= show.number_of_seasons; i++) {
        // Make sure we have the episodes data. OBS: episodesData state kan vara stale
        // direkt efter setEpisodesData i fetchSeasonEpisodes, så använd returvärdet.
        let episodes = episodesData[i];
        if (!episodes) {
          const seasonData = await fetchSeasonEpisodes(i);
          episodes = seasonData?.episodes || [];
        }

        if (watched) {
          // Mark all as watched
          updatedSeasons[i] = {
            watchedEpisodes: episodes.map((ep) => ep.episode_number),
          };
        } else {
          // Mark all as unwatched
          updatedSeasons[i] = {
            watchedEpisodes: [],
          };
        }
      }

      // Update state
      setSeasons(updatedSeasons);
      setHasChanges(true);
      setIsLoading(false);
    } catch (error) {
      console.error("Error marking all seasons:", error);
      setIsLoading(false);
    }
  };

  // Helper to update seasons in state (and mark that changes exist)
  const updateSeasonsInState = (seasonNumber, watchedEpisodes) => {
    // Update local state
    const updatedSeasons = {
      ...seasons,
      [seasonNumber]: {
        ...seasons[seasonNumber],
        watchedEpisodes,
      },
    };

    setSeasons(updatedSeasons);
    setHasChanges(true); // <-- Viktigt!
  };

  // Sort movies function
  const sortMovies = (movies, sortBy) => {
    if (sortBy === "title") {
      return [...movies].sort((a, b) =>
        a.title.toLowerCase().localeCompare(b.title.toLowerCase()),
      );
    } else if (sortBy === "dateAdded") {
      return [...movies].sort(
        (a, b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0),
      );
    }
    return movies;
  };

  // When loading movies
  useEffect(() => {
    (async () => {
      const allWatched = await loadWatchedAll();
      const movies = allWatched.filter((item) => item.mediaType === "movie");
      setWatchedMovies(sortMovies(movies, sortBy));
      setFilteredMovies(sortMovies(movies, sortBy));
    })();
  }, [sortBy]);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    let filtered = watchedMovies;
    if (value.trim() !== "") {
      filtered = watchedMovies.filter((movie) =>
        movie.title.toLowerCase().includes(value.toLowerCase()),
      );
    }
    setFilteredMovies(sortMovies(filtered, sortBy));
  };

  return (
    <div className="app-page">
      <div className="app-container">
        {/* Header with progress bar */}
        <div className="sticky top-0 z-20 mb-4 app-panel">
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={handleBack}
                className="app-button-ghost px-3 py-2 text-xs"
              >
                <span className="mr-1">←</span> Back
              </button>
              <h2 className="text-xl font-semibold text-gray-100 truncate max-w-[50%]">
                {show.title || show.name}
              </h2>
              <button
                type="button"
                onClick={() => onRemove(show.id)}
                className="app-button-danger px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              >
                Remove
              </button>
            </div>

            {/* Overall progress bar */}
            <div className="mb-4">
              <div className="flex justify-between mb-1 text-sm">
                <span className="text-gray-400">Episodes</span>
                <span className="text-gray-100">
                  {stats.watched}/{stats.total} (
                  {stats.total > 0
                    ? Math.round((stats.watched / stats.total) * 100)
                    : 0}
                  %)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-white/10">
                <div
                  className="h-2.5 rounded-full bg-yellow-400"
                  style={{
                    width: `${
                      stats.total > 0 ? (stats.watched / stats.total) * 100 : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Global actions - optimized for small screens */}
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => markAllSeasonsAs(true)}
                  className="app-button-success px-4 py-2 overflow-hidden text-xs whitespace-nowrap"
                >
                  <span className="sm:hidden">WATCH ALL</span>
                  <span className="hidden sm:inline">MARK ALL WATCHED</span>
                </button>
                <button
                  type="button"
                  onClick={() => markAllSeasonsAs(false)}
                  className="app-button-ghost px-4 py-2 overflow-hidden text-xs whitespace-nowrap"
                >
                  <span className="sm:hidden">UNWATCH ALL</span>
                  <span className="hidden sm:inline">MARK ALL UNWATCHED</span>
                </button>
              </div>
            </div>
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
            const progressPercent =
              totalEpisodes > 0 ? (watchedCount / totalEpisodes) * 100 : 0;

            return (
              <div key={seasonNumber} className="app-card">
                {/* Season header */}
                <div
                  onClick={() => toggleSeason(seasonNumber)}
                  className="p-3 transition-colors cursor-pointer hover:bg-white/5"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <span className="mr-2 font-medium text-gray-100">
                        Season {seasonNumber}
                      </span>
                      <span className="text-sm text-gray-400">
                        {watchedCount}/{totalEpisodes} Episodes
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAllEpisodesInSeason(seasonNumber, episodes);
                        }}
                        className={
                          watchedCount === totalEpisodes && totalEpisodes > 0
                            ? "app-button-success px-3 py-1.5 text-xs"
                            : "app-button-ghost px-3 py-1.5 text-xs"
                        }
                      >
                        {watchedCount === totalEpisodes && totalEpisodes > 0
                          ? "Watched"
                          : "Mark All"}
                      </button>
                      <span
                        className={`text-gray-300 transition-transform duration-200 transform ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      >
                        ▶
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full bg-white/10">
                    <div
                      className="h-1.5 rounded-full bg-yellow-400 transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>

                {/* Episodes list - only show when expanded */}
                {isExpanded && (
                  <div className="p-3">
                    {/* Simplified batch operations - optimized for mobile with separated controls */}
                    <div className="flex justify-between mb-3">
                      <button
                        type="button"
                        onClick={() =>
                          toggleFilteredEpisodes(
                            seasonNumber,
                            episodes,
                            true,
                            "unseen",
                          )
                        }
                        className="app-button-success px-3 py-2 text-xs"
                      >
                        Mark Unseen
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          toggleFilteredEpisodes(
                            seasonNumber,
                            episodes,
                            false,
                            "seen",
                          )
                        }
                        className="app-button-ghost px-3 py-2 text-xs"
                      >
                        Unmark Seen
                      </button>
                    </div>

                    {/* Episodes grid for larger screens, list for mobile */}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {sortedEpisodes.map((episode) => {
                        const isWatched = season.watchedEpisodes?.includes(
                          episode.episode_number,
                        );
                        const airDate = episode.air_date
                          ? new Date(episode.air_date)
                          : null;

                        return (
                          <div
                            key={episode.id}
                            className={`app-card app-card-hover flex items-center justify-between p-3 cursor-pointer ${
                              isWatched
                                ? "ring-1 ring-inset ring-emerald-500/20 bg-emerald-500/5"
                                : ""
                            }`}
                            onClick={() => setSelectedEpisode(episode)}
                          >
                            <div className="flex items-center space-x-3">
                              {/* Episode Image (if available) */}
                              {episode.still_path && (
                                <img
                                  src={`${IMAGE_BASE_URL}${episode.still_path}`}
                                  alt={episode.name}
                                  className="object-cover w-12 h-8 border-0 rounded"
                                />
                              )}

                              <div>
                                <div className="text-sm font-semibold text-gray-100">
                                  Episode {episode.episode_number}
                                  {episode.vote_average > 0 && (
                                    <span className="ml-2 text-xs font-normal text-gray-400">
                                      Rating {episode.vote_average.toFixed(1)}
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm font-medium text-gray-300">
                                  {episode.name}
                                </div>
                                {airDate && (
                                  <div className="text-xs text-gray-400">
                                    {airDate.toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation(); // <-- hindra att onClick på raden körs
                                updateEpisodeWatched(
                                  seasonNumber,
                                  episode.episode_number,
                                  !isWatched,
                                );
                              }}
                              className={`flex items-center justify-center w-8 h-8 border rounded-full border-white/10 ${
                                isWatched
                                  ? "bg-green-600/80 hover:bg-green-600"
                                  : "bg-white/10 hover:bg-white/15"
                              }`}
                            >
                              {isWatched && (
                                <span className="text-white">✓</span>
                              )}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
            <div className="app-panel-solid p-6 text-center">
              <div className="mb-3 text-lg text-gray-100">{loadingText}</div>
              <div className="w-12 h-12 mx-auto mb-3 border-4 border-white/15 rounded-full border-t-transparent animate-spin"></div>
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

        {/* Episode Detail Modal */}
        {selectedEpisode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
            <div className="app-panel-solid relative w-full max-w-md p-6">
              <button
                className="app-button-ghost absolute top-3 right-3 flex items-center gap-2 px-4 py-2 text-base"
                onClick={() => setSelectedEpisode(null)}
                aria-label="Stäng avsnittsinfo"
              >
                <span className="text-lg">×</span>
              </button>
              <h3 className="mb-2 text-xl font-bold text-gray-100">
                {selectedEpisode.name}
              </h3>
              <div className="mb-2 text-gray-400">
                Säsong {selectedEpisode.season_number}, Avsnitt{" "}
                {selectedEpisode.episode_number}
              </div>
              {selectedEpisode.still_path && (
                <img
                  src={`${IMAGE_BASE_URL}${selectedEpisode.still_path}`}
                  alt={selectedEpisode.name}
                  className="w-full mb-3 rounded"
                />
              )}
              <div className="mb-2 text-gray-300">
                {selectedEpisode.overview || "Ingen beskrivning tillgänglig."}
              </div>
              {selectedEpisode.vote_average > 0 && (
                <div className="mb-1 text-sm text-gray-300">
                  Rating {selectedEpisode.vote_average.toFixed(1)}
                </div>
              )}
              {selectedEpisode.air_date && (
                <div className="text-xs text-gray-400">
                  Sändes:{" "}
                  {new Date(selectedEpisode.air_date).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Congrats Toast and Confetti - when all episodes are marked as watched */}
        {showCongrats && (
          <CongratsToast onClose={() => setShowCongrats(false)} />
        )}
      </div>
    </div>
  );
};

export default ShowDetail;
