// SearchPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { API_KEY, TMDB_BASE_URL, IMAGE_BASE_URL } from "../config";
import MovieDetailModal from "./MovieDetailModal";
import ShowDetailModal from "./ShowDetailModal";

import { createWatchedShow, createWatchedMovie } from "../utils/watchedMapper";
import { loadWatchedAll, saveWatchedAll } from "../utils/watchedStorage";

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

  const [watched, setWatched] = useState([]);
  const [favorites, setFavorites] = useState(
    () => JSON.parse(localStorage.getItem("favorites")) || []
  );

  const [searchType, setSearchType] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [popularMovies, setPopularMovies] = useState([]);
  const [popularTV, setPopularTV] = useState([]);
  const [isPopularMoviesLoading, setIsPopularMoviesLoading] = useState(false);
  const [isPopularTVLoading, setIsPopularTVLoading] = useState(false);

  const [selectedItem, setSelectedItem] = useState(null);
  const [itemDetails, setItemDetails] = useState(null);

  const lastPopularFetchRef = useRef(0);

  // Ladda watched från gemensam storage när sidan laddas
  useEffect(() => {
    (async () => {
      const allWatched = await loadWatchedAll();
      setWatched(allWatched);
    })();
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
    } finally {
      setIsPopularMoviesLoading(false);
    }
  };

  // Hämta populära tv-serier (discover + språkfilter)
  const fetchPopularTV = async () => {
    setIsPopularTVLoading(true);
    try {
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

        const tvResults = await Promise.all(
          (tvData.results || []).map(async (item) => {
            try {
              const detailsResponse = await fetch(
                `${TMDB_BASE_URL}/tv/${item.id}?api_key=${API_KEY}`
              );
              const tvDetails = await detailsResponse.json();

              return {
                ...item,
                title: item.name,
                number_of_seasons: tvDetails.number_of_seasons,
                mediaType: "tv",
                seasons: {},
              };
            } catch {
              return {
                ...item,
                title: item.name,
                mediaType: "tv",
                seasons: {},
              };
            }
          })
        );

        combinedResults = [...combinedResults, ...tvResults];
      }

      combinedResults.sort((a, b) => b.popularity - a.popularity);
      setResults(combinedResults);
    } catch (error) {
      console.error("Error searching content:", error);
      alert(`Search error: ${error.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const addToWatched = async (item, e) => {
    e.stopPropagation();

    const allWatched = await loadWatchedAll();
    const alreadyExists = allWatched.some((w) => w.id === item.id);
    if (alreadyExists) return;

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

        if (!numberOfSeasons) {
          const detailsResponse = await fetch(
            `${TMDB_BASE_URL}/tv/${item.id}?api_key=${API_KEY}`
          );
          const tvDetails = await detailsResponse.json();
          finalSeasons = {};
          for (let i = 1; i <= tvDetails.number_of_seasons; i++) {
            finalSeasons[i] = { watchedEpisodes: [] };
          }
          base.number_of_seasons = tvDetails.number_of_seasons;
        } else {
          finalSeasons = {};
          for (let i = 1; i <= numberOfSeasons; i++) {
            finalSeasons[i] = { watchedEpisodes: [] };
          }
          base.number_of_seasons = numberOfSeasons;
        }

        base.seasons = finalSeasons;
      } catch (error) {
        console.error("Error fetching TV show details:", error);
      }
    }

    const updatedAll = [...allWatched, base];
    await saveWatchedAll(updatedAll);
    setWatched(updatedAll);
  };

  const toggleFavorite = (item, e) => {
    e.stopPropagation();
    const isFavorited = favorites.some((fav) => fav.id === item.id);
    const updatedFavorites = isFavorited
      ? favorites.filter((fav) => fav.id !== item.id)
      : [...favorites, item];
    setFavorites(updatedFavorites);
    localStorage.setItem("favorites", JSON.stringify(updatedFavorites));
  };

  const viewDetails = async (item) => {
    setSelectedItem(item);
    setIsLoading(true);
    const endpoint = item.mediaType === "tv" ? "tv" : "movie";

    try {
      const [details, credits, videos] = await Promise.all([
        fetch(
          `${TMDB_BASE_URL}/${endpoint}/${item.id}?api_key=${API_KEY}`
        ).then((res) => res.json()),
        fetch(
          `${TMDB_BASE_URL}/${endpoint}/${item.id}/credits?api_key=${API_KEY}`
        ).then((res) => res.json()),
        fetch(
          `${TMDB_BASE_URL}/${endpoint}/${item.id}/videos?api_key=${API_KEY}`
        ).then((res) => res.json()),
      ]);
      setItemDetails({ ...details, credits, videos });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedItem(null);
    setItemDetails(null);
  };

  const renderContentItem = (item) => {
    const isWatched = watched.some((w) => w.id === item.id);
    const isFavorited = favorites.some((f) => f.id === item.id);

    return (
      <div
        key={item.id}
        onClick={() => viewDetails(item)}
        className="relative mb-4 overflow-hidden bg-gray-900 border border-gray-700 rounded-lg cursor-pointer"
      >
        <div className="flex">
          <div className="flex-shrink-0 w-16 p-1 sm:w-20">
            {item.poster_path ? (
              <img
                src={`${IMAGE_BASE_URL}${item.poster_path}`}
                alt={item.title}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full text-gray-600 bg-gray-800">
                No Image
              </div>
            )}
          </div>
          <div className="flex-1 pl-2 pr-2 py-1.5 flex flex-col">
            <h3 className="text-base font-bold text-yellow-500 sm:text-lg">
              {item.title?.toUpperCase()}
            </h3>
            <div className="text-gray-400 text-xs mt-0.5">
              <div className="text-gray-300 text-xs mt-0.5 space-x-1">
                {item.vote_average && (
                  <span>⭐ {item.vote_average.toFixed(1)}</span>
                )}

                {item.genre_ids && item.genre_ids.length > 0 && (
                  <span>
                    •{" "}
                    {item.genre_ids
                      .slice(0, 2) // max två genres
                      .map((id) => genreMap[id])
                      .join(", ")}
                  </span>
                )}

                {item.mediaType === "tv" && item.number_of_seasons && (
                  <span>• {item.number_of_seasons} seasons</span>
                )}
              </div>
              {item.release_date && (
                <div>RELEASED: {new Date(item.release_date).getFullYear()}</div>
              )}
              {item.first_air_date && (
                <div>
                  FIRST AIRED: {new Date(item.first_air_date).getFullYear()}
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-2">
              <button
                className={`px-3 py-1 text-xs font-semibold rounded transition
                  ${
                    isWatched
                      ? "bg-green-600 text-white cursor-default"
                      : "bg-yellow-500 text-gray-900 hover:bg-yellow-600"
                  }
                `}
                onClick={(e) => {
                  if (!isWatched) addToWatched(item, e);
                  e.stopPropagation();
                }}
                disabled={isWatched}
              >
                {isWatched ? "Added" : "Add to Watched"}
              </button>
              <button
                className={`px-3 py-1 text-xs font-semibold rounded transition
                  ${
                    isFavorited
                      ? "bg-yellow-400 text-gray-900 cursor-default"
                      : "bg-gray-700 text-yellow-400 hover:bg-yellow-600 hover:text-gray-900"
                  }
                `}
                onClick={(e) => {
                  if (!isFavorited) toggleFavorite(item, e);
                  e.stopPropagation();
                }}
                disabled={isFavorited}
              >
                {isFavorited ? "Favorited" : "Favorite"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-4 pb-20">
      <div className="sticky top-0 z-10 mb-4 border border-gray-800 rounded-lg shadow-lg bg-gray-900/95 backdrop-blur-md">
        <div className="p-1 space-y-3">
          <div className="flex items-center space-x-2">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Search for movies or shows"
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
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-lg text-gray-300 hover:text-white"
                >
                  ✖
                </button>
              )}
            </div>

            <button
              onClick={searchContent}
              className="p-2 font-bold text-gray-900 transition-all bg-yellow-500 rounded-lg hover:bg-yellow-600"
            >
              GO!
            </button>
          </div>

          <div className="flex justify-center gap-2 text-xs sm:text-sm">
            <button
              type="button"
              onClick={() => setSearchType("all")}
              className={`px-3 py-1 rounded-full border ${
                searchType === "all"
                  ? "bg-yellow-500 text-gray-900 border-yellow-400"
                  : "bg-gray-800 text-gray-300 border-gray-700"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setSearchType("movies")}
              className={`px-3 py-1 rounded-full border ${
                searchType === "movies"
                  ? "bg-yellow-500 text-gray-900 border-yellow-400"
                  : "bg-gray-800 text-gray-300 border-gray-700"
              }`}
            >
              Movies
            </button>
            <button
              type="button"
              onClick={() => setSearchType("tv")}
              className={`px-3 py-1 rounded-full border ${
                searchType === "tv"
                  ? "bg-yellow-500 text-gray-900 border-yellow-400"
                  : "bg-gray-800 text-gray-300 border-gray-700"
              }`}
            >
              Shows
            </button>
          </div>
        </div>
      </div>

      {isSearching ? (
        <div className="py-12 text-center text-yellow-400">Searching...</div>
      ) : results.length > 0 ? (
        <div className="space-y-4">{results.map(renderContentItem)}</div>
      ) : (
        <div className="py-10 text-center text-gray-400">
          Start typing to search for content.
        </div>
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
          <ShowDetailModal show={itemDetails} onClose={closeModal} />
        ) : (
          <MovieDetailModal movie={itemDetails} onClose={closeModal} />
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
