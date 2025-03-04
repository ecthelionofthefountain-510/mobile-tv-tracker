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
  
  // States for modal
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemDetails, setItemDetails] = useState(null);

  // Fetch trending content on component mount
  useEffect(() => {
    const fetchTrending = async () => {
      setIsLoadingTrending(true);
      try {
        // Fetch both trending movies and TV shows
        const movieResponse = await fetch(
          `${TMDB_BASE_URL}/trending/movie/week?api_key=${API_KEY}&language=en-US&page=1`
        );
        const movieData = await movieResponse.json();
        
        const tvResponse = await fetch(
          `${TMDB_BASE_URL}/trending/tv/week?api_key=${API_KEY}&language=en-US&page=1`
        );
        const tvData = await tvResponse.json();
        
        // Process TV shows data to match our format
        const formattedTvData = tvData.results.map(item => ({
          ...item,
          title: item.name,
          mediaType: 'tv'
        }));
        
        // Process movie data
        const formattedMovieData = movieData.results.map(item => ({
          ...item,
          mediaType: 'movie'
        }));
        
        // Combine and shuffle trending items and take top 5
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

  // Rest of your existing functions
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

  // Render a content item (used for both search results and trending)
  const renderContentItem = (item) => {
    const isWatched = watched.some((watchedItem) => watchedItem.id === item.id);
    const isFavorited = favorites.some(fav => fav.id === item.id);

    return (
      <div 
        key={item.id} 
        className="mb-4 relative bg-gray-900 rounded-lg overflow-hidden border border-gray-700 cursor-pointer"
        onClick={() => viewDetails(item)}
      >
        <div className="flex">
          {/* Poster */}
          <div className="w-16 sm:w-20 flex-shrink-0 p-1">
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
          
          {/* Content section */}
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
            
            {/* Buttons */}
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

      {/* Search Results or Welcome Content */}
      {isSearching ? (
        <div className="text-center py-12">
          <div className="text-yellow-400 text-lg">Searching...</div>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-4">
          {results.map(renderContentItem)}
        </div>
      ) : (
        <div className="mt-4">
          {/* Welcome content when no search has been performed */}
          <div className="relative mb-6 px-4 py-6 bg-gray-800/80 rounded-lg border border-yellow-700/30 shadow-lg">
            <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-xl text-yellow-400 font-cinzel mb-3">Discover Your Next Adventure</h2>
            <p className="text-gray-300 mb-4">Search for movies and TV shows to add to your collection. Track your progress and keep your favorites in one place.</p>
            <div className="text-sm text-yellow-500">Use the search bar above to begin your journey.</div>
          </div>
          
          {/* Trending content */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <div className="h-0.5 flex-grow bg-yellow-700/50 mr-3"></div>
              <h2 className="text-lg text-yellow-400 font-cinzel">TRENDING THIS WEEK</h2>
              <div className="h-0.5 flex-grow bg-yellow-700/50 ml-3"></div>
            </div>
            
            {isLoadingTrending ? (
              <div className="text-center py-8">
                <div className="inline-block w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-2 text-yellow-500">Loading trending content...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {trendingItems.map(renderContentItem)}
              </div>
            )}
          </div>
          
          {/* Quick Tips */}
          <div className="p-4 bg-gray-800/60 rounded-lg border border-yellow-700/20">
            <h3 className="text-yellow-400 font-medium mb-2">QUICK TIPS:</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li className="flex items-start">
                <span className="text-yellow-500 mr-2">•</span>
                <span>Add shows and movies to your <b className="text-yellow-400">WATCHED</b> list to track progress</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-500 mr-2">•</span>
                <span>Mark your favorite content with the <b className="text-yellow-400">FAVORITES</b> button</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-500 mr-2">•</span>
                <span>Track TV show episodes and seasons in the <b className="text-yellow-400">SHOWS</b> tab</span>
              </li>
            </ul>
          </div>
        </div>
      )}
      
      {results.length === 0 && query && !isSearching && (
        <div className="text-center py-10">
          <p className="text-gray-400">No results found for "{query}"</p>
          <p className="text-yellow-500 mt-2">Try a different search term</p>
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