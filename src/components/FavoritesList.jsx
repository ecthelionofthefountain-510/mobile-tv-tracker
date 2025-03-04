import React, { useState, useEffect } from "react";
import { IMAGE_BASE_URL, API_KEY, TMDB_BASE_URL } from "../config";
import MovieDetailModal from "./MovieDetailModal";
import ShowDetailModal from "./ShowDetailModal";

const FavoritesList = () => {
  const [favorites, setFavorites] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemDetails, setItemDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [watched, setWatched] = useState([]);
  
  useEffect(() => {
    // Load favorites from localStorage
    const loadFavorites = () => {
      try {
        const storedFavorites = JSON.parse(localStorage.getItem("favorites")) || [];
        console.log("Loaded favorites:", storedFavorites);
        
        // Sort favorites alphabetically by title
        const sortedFavorites = storedFavorites.sort((a, b) => 
          a.title.toLowerCase().localeCompare(b.title.toLowerCase())
        );
        
        setFavorites(sortedFavorites);
      } catch (error) {
        console.error("Error loading favorites:", error);
        setFavorites([]);
      }
    };
    
    // Load watched items list
    const loadWatched = () => {
      try {
        const storedWatched = JSON.parse(localStorage.getItem("watched")) || [];
        setWatched(storedWatched);
      } catch (error) {
        console.error("Error loading watched items:", error);
        setWatched([]);
      }
    };
    
    loadFavorites();
    loadWatched();
  }, []);

  // Function to view details of an item
  const viewDetails = (item) => {
    console.log("View details clicked for:", item);
    
    // Default to movie if mediaType is not specified
    const mediaType = item.mediaType || (item.first_air_date ? 'tv' : 'movie');
    console.log("Determined media type:", mediaType);
    
    setSelectedItem({...item, mediaType});
    setIsLoading(true);
    
    // Fetch item details
    const endpoint = mediaType === 'tv' ? 'tv' : 'movie';
    console.log(`Fetching ${endpoint} details for ID: ${item.id}`);
    
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
      });
  };

  // Close the detail modal
  const closeModal = () => {
    setSelectedItem(null);
    setItemDetails(null);
    setIsLoading(false);
  };

  // Remove an item from favorites
  const removeFromFavorites = (id, e) => {
    // Stop event propagation
    e.stopPropagation();
    
    console.log("Removing item with ID:", id);
    const updatedList = favorites.filter(item => item.id !== id);
    setFavorites(updatedList);
    localStorage.setItem("favorites", JSON.stringify(updatedList));
    
    // Close modal if the removed item is currently selected
    if (selectedItem && selectedItem.id === id) {
      closeModal();
    }
  };

  // Add an item to watched list
  const addToWatched = async (item, e) => {
    // Stop event propagation
    e.stopPropagation();
    
    // Check if already in watched list
    const isAlreadyWatched = watched.some(watchedItem => watchedItem.id === item.id);
    
    if (isAlreadyWatched) {
      alert("This item is already in your watched list.");
      return;
    }
    
    try {
      console.log("Adding to watched:", item);
      
      // Create item to add with proper structure
      let itemToAdd = {
        ...item,
        dateAdded: new Date().toISOString()
      };
      
      // For TV shows, set up seasons structure
      if (item.mediaType === 'tv') {
        // If number_of_seasons is not available, fetch it
        if (!item.number_of_seasons) {
          const response = await fetch(
            `${TMDB_BASE_URL}/tv/${item.id}?api_key=${API_KEY}`
          );
          
          if (!response.ok) {
            throw new Error(`Failed to fetch TV details: ${response.status}`);
          }
          
          const tvDetails = await response.json();
          itemToAdd.number_of_seasons = tvDetails.number_of_seasons;
        }
        
        // Initialize seasons object
        itemToAdd.seasons = {};
        for (let i = 1; i <= itemToAdd.number_of_seasons; i++) {
          itemToAdd.seasons[i] = {
            watchedEpisodes: []
          };
        }
      }
      
      // Update watched list in state and localStorage
      const updatedWatched = [...watched, itemToAdd];
      setWatched(updatedWatched);
      localStorage.setItem("watched", JSON.stringify(updatedWatched));
      
      // Show success message
      alert(`"${item.title}" has been added to your watched list.`);
      
    } catch (error) {
      console.error("Error adding to watched:", error);
      alert(`Failed to add to watched: ${error.message}`);
    }
  };

  // Check if an item is in the watched list
  const isInWatchedList = (id) => {
    return watched.some(item => item.id === id);
  };

  return (
    <div className="p-4 min-h-screen">
      <h2 className="text-2xl font-bold text-yellow-400 mb-6 text-center tracking-wider">
        Favorites List
      </h2>
      
      {/* Favorites List */}
      <div className="grid grid-cols-1 gap-4">
        {favorites.map(item => {
          const alreadyWatched = isInWatchedList(item.id);
          
          return (
            <div 
              key={item.id} 
              className="relative bg-gray-800 bg-opacity-90 rounded-lg p-4 shadow-xl border border-yellow-900/30 cursor-pointer hover:bg-gray-700/90"
              onClick={() => viewDetails(item)}
            >
              <div className="flex items-start space-x-4">
                {/* Poster */}
                <div className="relative w-24 h-36 flex-shrink-0">
                  <img
                    src={`${IMAGE_BASE_URL}${item.poster_path}`}
                    alt={item.title}
                    className="w-full h-full object-cover rounded-md shadow-lg border-2 border-yellow-600/30"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-md"/>
                </div>
                
                {/* Item Info */}
                <div className="flex-grow">
                  <h3 className="text-lg font-semibold text-yellow-400 mb-2">
                    {item.title}
                  </h3>
                  <span className="inline-block px-2 py-1 bg-yellow-600/20 text-yellow-400 text-xs rounded-full mb-2">
                    {item.mediaType === 'tv' ? 'TV Series' : 'Movie'}
                  </span>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button
                      onClick={(e) => removeFromFavorites(item.id, e)}
                      className="px-3 py-1 bg-red-600/80 hover:bg-red-700 text-white rounded-md transition-colors duration-200 text-sm"
                    >
                      Remove
                    </button>
                    
                    <button
                      onClick={(e) => addToWatched(item, e)}
                      disabled={alreadyWatched}
                      className={`px-3 py-1 text-white rounded-md transition-colors duration-200 text-sm ${
                        alreadyWatched 
                          ? 'bg-green-700 cursor-not-allowed' 
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {alreadyWatched ? 'Already Watched' : 'Add to Watched'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Empty State */}
        {favorites.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-400">No favorites added yet.</p>
            <p className="text-yellow-500 mt-2">Start adding your favorite movies and shows!</p>
          </div>
        )}
      </div>
      
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
      
      {/* Show Detail Modal */}
      {selectedItem && !isLoading && itemDetails && (
        selectedItem.mediaType === 'tv' || itemDetails.seasons || itemDetails.number_of_seasons ? (
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

export default FavoritesList;