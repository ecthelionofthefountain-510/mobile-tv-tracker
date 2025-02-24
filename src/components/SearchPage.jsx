import React, { useState } from "react";
import { API_KEY, TMDB_BASE_URL, IMAGE_BASE_URL } from "../config";

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [watched, setWatched] = useState(() => JSON.parse(localStorage.getItem("watched")) || []);
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem("favorites")) || []);
  const [searchType, setSearchType] = useState("all");
  const [isLoading, setIsLoading] = useState(false);

  const searchContent = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    let combinedResults = [];
    
    try {
      if (searchType === "all" || searchType === "movies") {
        const movieResponse = await fetch(
          `${TMDB_BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`
        );
        const movieData = await movieResponse.json();
        const movieResults = (movieData.results || []).map(item => ({
          ...item,
          mediaType: 'movie'
        }));
        combinedResults = [...combinedResults, ...movieResults];
      }
      
      if (searchType === "all" || searchType === "tv") {
        const tvResponse = await fetch(
          `${TMDB_BASE_URL}/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(query)}`
        );
        const tvData = await tvResponse.json();
        
        const tvResults = await Promise.all((tvData.results || []).map(async (item) => {
          const detailsResponse = await fetch(
            `${TMDB_BASE_URL}/tv/${item.id}?api_key=${API_KEY}`
          );
          const tvDetails = await detailsResponse.json();
          
          return {
            ...item,
            title: item.name,
            number_of_seasons: tvDetails.number_of_seasons,
            mediaType: 'tv',
            seasons: {}
          };
        }));
        
        combinedResults = [...combinedResults, ...tvResults];
      }
      
      combinedResults.sort((a, b) => b.popularity - a.popularity);
      setResults(combinedResults);
    } catch (error) {
      console.error("Error searching content:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addToWatched = async (item) => {
    if (!watched.find((watchedItem) => watchedItem.id === item.id)) {
      let itemToAdd = { 
        ...item,
        dateAdded: new Date().toISOString()
      };

      if (item.mediaType === 'tv') {
        try {
          if (!item.number_of_seasons) {
            const detailsResponse = await fetch(
              `${TMDB_BASE_URL}/tv/${item.id}?api_key=${API_KEY}`
            );
            const tvDetails = await detailsResponse.json();
            itemToAdd.number_of_seasons = tvDetails.number_of_seasons;
          }
          
          itemToAdd.seasons = {};
          for (let i = 1; i <= itemToAdd.number_of_seasons; i++) {
            itemToAdd.seasons[i] = {
              watchedEpisodes: []
            };
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

  const toggleFavorite = (item) => {
    const isFavorited = favorites.some(fav => fav.id === item.id);
    let updatedFavorites;
    
    if (isFavorited) {
      updatedFavorites = favorites.filter(fav => fav.id !== item.id);
    } else {
      updatedFavorites = [...favorites, item];
    }
    
    setFavorites(updatedFavorites);
    localStorage.setItem("favorites", JSON.stringify(updatedFavorites));
  };

  return (
    <div className="p-4">
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Search for movies or TV shows..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                searchContent();
              }
            }}
            className="w-full p-2 border border-yellow-500 rounded-md bg-gray-800 text-white placeholder-gray-400"
          />
          <button
            onClick={searchContent}
            disabled={isLoading}
            className={`p-2 bg-yellow-500 text-gray-900 font-bold rounded-md hover:bg-yellow-600 transition duration-300 ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setSearchType("all")}
            className={`px-3 py-1 rounded ${
              searchType === "all" ? "bg-yellow-500 text-gray-900" : "bg-gray-700 text-yellow-500"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSearchType("movies")}
            className={`px-3 py-1 rounded ${
              searchType === "movies" ? "bg-yellow-500 text-gray-900" : "bg-gray-700 text-yellow-500"
            }`}
          >
            Movies
          </button>
          <button
            onClick={() => setSearchType("tv")}
            className={`px-3 py-1 rounded ${
              searchType === "tv" ? "bg-yellow-500 text-gray-900" : "bg-gray-700 text-yellow-500"
            }`}
          >
            TV Shows
          </button>
        </div>
      </div>

      <ul className="mt-4 space-y-4">
        {results.map((item) => {
          const isWatched = watched.some((watchedItem) => watchedItem.id === item.id);
          const isFavorited = favorites.some(fav => fav.id === item.id);

          return (
            <li key={item.id} className="mb-2 flex items-center space-x-4 bg-gray-800 p-3 rounded-lg">
              {item.poster_path && (
                <img 
                  src={`${IMAGE_BASE_URL}${item.poster_path}`} 
                  alt={item.title} 
                  className="w-16 h-auto rounded-md"
                />
              )}
              <div className="flex-grow">
                <span className="text-yellow-400">{item.title}</span>
                <span className="text-xs text-gray-400 ml-2">
                  ({item.mediaType === 'tv' ? 'TV Show' : 'Movie'})
                </span>
                {item.mediaType === 'tv' && (
                  <span className="text-xs text-gray-400 block">
                    {item.number_of_seasons} {item.number_of_seasons === 1 ? 'Season' : 'Seasons'}
                  </span>
                )}
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => toggleFavorite(item)}
                  className={`p-1 text-white rounded ${
                    isFavorited ? "bg-yellow-600" : "bg-gray-600"
                  }`}
                >
                  {isFavorited ? "★" : "☆"}
                </button>
                <button
                  onClick={() => addToWatched(item)}
                  className={`p-1 text-white rounded ${isWatched ? "bg-green-700" : "bg-green-600"}`}
                >
                  {isWatched ? "Watched" : "Add to Watched"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default SearchPage;