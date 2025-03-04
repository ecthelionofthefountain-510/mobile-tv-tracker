import React, { useState } from "react";
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
  
  // States for modal
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemDetails, setItemDetails] = useState(null);

  // Search for content
  const searchContent = async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setResults([]);
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
          try {
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
          } catch (error) {
            console.error("Error fetching TV details:", error);
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

  // Add item to watched list
  const addToWatched = async (item, e) => {
    e.stopPropagation();
    
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

  // Toggle favorite status
  const toggleFavorite = (item, e) => {
    e.stopPropagation();
    
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

  // View item details
  const viewDetails = (item) => {
    console.log("View details clicked for:", item);
    
    // Set the selected item and loading state
    setSelectedItem(item);
    setIsLoading(true);
    
    // Fetch item details
    const endpoint = item.mediaType === 'tv' ? 'tv' : 'movie';
    
    fetch(`${TMDB_BASE_URL}/${endpoint}/${item.id}?api_key=${API_KEY}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log("Received data:", data);
        setItemDetails(data);
        setIsLoading(false);
      })
      .catch(error => {
        console.error("Error fetching item details:", error);
        alert(`Failed to load details: ${error.message}`);
        setIsLoading(false);
        setSelectedItem(null);
      });
  };

  // Close the detail modal
  const closeModal = () => {
    setSelectedItem(null);
    setItemDetails(null);
  };

  return (
    <div className="p-4 min-h-screen pb-20">
      {/* Search Controls */}
      <div className="space-y-2 sticky top-0 z-10 bg-transparent pt-1 pb-3">
        <div className="flex items-center space-x-2">
          <div className="relative flex-grow">
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
              className="w-full p-2 pl-8 border border-yellow-500 rounded-md bg-gray-800 text-white placeholder-gray-400"
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
              🔍
            </div>
            {query && (
              <button 
                onClick={() => {
                  setQuery("");
                  setResults([]);
                }}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
              >
                ✖️
              </button>
            )}
          </div>
          <button
            onClick={searchContent}
            disabled={isSearching}
            className={`p-2 bg-yellow-500 text-gray-900 font-bold rounded-lg hover:bg-yellow-600 transition-all ${
              isSearching ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSearching ? 'Searching...' : 'SEARCH'}
          </button>
        </div>
        
        {/* Content Type Filters */}
        <div className="flex space-x-2">
          <button
            onClick={() => setSearchType("all")}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              searchType === "all" 
                ? "bg-yellow-600 text-gray-900" 
                : "bg-gray-800 text-yellow-500"
            }`}
          >
            ALL
          </button>
          <button
            onClick={() => setSearchType("movies")}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              searchType === "movies" 
                ? "bg-yellow-600 text-gray-900" 
                : "bg-gray-800 text-yellow-500"
            }`}
          >
            MOVIES
          </button>
          <button
            onClick={() => setSearchType("tv")}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              searchType === "tv" 
                ? "bg-yellow-600 text-gray-900" 
                : "bg-gray-800 text-yellow-500"
            }`}
          >
            TV SHOWS
          </button>
        </div>
        
        {query && results.length > 0 && (
          <div className="mt-2 text-sm text-gray-400">
            FOUND {results.length} {results.length === 1 ? "RESULT" : "RESULTS"}
          </div>
        )}
      </div>

      {/* Search Results */}
      {isSearching ? (
        <div className="text-center py-12">
          <div className="text-yellow-400 text-lg">Searching...</div>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((item) => {
            const isWatched = watched.some((watchedItem) => watchedItem.id === item.id);
            const isFavorited = favorites.some(fav => fav.id === item.id);

            return (
              <div 
                key={item.id} 
                className="mb-4 relative bg-gray-900 rounded-lg overflow-hidden border border-gray-700 cursor-pointer"
                onClick={() => viewDetails(item)}
              >
                <div className="flex">
                  {/* Poster positioned to match your screenshot - same size as screenshot */}
                  <div className="w-16 sm:w-20 flex-shrink-0 p-2">
                    {item.poster_path ? (
                      <img 
                        src={`${IMAGE_BASE_URL}${item.poster_path}`} 
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-600">
                        No Image
                      </div>
                    )}
                  </div>
                  
                  {/* Content section with exact spacing and text styles to match screenshot */}
                  <div className="flex-1 pl-2 pr-2 py-1.5 flex flex-col">
                    <h3 className="text-base sm:text-lg font-bold text-yellow-500">
                      {item.title?.toUpperCase()}
                    </h3>
                    
                    <div className="text-gray-400 text-xs mt-0.5">
                      <div>
                        {item.mediaType === 'tv' ? 'TV SHOW' : 'MOVIE'}
                        {item.mediaType === 'tv' && item.number_of_seasons && (
                          <span> • {item.number_of_seasons} {item.number_of_seasons === 1 ? 'SEASON' : 'SEASONS'}</span>
                        )}
                      </div>
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
                    
                    {/* Buttons with exact sizes and styling from screenshot */}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <button
                        onClick={(e) => toggleFavorite(item, e)}
                        className={`py-1 rounded font-medium text-xs text-center ${
                          isFavorited 
                            ? "bg-yellow-600 text-white" 
                            : "bg-gray-800 text-yellow-500 border border-yellow-600/40"
                        }`}
                      >
                        <span className="flex justify-center items-center">
                          <span className="mr-1">{isFavorited ? "★" : "☆"}</span>
                          <span>{isFavorited ? "FAVORITED" : "FAVORITE"}</span>
                        </span>
                      </button>
                      
                      <button
                        onClick={(e) => addToWatched(item, e)}
                        className={`py-1 rounded font-medium text-xs text-center ${
                          isWatched
                            ? "bg-green-700 text-white" 
                            : "bg-green-800 text-green-400"
                        }`}
                      >
                        <span className="flex justify-center items-center">
                          <span className="mr-1">{isWatched ? "✓" : ""}</span>
                          <span>{isWatched ? "WATCHED" : "ADD TO WATCHED"}</span>
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {results.length === 0 && query && !isSearching && (
            <div className="text-center py-10">
              <p className="text-gray-400">No results found for "{query}"</p>
              <p className="text-yellow-500 mt-2">Try a different search term</p>
            </div>
          )}
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <div className="text-yellow-400 text-lg mb-3">Loading details...</div>
            <button 
              onClick={closeModal}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Detail Modal */}
      {selectedItem && !isLoading && itemDetails && (
        selectedItem.mediaType === 'tv' ? (
          <ShowDetailModal 
            show={itemDetails} 
            onClose={closeModal}
          />
        ) : (
          <MovieDetailModal 
            movie={itemDetails} 
            onClose={closeModal}
          />
        )
      )}
    </div>
  );
};

export default SearchPage;