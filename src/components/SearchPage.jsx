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
  const [trendingItems, setTrendingItems] = useState([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);

  const [selectedItem, setSelectedItem] = useState(null);
  const [itemDetails, setItemDetails] = useState(null);

  useEffect(() => {
    const fetchTrending = async () => {
      setIsLoadingTrending(true);
      try {
        const movieResponse = await fetch(`${TMDB_BASE_URL}/trending/movie/week?api_key=${API_KEY}&language=en-US&page=1`);
        const movieData = await movieResponse.json();

        const tvResponse = await fetch(`${TMDB_BASE_URL}/trending/tv/week?api_key=${API_KEY}&language=en-US&page=1`);
        const tvData = await tvResponse.json();

        const formattedTvData = tvData.results.map(item => ({
          ...item,
          title: item.name,
          mediaType: 'tv'
        }));

        const formattedMovieData = movieData.results.map(item => ({
          ...item,
          mediaType: 'movie'
        }));

        const combined = [...formattedMovieData, ...formattedTvData]
          .sort(() => 0.5 - Math.random())
          .slice(0, 5);

        setTrendingItems(combined);
      } catch (error) {
        console.error("Error fetching trending items:", error);
      } finally {
        setIsLoadingTrending(false);
      }
    };

    fetchTrending();
  }, []);

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

  const viewDetails = (item) => {
    setSelectedItem(item);
    setIsLoading(true);
    const endpoint = item.mediaType === 'tv' ? 'tv' : 'movie';

    fetch(`${TMDB_BASE_URL}/${endpoint}/${item.id}?api_key=${API_KEY}`)
      .then(res => res.json())
      .then(data => {
        setItemDetails(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  };

  const closeModal = () => {
    setSelectedItem(null);
    setItemDetails(null);
  };

  const renderContentItem = (item) => {
    const isWatched = watched.some((w) => w.id === item.id);
    const isFavorited = favorites.some((f) => f.id === item.id);

    return (
      <div key={item.id} onClick={() => viewDetails(item)} className="mb-4 relative bg-gray-900 rounded-lg overflow-hidden border border-gray-700 cursor-pointer">
        <div className="flex">
          <div className="w-16 sm:w-20 flex-shrink-0 p-1">
            {item.poster_path ? (
              <img src={`${IMAGE_BASE_URL}${item.poster_path}`} alt={item.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-600">No Image</div>
            )}
          </div>
          <div className="flex-1 pl-2 pr-2 py-1.5 flex flex-col">
            <h3 className="text-base sm:text-lg font-bold text-yellow-500">{item.title?.toUpperCase()}</h3>
            <div className="text-gray-400 text-xs mt-0.5">
              <div>
                {item.mediaType === 'tv' ? 'TV SHOW' : 'MOVIE'}
                {item.mediaType === 'tv' && item.number_of_seasons && ` • ${item.number_of_seasons} SEASON${item.number_of_seasons > 1 ? 'S' : ''}`}
              </div>
              {item.release_date && <div>RELEASED: {new Date(item.release_date).getFullYear()}</div>}
              {item.first_air_date && <div>FIRST AIRED: {new Date(item.first_air_date).getFullYear()}</div>}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button onClick={(e) => toggleFavorite(item, e)} className={`py-1 rounded text-xs ${isFavorited ? "bg-yellow-600 text-white" : "bg-gray-800 text-yellow-500 border border-yellow-600/40"}`}>
                <span className="flex justify-center items-center">{isFavorited ? "★ FAVORITED" : "☆ FAVORITE"}</span>
              </button>
              <button onClick={(e) => addToWatched(item, e)} className={`py-1 rounded text-xs ${isWatched ? "bg-green-700 text-white" : "bg-green-800 text-green-400"}`}>
                <span className="flex justify-center items-center">{isWatched ? "✓ WATCHED" : "ADD TO WATCHED"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 min-h-screen pb-20">
      <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-md shadow-lg rounded-lg border border-gray-800 mb-4">
        <div className="p-1 space-y-3">
          <div className="flex items-center space-x-2">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Search for movies or TV shows..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full p-2 pl-8 border border-yellow-500 rounded-md bg-gray-800 text-white placeholder-gray-400"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">🔍</div>
            </div>
            <button onClick={searchContent} className="p-2 bg-yellow-500 text-gray-900 font-bold rounded-lg hover:bg-yellow-600 transition-all">
              GO!
            </button>
          </div>
        </div>
      </div>

      {isSearching ? (
        <div className="text-center py-12 text-yellow-400">Searching...</div>
      ) : results.length > 0 ? (
        <div className="space-y-4">{results.map(renderContentItem)}</div>
      ) : (
        <div className="text-center py-10 text-gray-400">Start typing to search for content.</div>
      )}

      {!query && trendingItems.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-yellow-400 mb-2">🔥 Trending Now</h2>
          <div className="flex flex-col space-y-4">
            {trendingItems.map(item => (
              <div
                key={item.id}
                className="flex items-center bg-gray-900 rounded-lg shadow-md border border-gray-700 cursor-pointer hover:bg-gray-800 transition"
                onClick={() => viewDetails(item)}
              >
                <img
                  src={item.poster_path ? `${IMAGE_BASE_URL}${item.poster_path}` : ""}
                  alt={item.title}
                  className="w-16 h-24 object-cover rounded-l-lg"
                />
                <div className="flex-1 p-3">
                  <div className="text-base font-semibold text-yellow-400 truncate">{item.title}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {item.mediaType === "tv" ? "TV Show" : "Movie"}
                    {item.release_date && <> • {new Date(item.release_date).getFullYear()}</>}
                    {item.first_air_date && <> • {new Date(item.first_air_date).getFullYear()}</>}
                  </div>
                </div>
              </div>
            ))}
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
        <div className="text-center py-10 text-gray-400 flex flex-col items-center">
          <span className="text-5xl mb-2">🤔</span>
          <span>No results found for <span className="text-yellow-400">{query}</span></span>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
