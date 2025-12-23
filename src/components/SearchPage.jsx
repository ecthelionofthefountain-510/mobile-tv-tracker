// SearchPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { API_KEY, TMDB_BASE_URL, IMAGE_BASE_URL } from "../config";
import MovieDetailModal from "./MovieDetailModal";
import ShowDetailModal from "./ShowDetailModal";

import { createWatchedShow, createWatchedMovie } from "../utils/watchedMapper";
import { loadWatchedAll, saveWatchedAll } from "../utils/watchedStorage";
import { cachedFetchJson } from "../utils/tmdbCache";
import {
  loadFavorites,
  saveFavorites,
  favoriteIdentity,
} from "../utils/favoritesStorage";

const genreMap = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

const ALLOWED_LANGS = ["en", "sv", "de", "da"];

const POPULAR_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minuter

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  const [errorMessage, setErrorMessage] = useState("");

  const [watched, setWatched] = useState([]);
  const [favorites, setFavorites] = useState(() => loadFavorites());

  const [searchType, setSearchType] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [popularMovies, setPopularMovies] = useState([]);
  const [popularTV, setPopularTV] = useState([]);
  const [isPopularMoviesLoading, setIsPopularMoviesLoading] = useState(false);
  const [isPopularTVLoading, setIsPopularTVLoading] = useState(false);

  const [selectedItem, setSelectedItem] = useState(null);
  const [itemDetails, setItemDetails] = useState(null);

  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!showToast) return;
    const t = setTimeout(() => setShowToast(false), 2200);
    return () => clearTimeout(t);
  }, [showToast]);

  const notify = (message) => {
    setToastMessage(message);
    setShowToast(true);
  };

  const lastPopularFetchRef = useRef(0);

  // Ladda watched från gemensam storage när sidan laddas
  useEffect(() => {
    (async () => {
      const allWatched = await loadWatchedAll();
      setWatched(allWatched);
    })();
  }, []);

  // Ladda favorites (user-scoped) när sidan mountar
  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

  // Debounce-sök
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (query.trim().length > 1) {
        searchContent();
      } else {
        setResults([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, searchType]);

  // Hämta populära filmer (discover + språkfilter)
  const fetchPopularMovies = async () => {
    setIsPopularMoviesLoading(true);
    try {
      setErrorMessage("");
      const pages = [1, 2, 3]; // top ~60, men filtrerar sen
      const responses = await Promise.all(
        pages.map((page) =>
          fetch(
            `${TMDB_BASE_URL}/discover/movie?` +
              `api_key=${API_KEY}` +
              `&language=en-US` +
              `&sort_by=popularity.desc` +
              `&with_original_language=${ALLOWED_LANGS.join("|")}` +
              `&page=${page}` +
              `&region=SE`
          )
        )
      );

      const allResults = (
        await Promise.all(responses.map((res) => res.json()))
      ).flatMap((data) => data.results || []);

      // extra safeguard if TMDB ändå skickar annat
      const filtered = allResults.filter((item) =>
        ALLOWED_LANGS.includes(item.original_language)
      );

      const shuffled = [...filtered].sort(() => Math.random() - 0.5);
      setPopularMovies(shuffled.slice(0, 8));
    } catch (err) {
      console.error("Error fetching popular movies", err);
      setPopularMovies([]);
      setErrorMessage("Could not load popular movies.");
    } finally {
      setIsPopularMoviesLoading(false);
    }
  };

  // Hämta populära tv-serier (discover + språkfilter)
  const fetchPopularTV = async () => {
    setIsPopularTVLoading(true);
    try {
      setErrorMessage("");
      const pages = [1, 2, 3];
      const responses = await Promise.all(
        pages.map((page) =>
          fetch(
            `${TMDB_BASE_URL}/discover/tv?` +
              `api_key=${API_KEY}` +
              `&language=en-US` +
              `&sort_by=popularity.desc` +
              `&with_original_language=${ALLOWED_LANGS.join("|")}` +
              `&page=${page}`
          )
        )
      );

      const allResults = (
        await Promise.all(responses.map((res) => res.json()))
      ).flatMap((data) => data.results || []);

      const filtered = allResults.filter((item) =>
        ALLOWED_LANGS.includes(item.original_language)
      );

      const shuffled = [...filtered].sort(() => Math.random() - 0.5);
      setPopularTV(shuffled.slice(0, 8));
    } catch (err) {
      console.error("Error fetching popular tv", err);
      setPopularTV([]);
      setErrorMessage("Could not load popular shows.");
    } finally {
      setIsPopularTVLoading(false);
    }
  };

  // Hämta båda när sidan laddas eller blir aktiv (med cooldown)
  useEffect(() => {
    const fetchAll = async () => {
      await Promise.all([fetchPopularMovies(), fetchPopularTV()]);
      lastPopularFetchRef.current = Date.now();
    };

    // direkt vid load
    fetchAll();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        if (now - lastPopularFetchRef.current > POPULAR_REFRESH_INTERVAL) {
          fetchAll();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searchContent = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setResults([]);
    setErrorMessage("");
    let combinedResults = [];

    try {
      if (searchType === "all" || searchType === "movies") {
        const movieResponse = await fetch(
          `${TMDB_BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(
            query
          )}`
        );
        const movieData = await movieResponse.json();
        const movieResults = (movieData.results || []).map((item) => ({
          ...item,
          mediaType: "movie",
        }));
        combinedResults = [...combinedResults, ...movieResults];
      }

      if (searchType === "all" || searchType === "tv") {
        const tvResponse = await fetch(
          `${TMDB_BASE_URL}/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(
            query
          )}`
        );
        const tvData = await tvResponse.json();

        // Undvik N+1: hämta inte tv-detaljer per sökträff.
        // Detaljer hämtas när man öppnar modal eller när "Add to watched" behöver totaldata.
        const tvResults = (tvData.results || []).map((item) => ({
          ...item,
          title: item.name,
          mediaType: "tv",
          seasons: {},
        }));

        combinedResults = [...combinedResults, ...tvResults];
      }

      combinedResults.sort((a, b) => b.popularity - a.popularity);
      setResults(combinedResults);
    } catch (error) {
      console.error("Error searching content:", error);
      notify(`Search error: ${error.message}`);
      setErrorMessage("Could not search right now.");
    } finally {
      setIsSearching(false);
    }
  };

  const toggleWatched = async (item, e) => {
    e?.stopPropagation?.();

    const sameEntry = (a, b) =>
      String(a?.id) === String(b?.id) &&
      (a?.mediaType || (a?.first_air_date ? "tv" : "movie")) ===
        (b?.mediaType || (b?.first_air_date ? "tv" : "movie"));

    const allWatched = await loadWatchedAll();
    const alreadyExists = allWatched.some((w) => sameEntry(w, item));
    if (alreadyExists) {
      const updatedAll = allWatched.filter((w) => !sameEntry(w, item));
      await saveWatchedAll(updatedAll);
      setWatched(updatedAll);
      notify(`"${item.title || item.name}" removed from watched.`);
      return;
    }

    let base;
    if (item.mediaType === "tv") {
      base = createWatchedShow(item);
    } else {
      base = createWatchedMovie(item);
    }

    if (item.mediaType === "tv") {
      try {
        const numberOfSeasons =
          item.number_of_seasons ?? base.number_of_seasons;
        let finalSeasons = base.seasons;

        // För progress i listvyn: säkerställ att vi sparar totalavsnitt om möjligt
        if (
          typeof base.number_of_episodes !== "number" ||
          base.number_of_episodes <= 0
        ) {
          if (
            typeof item.number_of_episodes === "number" &&
            item.number_of_episodes > 0
          ) {
            base.number_of_episodes = item.number_of_episodes;
          }
        }

        const needsDetailsFetch =
          !numberOfSeasons ||
          typeof base.number_of_episodes !== "number" ||
          base.number_of_episodes <= 0;

        let tvDetails = null;
        if (needsDetailsFetch) {
          tvDetails = await cachedFetchJson(
            `${TMDB_BASE_URL}/tv/${item.id}?api_key=${API_KEY}`,
            { ttlMs: 6 * 60 * 60 * 1000 }
          );
        }

        if (!numberOfSeasons) {
          const seasonsCount = tvDetails?.number_of_seasons || 0;
          finalSeasons = {};
          for (let i = 1; i <= seasonsCount; i++) {
            finalSeasons[i] = { watchedEpisodes: [] };
          }
          base.number_of_seasons = seasonsCount;
        } else {
          finalSeasons = {};
          for (let i = 1; i <= numberOfSeasons; i++) {
            finalSeasons[i] = { watchedEpisodes: [] };
          }
          base.number_of_seasons = numberOfSeasons;
        }

        if (
          (typeof base.number_of_episodes !== "number" ||
            base.number_of_episodes <= 0) &&
          typeof tvDetails?.number_of_episodes === "number" &&
          tvDetails.number_of_episodes > 0
        ) {
          base.number_of_episodes = tvDetails.number_of_episodes;
        }

        base.seasons = finalSeasons;
      } catch (error) {
        console.error("Error fetching TV show details:", error);
      }
    }

    const updatedAll = [...allWatched, base];
    await saveWatchedAll(updatedAll);
    setWatched(updatedAll);
    notify(`"${item.title || item.name}" added to watched.`);
  };

  const toggleFavorite = (item, e) => {
    e?.stopPropagation?.();

    const normalizedItem = {
      ...item,
      mediaType: item.mediaType || (item.first_air_date ? "tv" : "movie"),
    };

    const isFavorited = favorites.some(
      (fav) => favoriteIdentity(fav) === favoriteIdentity(normalizedItem)
    );
    const updatedFavorites = isFavorited
      ? favorites.filter(
          (fav) => favoriteIdentity(fav) !== favoriteIdentity(normalizedItem)
        )
      : [...favorites, normalizedItem];

    setFavorites(updatedFavorites);
    saveFavorites(updatedFavorites);
    notify(
      isFavorited
        ? `"${item.title || item.name}" removed from favorites.`
        : `"${item.title || item.name}" added to favorites.`
    );
  };

  const getActionItem = () => {
    if (!selectedItem || !itemDetails) return null;

    const title =
      selectedItem.title || itemDetails.title || itemDetails.name || "";

    return {
      ...selectedItem,
      ...itemDetails,
      mediaType: selectedItem.mediaType,
      title,
      name: itemDetails.name || selectedItem.name,
    };
  };

  const viewDetails = async (item) => {
    setSelectedItem(item);
    setIsLoading(true);
    setErrorMessage("");
    const endpoint = item.mediaType === "tv" ? "tv" : "movie";

    try {
      const [details, credits, videos] = await Promise.all([
        cachedFetchJson(
          `${TMDB_BASE_URL}/${endpoint}/${item.id}?api_key=${API_KEY}`,
          { ttlMs: 6 * 60 * 60 * 1000 }
        ),
        cachedFetchJson(
          `${TMDB_BASE_URL}/${endpoint}/${item.id}/credits?api_key=${API_KEY}`,
          { ttlMs: 24 * 60 * 60 * 1000 }
        ),
        cachedFetchJson(
          `${TMDB_BASE_URL}/${endpoint}/${item.id}/videos?api_key=${API_KEY}`,
          { ttlMs: 24 * 60 * 60 * 1000 }
        ),
      ]);
      setItemDetails({ ...details, credits, videos });
    } catch (err) {
      console.error(err);
      setErrorMessage("Could not load details.");
      notify("Could not load details.");
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedItem(null);
    setItemDetails(null);
    setErrorMessage("");
  };

  const handleResultKeyDown = (e, item) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      viewDetails(item);
    }
  };

  const renderContentItem = (item) => {
    const isWatched = watched.some((w) => w.id === item.id);
    const isFavorited = favorites.some((f) => f.id === item.id);

    return (
      <div
        key={`${item.mediaType}-${item.id}`}
        className="relative mb-4 overflow-hidden transition-colors duration-200 bg-gray-800 border rounded-lg cursor-pointer border-yellow-900/30 hover:bg-gray-700 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
        onClick={() => viewDetails(item)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => handleResultKeyDown(e, item)}
        aria-label={`Open details for ${item.title || item.name}`}
      >
        <div className="flex p-3">
          <div className="flex-shrink-0 w-24 h-36">
            {item.poster_path ? (
              <img
                src={`${IMAGE_BASE_URL}${item.poster_path}`}
                alt={item.title || item.name}
                className="object-cover w-full h-full border-2 rounded-md shadow-lg border-yellow-600/30"
              />
            ) : (
              <div className="w-full h-full bg-gray-800 border-2 rounded-md border-yellow-600/30" />
            )}
          </div>

          <div className="flex-1 min-w-0 ml-4">
            <h3 className="mb-1 text-xl font-bold text-yellow-400 truncate">
              {item.title || item.name}
            </h3>

            <div className="mb-1 text-sm text-yellow-300/70">
              {item.mediaType === "tv" ? "TV SERIES" : "MOVIE"}
            </div>

            <div className="text-gray-300 text-xs mt-0.5 space-x-1">
              {typeof item.vote_average === "number" &&
                item.vote_average > 0 && (
                  <span>⭐ {Number(item.vote_average).toFixed(1)}</span>
                )}

              {Array.isArray(item.genre_ids) && item.genre_ids.length > 0 && (
                <span>
                  •{" "}
                  {item.genre_ids
                    .slice(0, 2)
                    .map((id) => genreMap[id])
                    .filter(Boolean)
                    .join(", ")}
                </span>
              )}

              {item.mediaType === "tv" && item.number_of_seasons && (
                <span>• {item.number_of_seasons} seasons</span>
              )}
            </div>

            {(item.release_date || item.first_air_date) && (
              <div className="text-gray-400 text-xs mt-0.5">
                {item.release_date && (
                  <div>
                    RELEASED: {new Date(item.release_date).getFullYear()}
                  </div>
                )}
                {item.first_air_date && (
                  <div>
                    FIRST AIRED: {new Date(item.first_air_date).getFullYear()}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-2">
              <button
                type="button"
                className={`px-3 py-1 text-xs font-semibold rounded transition
                  ${
                    isWatched
                      ? "bg-green-600 text-white"
                      : "bg-yellow-500 text-gray-900 hover:bg-yellow-600"
                  }
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
                `}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleWatched(item, e);
                }}
                aria-pressed={isWatched}
                aria-label={
                  isWatched ? "Remove from watched" : "Add to watched"
                }
              >
                {isWatched ? "Remove Watched" : "Add to Watched"}
              </button>

              <button
                type="button"
                className={`px-3 py-1 text-xs font-semibold rounded transition
                  ${
                    isFavorited
                      ? "bg-yellow-400 text-gray-900"
                      : "bg-gray-700 text-yellow-400 hover:bg-yellow-600 hover:text-gray-900"
                  }
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
                `}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(item, e);
                }}
                aria-pressed={isFavorited}
                aria-label={
                  isFavorited ? "Remove from favorites" : "Add to favorites"
                }
              >
                {isFavorited ? "Unfavorite" : "Favorite"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-4 pb-20 bg-gray-900">
      {showToast && (
        <div className="fixed z-50 -translate-x-1/2 left-1/2 bottom-24">
          <button
            type="button"
            onClick={() => setShowToast(false)}
            className="px-4 py-2 text-sm text-gray-100 bg-gray-900 border border-gray-700 rounded-lg shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            {toastMessage}
          </button>
        </div>
      )}

      <div className="sticky top-0 z-20 mb-4 bg-gray-900 border border-gray-800 rounded-lg shadow-lg">
        <div className="p-1 space-y-3">
          <div className="flex items-center space-x-2">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Search content ..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full p-2 pl-8 pr-8 text-white placeholder-gray-400 bg-gray-800 border border-yellow-500 rounded-md"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                🔍
              </div>
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setResults([]);
                  }}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-lg text-gray-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                  aria-label="Clear search"
                >
                  ✖
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={searchContent}
              className="p-2 font-bold text-gray-900 transition-all bg-yellow-500 rounded-lg hover:bg-yellow-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              GO!
            </button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-3 text-sm text-red-300">{errorMessage}</div>
      )}

      {query && (
        <>
          {isSearching ? (
            <div className="py-12 text-center text-yellow-400">
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-4">{results.map(renderContentItem)}</div>
          ) : null}
        </>
      )}

      {!query && (
        <div className="space-y-8">
          <div>
            <h2 className="mb-2 text-lg font-bold text-yellow-400">
              Popular movies
            </h2>
            {isPopularMoviesLoading ? (
              <div className="py-4 text-yellow-400">Laddar...</div>
            ) : (
              <div className="space-y-4">
                {popularMovies.map((item) =>
                  renderContentItem({
                    ...item,
                    mediaType: "movie",
                    title: item.title || item.name,
                  })
                )}
              </div>
            )}
          </div>
          <div>
            <h2 className="mb-2 text-lg font-bold text-yellow-400">
              Popular shows
            </h2>
            {isPopularTVLoading ? (
              <div className="py-4 text-yellow-400">Laddar...</div>
            ) : (
              <div className="space-y-4">
                {popularTV.map((item) =>
                  renderContentItem({
                    ...item,
                    mediaType: "tv",
                    title: item.title || item.name,
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedItem &&
        !isLoading &&
        itemDetails &&
        (selectedItem.mediaType === "tv" ? (
          <ShowDetailModal
            show={itemDetails}
            onClose={closeModal}
            showActions
            isWatched={watched.some((w) => w.id === selectedItem.id)}
            isFavorited={favorites.some((f) => f.id === selectedItem.id)}
            onAddToWatched={(show) => {
              const actionItem = getActionItem();
              if (actionItem) toggleWatched({ ...actionItem, ...show });
            }}
            onAddToFavorites={(show) => {
              const actionItem = getActionItem();
              if (actionItem) toggleFavorite({ ...actionItem, ...show });
            }}
          />
        ) : (
          <MovieDetailModal
            movie={itemDetails}
            onClose={closeModal}
            showActions
            isWatched={watched.some((w) => w.id === selectedItem.id)}
            isFavorited={favorites.some((f) => f.id === selectedItem.id)}
            onAddToWatched={(movie) => {
              const actionItem = getActionItem();
              if (actionItem) toggleWatched({ ...actionItem, ...movie });
            }}
            onAddToFavorites={(movie) => {
              const actionItem = getActionItem();
              if (actionItem) toggleFavorite({ ...actionItem, ...movie });
            }}
          />
        ))}

      {!isSearching && results.length === 0 && query && (
        <div className="flex flex-col items-center py-10 text-center text-gray-400">
          <span className="mb-2 text-5xl">🤔</span>
          <span>
            No results found for{" "}
            <span className="text-yellow-400">{query}</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
