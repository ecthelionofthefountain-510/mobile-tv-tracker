// SearchPage.jsx
import React, { useState, useEffect } from "react";
import { API_KEY, TMDB_BASE_URL, IMAGE_BASE_URL } from "../config";
import MovieDetailModal from "./MovieDetailModal";
import ShowDetailModal from "./ShowDetailModal";

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [watched, setWatched] = useState(() => JSON.parse(localStorage.getItem("watched")) || []);
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem("favorites")) || []);
  const [searchType, setSearchType] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [trending, setTrending] = useState([]);
  const [isTrendingLoading, setIsTrendingLoading] = useState(false);
  const [popularMovies, setPopularMovies] = useState([]);
  const [popularTV, setPopularTV] = useState([]);
  const [isPopularMoviesLoading, setIsPopularMoviesLoading] = useState(false);
  const [isPopularTVLoading, setIsPopularTVLoading] = useState(false);

  const [selectedItem, setSelectedItem] = useState(null);
  const [itemDetails, setItemDetails] = useState(null);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (query.trim().length > 1) {
        searchContent();
      } else {
        setResults([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [query, searchType]);

  // Hämta populära filmer
  const fetchPopularMovies = async () => {
    setIsPopularMoviesLoading(true);
    try {
      const randomPage = Math.floor(Math.random() * 500) + 1;
      const res = await fetch(`${TMDB_BASE_URL}/movie/popular?api_key=${API_KEY}&page=${randomPage}`);
      const data = await res.json();
      setPopularMovies((data.results || []).slice(0, 8));
    } catch {
      setPopularMovies([]);
    } finally {
      setIsPopularMoviesLoading(false);
    }
  };

  // Hämta populära tv-serier
  const fetchPopularTV = async () => {
    setIsPopularTVLoading(true);
    try {
      const randomPage = Math.floor(Math.random() * 500) + 1;
      const res = await fetch(`${TMDB_BASE_URL}/tv/popular?api_key=${API_KEY}&page=${randomPage}`);
      const data = await res.json();
      setPopularTV((data.results || []).slice(0, 8));
    } catch {
      setPopularTV([]);
    } finally {
      setIsPopularTVLoading(false);
    }
  };

  // Hämta båda när sidan laddas eller blir aktiv
  useEffect(() => {
    const fetchAll = () => {
      fetchPopularMovies();
      fetchPopularTV();
    };
    fetchAll();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchAll();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const fetchRandomPopular = async () => {
    setIsTrendingLoading(true);
    try {
      const type = Math.random() > 0.5 ? "movie" : "tv";
      const randomPage = Math.floor(Math.random() * 500) + 1;
      // Lägg till slumpmässigt år för ännu mer variation
      const randomYear = 1980 + Math.floor(Math.random() * 44); // 1980-2023

      const url = type === "movie"
        ? `${TMDB_BASE_URL}/discover/movie?api_key=${API_KEY}&sort_by=popularity.desc&page=${randomPage}&primary_release_year=${randomYear}`
        : `${TMDB_BASE_URL}/discover/tv?api_key=${API_KEY}&sort_by=popularity.desc&page=${randomPage}&first_air_date_year=${randomYear}`;

      const res = await fetch(url);
      const data = await res.json();
      setTrending(
        (data.results || []).slice(0, 8).map(item => ({
          ...item,
          mediaType: type,
          title: item.title || item.name,
        }))
      );
    } catch (err) {
      setTrending([]);
    } finally {
      setIsTrendingLoading(false);
    }
  };

  const searchContent = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setResults([]);
    let combinedResults = [];

    try {
      if (searchType === "all" || searchType === "movies") {
        const movieResponse = await fetch(`${TMDB_BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
        const movieData = await movieResponse.json();
        const movieResults = (movieData.results || []).map(item => ({
          ...item,
          mediaType: 'movie'
        }));
        combinedResults = [...combinedResults, ...movieResults];
      }

      if (searchType === "all" || searchType === "tv") {
        const tvResponse = await fetch(`${TMDB_BASE_URL}/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
        const tvData = await tvResponse.json();

        const tvResults = await Promise.all((tvData.results || []).map(async (item) => {
          try {
            const detailsResponse = await fetch(`${TMDB_BASE_URL}/tv/${item.id}?api_key=${API_KEY}`);
            const tvDetails = await detailsResponse.json();

            return {
              ...item,
              title: item.name,
              number_of_seasons: tvDetails.number_of_seasons,
              mediaType: 'tv',
              seasons: {}
            };
          } catch {
            return {
              ...item,
              title: item.name,
              mediaType: 'tv',
              seasons: {}
            };
          }
        }));

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
    if (!watched.find((w) => w.id === item.id)) {
      let itemToAdd = { ...item, dateAdded: new Date().toISOString() };

      if (item.mediaType === 'tv') {
        try {
          if (!item.number_of_seasons) {
            const detailsResponse = await fetch(`${TMDB_BASE_URL}/tv/${item.id}?api_key=${API_KEY}`);
            const tvDetails = await detailsResponse.json();
            itemToAdd.number_of_seasons = tvDetails.number_of_seasons;
          }

          itemToAdd.seasons = {};
          for (let i = 1; i <= itemToAdd.number_of_seasons; i++) {
            itemToAdd.seasons[i] = { watchedEpisodes: [] };
          }
        } catch (error) {
          console.error("Error fetching TV show details:", error);
        }
      }

      const updatedList = [...watched, itemToAdd];
      setWatched(updatedList);
      localStorage.setItem("watched", JSON.stringify(updatedList));
    }
  };

  const toggleFavorite = (item, e) => {
    e.stopPropagation();
    const isFavorited = favorites.some(fav => fav.id === item.id);
    const updatedFavorites = isFavorited
      ? favorites.filter(fav => fav.id !== item.id)
      : [...favorites, item];
    setFavorites(updatedFavorites);
    localStorage.setItem("favorites", JSON.stringify(updatedFavorites));
  };

  const viewDetails = async (item) => {
    setSelectedItem(item);
    setIsLoading(true);
    const endpoint = item.mediaType === 'tv' ? 'tv' : 'movie';

    try {
      const [details, credits, videos] = await Promise.all([
        fetch(`${TMDB_BASE_URL}/${endpoint}/${item.id}?api_key=${API_KEY}`).then(res => res.json()),
        fetch(`${TMDB_BASE_URL}/${endpoint}/${item.id}/credits?api_key=${API_KEY}`).then(res => res.json()),
        fetch(`${TMDB_BASE_URL}/${endpoint}/${item.id}/videos?api_key=${API_KEY}`).then(res => res.json()),
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
      <div key={item.id} onClick={() => viewDetails(item)} className="relative mb-4 overflow-hidden bg-gray-900 border border-gray-700 rounded-lg cursor-pointer">
        <div className="flex">
          <div className="flex-shrink-0 w-16 p-1 sm:w-20">
            {item.poster_path ? (
              <img src={`${IMAGE_BASE_URL}${item.poster_path}`} alt={item.title} className="object-cover w-full h-full" />
            ) : (
              <div className="flex items-center justify-center w-full h-full text-gray-600 bg-gray-800">No Image</div>
            )}
          </div>
          <div className="flex-1 pl-2 pr-2 py-1.5 flex flex-col">
            <h3 className="text-base font-bold text-yellow-500 sm:text-lg">{item.title?.toUpperCase()}</h3>
            <div className="text-gray-400 text-xs mt-0.5">
              <div>
                {item.mediaType === 'tv' ? 'TV SHOW' : 'MOVIE'}
                {item.mediaType === 'tv' && item.number_of_seasons && ` • ${item.number_of_seasons} SEASON${item.number_of_seasons > 1 ? 'S' : ''}`}
              </div>
              {item.release_date && <div>RELEASED: {new Date(item.release_date).getFullYear()}</div>}
              {item.first_air_date && <div>FIRST AIRED: {new Date(item.first_air_date).getFullYear()}</div>}
            </div>
            <div className="flex gap-2 mt-2">
              <button
                className={`px-3 py-1 text-xs font-semibold rounded transition
                  ${isWatched
                    ? "bg-green-600 text-white cursor-default"
                    : "bg-yellow-500 text-gray-900 hover:bg-yellow-600"}
                `}
                onClick={e => {
                  if (!isWatched) addToWatched(item, e);
                  e.stopPropagation();
                }}
                disabled={isWatched}
              >
                {isWatched ? "Added" : "Add to Watched"}
              </button>
              <button
                className={`px-3 py-1 text-xs font-semibold rounded transition
                  ${isFavorited
                    ? "bg-yellow-400 text-gray-900 cursor-default"
                    : "bg-gray-700 text-yellow-400 hover:bg-yellow-600 hover:text-gray-900"}
                `}
                onClick={e => {
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
                placeholder="Search for movies or TV shows..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full p-2 pl-8 text-white placeholder-gray-400 bg-gray-800 border border-yellow-500 rounded-md"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">🔍</div>
            </div>
            <button onClick={searchContent} className="p-2 font-bold text-gray-900 transition-all bg-yellow-500 rounded-lg hover:bg-yellow-600">
              GO!
            </button>
          </div>
        </div>
      </div>

      {isSearching ? (
        <div className="py-12 text-center text-yellow-400">Searching...</div>
      ) : results.length > 0 ? (
        <div className="space-y-4">{results.map(renderContentItem)}</div>
      ) : (
        <div className="py-10 text-center text-gray-400">Start typing to search for content.</div>
      )}

      {!query && (
        <div className="space-y-8">
          {/* Populära filmer */}
          <div>
            <h2 className="mb-2 text-lg font-bold text-yellow-400">Populära filmer</h2>
            {isPopularMoviesLoading ? (
              <div className="py-4 text-yellow-400">Laddar...</div>
            ) : (
              <div className="space-y-4">
                {popularMovies.map(item =>
                  renderContentItem({
                    ...item,
                    mediaType: "movie",
                    title: item.title || item.name,
                  })
                )}
              </div>
            )}
          </div>
          {/* Populära tv-serier */}
          <div>
            <h2 className="mb-2 text-lg font-bold text-yellow-400">Populära TV-serier</h2>
            {isPopularTVLoading ? (
              <div className="py-4 text-yellow-400">Laddar...</div>
            ) : (
              <div className="space-y-4">
                {popularTV.map(item =>
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

      {selectedItem && !isLoading && itemDetails && (
        selectedItem.mediaType === 'tv' ? (
          <ShowDetailModal show={itemDetails} onClose={closeModal} />
        ) : (
          <MovieDetailModal movie={itemDetails} onClose={closeModal} />
        )
      )}

      {!isSearching && results.length === 0 && query && (
        <div className="flex flex-col items-center py-10 text-center text-gray-400">
          <span className="mb-2 text-5xl">🤔</span>
          <span>No results found for <span className="text-yellow-400">{query}</span></span>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
