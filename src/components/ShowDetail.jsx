import React, { useState, useEffect, useCallback } from "react";
import { API_KEY, TMDB_BASE_URL, IMAGE_BASE_URL } from "../config";
import NotificationModal from "./NotificationModal";
import CongratsToast from "./CongratsToast";
import ReactConfetti from "react-confetti";
import { useWindowSize } from "react-use"; // valfritt, för att få rätt storlek
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
  const [sortOption, setSortOption] = useState("episode_asc");
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
  const { width, height } = useWindowSize(); // valfritt

  const sameId = (a, b) => String(a) === String(b);

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
      const found = allWatched.find((item) => sameId(item.id, show.id));
      if (found && found.seasons && !Array.isArray(found.seasons)) {
        setSeasons(found.seasons);
      }
    })();
  }, [show.id]);

  const computeCompletion = useCallback(
    (nextSeasons) => {
      const watchedCount = Object.values(nextSeasons || {}).reduce(
        (sum, season) => sum + (season?.watchedEpisodes?.length || 0),
        0
      );

      const totalFromEpisodesData = Object.keys(episodesData).reduce(
        (sum, seasonNum) => sum + ((episodesData[seasonNum] || []).length || 0),
        0
      );

      const totalEpisodes =
        typeof show?.number_of_episodes === "number" &&
        show.number_of_episodes > 0
          ? show.number_of_episodes
          : totalFromEpisodesData;

      return totalEpisodes > 0 && watchedCount === totalEpisodes;
    },
    [episodesData, show?.number_of_episodes]
  );

  // Function to save changes to storage (robust: upsert + id-typ-säker)
  const saveChangesToStorage = useCallback(async () => {
    const allWatched = await loadWatchedAll();
    const isCompleted = computeCompletion(seasons);

    const idx = allWatched.findIndex((item) => sameId(item.id, show.id));
    let updatedAll;

    if (idx >= 0) {
      updatedAll = allWatched.map((item) =>
        sameId(item.id, show.id)
          ? {
              ...item,
              mediaType: "tv",
              seasons,
              completed: isCompleted,
            }
          : item
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
    sameId,
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
        { ttlMs: 24 * 60 * 60 * 1000 }
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

    const sortedEpisodes = [...episodes];

    switch (sortOption) {
      case "episode_asc":
        return sortedEpisodes.sort(
          (a, b) => a.episode_number - b.episode_number
        );
      case "episode_desc":
        return sortedEpisodes.sort(
          (a, b) => b.episode_number - a.episode_number
        );
      case "name_asc":
        return sortedEpisodes.sort((a, b) => a.name.localeCompare(b.name));
      case "name_desc":
        return sortedEpisodes.sort((a, b) => b.name.localeCompare(a.name));
      case "rating_asc":
        return sortedEpisodes.sort((a, b) => a.vote_average - b.vote_average);
      case "rating_desc":
        return sortedEpisodes.sort((a, b) => b.vote_average - a.vote_average);
      case "air_date_asc":
        return sortedEpisodes.sort(
          (a, b) => new Date(a.air_date || 0) - new Date(b.air_date || 0)
        );
      case "air_date_desc":
        return sortedEpisodes.sort(
          (a, b) => new Date(b.air_date || 0) - new Date(a.air_date || 0)
        );
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

    updateSeasonsInState(seasonNumber, Array.from(updatedEpisodes));
  };

  // Toggle all episodes in a season (without notification)
  const toggleAllEpisodesInSeason = (seasonNumber, episodes) => {
    if (!episodes || episodes.length === 0) return;

    const currentSeason = seasons[seasonNumber] || { watchedEpisodes: [] };
    const allEpisodes = episodes.map((ep) => ep.episode_number);
    const isAllWatched = allEpisodes.every((epNum) =>
      currentSeason.watchedEpisodes?.includes(epNum)
    );

    updateSeasonsInState(seasonNumber, isAllWatched ? [] : allEpisodes);
  };

  // Toggle episodes with filter
  const toggleFilteredEpisodes = async (
    seasonNumber,
    episodes,
    watched,
    filter
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
        `Marking all episodes as ${watched ? "watched" : "unwatched"}...`
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
      if (watched) {
        setShowCongrats(true);
      }
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
        a.title.toLowerCase().localeCompare(b.title.toLowerCase())
      );
    } else if (sortBy === "dateAdded") {
      return [...movies].sort(
        (a, b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0)
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
        movie.title.toLowerCase().includes(value.toLowerCase())
      );
    }
    setFilteredMovies(sortMovies(filtered, sortBy));
  };

  return (
    <div className="min-h-screen p-4 pb-20 bg-gray-900">
      {/* Header with progress bar */}
      <div className="sticky top-0 z-20 pt-2 pb-4 bg-gray-900">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={handleBack}
            className="flex items-center text-yellow-400 hover:text-yellow-300"
          >
            <span className="mr-1">←</span> Back
          </button>
          <h2 className="text-xl font-semibold text-yellow-400 truncate max-w-[50%]">
            {show.title}
          </h2>
          <button
            onClick={() => onRemove(show.id)}
            className="px-3 py-1 text-sm text-white rounded-md bg-red-600/80 hover:bg-red-700"
          >
            Remove
          </button>
        </div>

        {/* Overall progress bar */}
        <div className="mb-4">
          <div className="flex justify-between mb-1 text-sm">
            <span className="text-gray-300">Episodes</span>
            <span className="text-yellow-400">
              {stats.watched}/{stats.total} (
              {stats.total > 0
                ? Math.round((stats.watched / stats.total) * 100)
                : 0}
              %)
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-yellow-500 h-2.5 rounded-full"
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
              onClick={() => markAllSeasonsAs(true)}
              className="px-2 py-1 overflow-hidden text-xs text-white bg-green-600 rounded-md hover:bg-green-700 whitespace-nowrap"
            >
              MARK ALL WATCHED
            </button>
            <button
              onClick={() => markAllSeasonsAs(false)}
              className="px-2 py-1 overflow-hidden text-xs text-white bg-gray-600 rounded-md hover:bg-gray-700 whitespace-nowrap"
            >
              MARK ALL UNWATCHED
            </button>
          </div>

          {/* Sort options */}
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="px-2 py-1 text-sm text-yellow-400 bg-gray-800 border rounded-md border-yellow-600/30"
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
          const progressPercent =
            totalEpisodes > 0 ? (watchedCount / totalEpisodes) * 100 : 0;

          return (
            <div
              key={seasonNumber}
              className="overflow-hidden border rounded-lg border-yellow-900/20 bg-gray-800"
            >
              {/* Season header */}
              <div
                onClick={() => toggleSeason(seasonNumber)}
                className="p-3 transition-colors cursor-pointer bg-gray-800 hover:bg-gray-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <span className="mr-2 font-medium text-yellow-400">
                      Season {seasonNumber}
                    </span>
                    <span className="text-sm text-gray-400">
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
                          ? "bg-green-600 text-white border-green-700"
                          : "bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600"
                      }`}
                    >
                      {watchedCount === totalEpisodes && totalEpisodes > 0
                        ? "Watched"
                        : "Mark All"}
                    </button>
                    <span className="text-yellow-400 transition-transform duration-300 transform">
                      {isExpanded ? "▼" : "▶"}
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
                <div className="p-3 bg-gray-800">
                  {/* Simplified batch operations - optimized for mobile with separated controls */}
                  <div className="flex justify-between mb-3">
                    <button
                      onClick={() =>
                        toggleFilteredEpisodes(
                          seasonNumber,
                          episodes,
                          true,
                          "unseen"
                        )
                      }
                      className="px-2 py-1 text-xs text-white rounded-md bg-green-700/70 hover:bg-green-700"
                    >
                      Mark Unseen
                    </button>
                    <button
                      onClick={() =>
                        toggleFilteredEpisodes(
                          seasonNumber,
                          episodes,
                          false,
                          "seen"
                        )
                      }
                      className="px-2 py-1 text-xs text-white rounded-md bg-gray-700/70 hover:bg-gray-700"
                    >
                      Unmark Seen
                    </button>
                  </div>

                  {/* Episodes grid for larger screens, list for mobile */}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {sortedEpisodes.map((episode) => {
                      const isWatched = season.watchedEpisodes?.includes(
                        episode.episode_number
                      );
                      const airDate = episode.air_date
                        ? new Date(episode.air_date)
                        : null;

                      return (
                        <div
                          key={episode.id}
                          className={`p-3 rounded-md flex items-center justify-between cursor-pointer ${
                            isWatched
                              ? "bg-green-800/20 border border-green-800/30"
                              : "bg-gray-700/30 border border-gray-700/30"
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
                              <div className="text-sm text-yellow-400">
                                Episode {episode.episode_number}
                                {episode.vote_average > 0 && (
                                  <span className="ml-2 text-gray-400">
                                    ★ {episode.vote_average.toFixed(1)}
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
                            onClick={(e) => {
                              e.stopPropagation(); // <-- hindra att onClick på raden körs
                              updateEpisodeWatched(
                                seasonNumber,
                                episode.episode_number,
                                !isWatched
                              );
                            }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              isWatched
                                ? "bg-green-600 hover:bg-green-700"
                                : "bg-gray-600 hover:bg-gray-700"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
          <div className="p-6 text-center bg-gray-800 rounded-lg">
            <div className="mb-3 text-lg text-yellow-400">{loadingText}</div>
            <div className="w-12 h-12 mx-auto mb-3 border-4 border-yellow-400 rounded-full border-t-transparent animate-spin"></div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="relative w-full max-w-md p-6 bg-gray-900 rounded-lg">
            <button
              className="absolute flex items-center gap-2 px-4 py-2 text-base font-bold text-gray-900 transition bg-yellow-400 rounded-full shadow-lg top-3 right-3 hover:bg-yellow-500"
              onClick={() => setSelectedEpisode(null)}
              aria-label="Stäng avsnittsinfo"
            >
              <span className="text-lg">✖</span>
            </button>
            <h3 className="mb-2 text-xl font-bold text-yellow-400">
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
              <div className="mb-1 text-yellow-300">
                ★ {selectedEpisode.vote_average.toFixed(1)}
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
        <>
          <CongratsToast onClose={() => setShowCongrats(false)} />
          <ReactConfetti
            width={width}
            height={height}
            numberOfPieces={180}
            recycle={false}
          />
        </>
      )}
    </div>
  );
};

export default ShowDetail;
