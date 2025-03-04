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
    <div className="p-4">
      {/* Search Controls */}
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
            disabled={isSearching}
            className={`p-2 bg-yellow-500 text-gray-900 font-bold rounded-md hover:bg-yellow-600 transition duration-300 ${
              isSearching ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>
        
        {/* Content Type Filters */}
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

      {/* Search Results */}
      {isSearching ? (
        <div className="text-center py-12">
          <div className="text-yellow-400 text-lg">Searching...</div>
        </div>
      ) : (
        <ul className="mt-4 space-y-4">
          {results.map((item) => {
            const isWatched = watched.some((watchedItem) => watchedItem.id === item.id);
            const isFavorited = favorites.some(fav => fav.id === item.id);

            return (
              <li 
                key={item.id} 
                className="mb-2 flex items-center space-x-4 bg-gray-800 p-3 rounded-lg cursor-pointer hover:bg-gray-700"
                onClick={() => viewDetails(item)}
              >
                {item.poster_path && (
                  <img 
                    src={`${IMAGE_BASE_URL}${item.poster_path}`} 
                    alt={item.title} 
                    className="w-16 h-auto rounded-md hover:opacity-80 transition-opacity"
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
                    onClick={(e) => toggleFavorite(item, e)}
                    className={`p-1 text-white rounded ${
                      isFavorited ? "bg-yellow-600" : "bg-gray-600"
                    }`}
                  >
                    {isFavorited ? "★" : "☆"}
                  </button>
                  <button
                    onClick={(e) => addToWatched(item, e)}
                    className={`p-1 text-white rounded ${isWatched ? "bg-green-700" : "bg-green-600"}`}
                  >
                    {isWatched ? "Watched" : "Add to Watched"}
                  </button>
                </div>
              </li>
            );
          })}
          
          {results.length === 0 && query && !isSearching && (
            <div className="text-center py-10">
              <p className="text-gray-400">No results found for "{query}"</p>
              <p className="text-yellow-500 mt-2">Try a different search term</p>
            </div>
          )}
        </ul>
      )}

      {/* Loading Indicator */}
      {isLoading && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <div className="text-yellow-400 text-lg mb-3">Loading details...</div>
            <button 
              onClick={closeModal}
              className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
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