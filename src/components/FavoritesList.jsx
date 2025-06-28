import React, { useState, useEffect } from "react";
import { IMAGE_BASE_URL, API_KEY, TMDB_BASE_URL } from "../config";
import MovieDetailModal from "./MovieDetailModal";
import ShowDetailModal from "./ShowDetailModal";
import NotificationModal from "./NotificationModal";
import { SwipeableList, SwipeableListItem } from "react-swipeable-list";
import "react-swipeable-list/dist/styles.css";
import FavoriteCard from "./FavoriteCard";
import ShowCard from "./ShowCard";

const FavoritesList = () => {
  const [favorites, setFavorites] = useState([]);
  const [filteredFavorites, setFilteredFavorites] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemDetails, setItemDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [watched, setWatched] = useState([]);
  const [sortBy, setSortBy] = useState("title"); // "title" eller "dateAdded"

  // State for notifications
  const [notification, setNotification] = useState({
    show: false,
    message: ""
  });
  
  useEffect(() => {
    // Load favorites from localStorage
    const loadFavorites = () => {
      try {
        const storedFavorites = JSON.parse(localStorage.getItem("favorites")) || [];
        console.log("Loaded favorites:", storedFavorites);
        
        // Sort favorites alphabetically by title
        const sortedFavorites = sortFavorites(storedFavorites, sortBy);
        
        setFavorites(sortedFavorites);
        setFilteredFavorites(sortedFavorites);
      } catch (error) {
        console.error("Error loading favorites:", error);
        setFavorites([]);
        setFilteredFavorites([]);
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
  }, [sortBy]);

  // Show notification function
  const showNotification = (message) => {
    setNotification({
      show: true,
      message
    });
  };

  // Close notification function
  const closeNotification = () => {
    setNotification({
      show: false,
      message: ""
    });
  };

  // Handle search input changes
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.trim() === "") {
      setFilteredFavorites(favorites);
    } else {
      const filtered = favorites.filter(item => 
        item.title.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredFavorites(filtered);
    }
  };

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
        showNotification(`Failed to load details: ${error.message}`);
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
    setFilteredFavorites(updatedList.filter(item => 
      item.title.toLowerCase().includes(searchTerm.toLowerCase())
    ));
    localStorage.setItem("favorites", JSON.stringify(updatedList));
    
    // Close modal if the removed item is currently selected
    if (selectedItem && selectedItem.id === id) {
      closeModal();
    }
  };

  // Add an item to watched list and remove from favorites
  const addToWatched = async (item, e) => {
    // Stop event propagation
    e.stopPropagation();
    
    // Check if already in watched list
    const isAlreadyWatched = watched.some(watchedItem => watchedItem.id === item.id);
    
    if (isAlreadyWatched) {
      showNotification("This item is already in your watched list.");
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
      
      // Remove from favorites
      const updatedFavorites = favorites.filter(fav => fav.id !== item.id);
      setFavorites(updatedFavorites);
      setFilteredFavorites(updatedFavorites.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase())
      ));
      localStorage.setItem("favorites", JSON.stringify(updatedFavorites));
      
      // Show notification instead of alert
      showNotification(`"${item.title}" has been added to your watched list`);
      
      // Close modal if the item is currently selected
      if (selectedItem && selectedItem.id === item.id) {
        closeModal();
      }
      
    } catch (error) {
      console.error("Error adding to watched:", error);
      showNotification(`Failed to add to watched: ${error.message}`);
    }
  };

  // Check if an item is in the watched list
  const isInWatchedList = (id) => {
    return watched.some(item => item.id === id);
  };

  const sortFavorites = (items, sortBy) => {
    if (sortBy === "title") {
      return [...items].sort((a, b) =>
        (a.title || a.name).toLowerCase().localeCompare((b.title || b.name).toLowerCase())
      );
    } else if (sortBy === "dateAdded") {
      return [...items].sort((a, b) =>
        new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0)
      );
    }
    return items;
  };

  return (
    <div className="min-h-screen p-4 pb-20">
      {/* Header with search section - enhanced background */}
      <div className="sticky top-0 z-10 mb-4 border border-gray-800 rounded-lg shadow-lg bg-gray-900/95 backdrop-blur-md ">
        <div className="p-1">
          
          
          {/* Search input */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Search your favorites..."
                value={searchTerm}
                onChange={handleSearch}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch({ target: { value: searchTerm } });
                  }
                }}
                className="w-full p-2 pl-8 text-white placeholder-gray-400 bg-gray-800 border border-yellow-500 rounded-md"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                🔍
              </div>
              {searchTerm && (
                <button 
                  onClick={() => {
                    setSearchTerm("");
                    setFilteredFavorites(favorites);
                  }}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  ✖️
                </button>
              )}
            </div>
            <button
              onClick={() => handleSearch({ target: { value: searchTerm } })}
              className="p-2 font-bold text-gray-900 transition duration-300 bg-yellow-500 rounded-md hover:bg-yellow-600"
            >
              GO!
            </button>
          </div>
          
          {searchTerm && (
            <div className="mt-2 text-sm text-gray-400">
              Found {filteredFavorites.length} {filteredFavorites.length === 1 ? "item" : "items"}
            </div>
          )}
        </div>
      </div>
      
      {/* Favorites List with updated styling to match Movies/Shows */}
      <div className="grid grid-cols-1 gap-4">
        {/* Header for favorites section */}
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold text-yellow-400">Your Favorites</div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="px-2 py-1 text-sm text-white bg-gray-800 border border-yellow-500 rounded"
          >
            <option value="title">A-Ö</option>
            <option value="dateAdded">Senast tillagd</option>
          </select>
        </div>
        <SwipeableList>
          {filteredFavorites.map((item) => (
            <SwipeableListItem
              key={item.id}
              swipeLeft={{
                content: (
                  <div className="flex items-center justify-end h-full pr-6 text-lg font-bold text-white bg-green-600 rounded-lg">
                    {item.mediaType === "tv" ? "➕ Till serier" : "➕ Till filmer"}
                  </div>
                ),
                action: (e) => {
                  if (item.mediaType === "tv") {
                    addToShows(item, e);
                  } else {
                    addToWatched(item, e);
                  }
                },
              }}
              swipeRight={{
                content: (
                  <div className="flex items-center justify-start h-full pl-6 text-lg font-bold text-white bg-red-600 rounded-lg">
                    🗑 Ta bort
                  </div>
                ),
                action: (e) => removeFromFavorites(item.id, e),
              }}
            >
              {item.mediaType === "tv" ? (
                <ShowCard
                  item={item}
                  onSelect={viewDetails}
                  onRemove={removeFromFavorites}
                  showButtons={false} // Viktigt!
                />
              ) : (
                <FavoriteCard
                  item={item}
                  onClick={() => viewDetails(item)}
                  showButtons={false} // Viktigt!
                />
              )}
            </SwipeableListItem>
          ))}
        </SwipeableList>
        
        {/* Empty State */}
        {filteredFavorites.length === 0 && (
          <div className="py-10 text-center">
            {favorites.length === 0 ? (
              <>
                <p className="text-gray-400">No favorites added yet.</p>
                <p className="mt-2 text-yellow-500">Start adding your favorite movies and shows!</p>
              </>
            ) : (
              <p className="text-gray-400">No favorites match your search</p>
            )}
          </div>
        )}
      </div>
      
      {/* Loading Indicator */}
      {isLoading && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
          <div className="p-6 text-center bg-gray-800 rounded-lg">
            <div className="mb-3 text-lg text-yellow-400">Loading details...</div>
            <button 
              onClick={closeModal}
              className="px-4 py-2 text-white bg-gray-700 rounded-md hover:bg-gray-600"
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

      {/* NotificationModal */}
      {notification.show && (
        <NotificationModal
          message={notification.message}
          onClose={closeNotification}
          autoCloseTime={3000}
        />
      )}
    </div>
  );
};

export default FavoritesList;