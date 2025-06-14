import React, { useState, useEffect } from "react";
import { IMAGE_BASE_URL, API_KEY, TMDB_BASE_URL } from "../config";
import ShowDetail from "./ShowDetail";
import ShowDetailModal from "./ShowDetailModal";

const ShowsList = () => {
  const [watchedShows, setWatchedShows] = useState([]);
  const [filteredShows, setFilteredShows] = useState([]);
  const [selectedShow, setSelectedShow] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForModal, setShowForModal] = useState(null);
  const [showDetails, setShowDetails] = useState(null);

  useEffect(() => {
    const allWatched = JSON.parse(localStorage.getItem("watched")) || [];
    const shows = allWatched.filter(item => item.mediaType === "tv");
    
    // Sort shows alphabetically by title
    const sortedShows = shows.sort((a, b) => 
      a.title.toLowerCase().localeCompare(b.title.toLowerCase())
    );
    
    setWatchedShows(sortedShows);
    setFilteredShows(sortedShows);
  }, []);

  // Handle search input changes
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.trim() === "") {
      setFilteredShows(watchedShows);
    } else {
      const filtered = watchedShows.filter(show => 
        show.title.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredShows(filtered);
    }
  };

  // Fetch detailed show information
  const fetchShowDetails = async (showId) => {
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/tv/${showId}?api_key=${API_KEY}`
      );
      const data = await response.json();
      setShowDetails(data);
    } catch (error) {
      console.error("Error fetching show details:", error);
    }
  };

  // Handle selecting a show for detailed view
  const handleShowSelect = (show) => {
    // Create a copy of the show to avoid reference issues
    setSelectedShow({...show});
  };

  // Handle selecting a show for modal view
  const handleShowModalSelect = (show) => {
    setShowForModal(show);
    fetchShowDetails(show.id);
  };

  // Close the show detail modal
  const closeShowModal = () => {
    setShowForModal(null);
    setShowDetails(null);
  };

  // Callback function to update the shows list when returning from detail view
  const handleShowUpdated = (updatedShow) => {
    // Update the shows in state
    const updatedShows = watchedShows.map(show => 
      show.id === updatedShow.id ? updatedShow : show
    );
    setWatchedShows(updatedShows);
    setFilteredShows(updatedShows.filter(show => 
      show.title.toLowerCase().includes(searchTerm.toLowerCase())
    ));
  };

  const removeShow = (id, e) => {
    if (e) {
      e.stopPropagation();
    }
    
    const allWatched = JSON.parse(localStorage.getItem("watched")) || [];
    const updatedWatched = allWatched.filter(item => item.id !== id);
    localStorage.setItem("watched", JSON.stringify(updatedWatched));
    
    const updatedShows = watchedShows.filter(show => show.id !== id);
    setWatchedShows(updatedShows);
    
    // Update filtered list as well
    setFilteredShows(updatedShows.filter(show => 
      show.title.toLowerCase().includes(searchTerm.toLowerCase())
    ));
    
    // Close modal if the removed show is currently selected
    if (showForModal && showForModal.id === id) {
      closeShowModal();
    }
    
    setSelectedShow(null);
  };

  if (selectedShow) {
    return (
      <ShowDetail 
        show={selectedShow} 
        onBack={() => {
          // Get the latest data before going back
          const allWatched = JSON.parse(localStorage.getItem("watched")) || [];
          const updatedShow = allWatched.find(item => item.id === selectedShow.id);
          if (updatedShow) {
            handleShowUpdated(updatedShow);
          }
          setSelectedShow(null);
        }}
        onRemove={removeShow}
      />
    );
  }

  return (
    <div className="p-4 min-h-screen pb-20">
      {/* Search section with enhanced background */}
      <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-md shadow-lg rounded-lg border border-gray-800 mb-4">
        <div className="p-1">
          <div className="flex items-center space-x-2">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Search your shows..."
                value={searchTerm}
                onChange={handleSearch}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch({ target: { value: searchTerm } });
                  }
                }}
                className="w-full p-2 pl-8 border border-yellow-500 rounded-md bg-gray-800 text-white placeholder-gray-400"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                🔍
              </div>
              {searchTerm && (
                <button 
                  onClick={() => {
                    setSearchTerm("");
                    setFilteredShows(watchedShows);
                  }}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  ✖️
                </button>
              )}
            </div>
            <button
              onClick={() => handleSearch({ target: { value: searchTerm } })}
              className="p-2 bg-yellow-500 text-gray-900 font-bold rounded-md hover:bg-yellow-600 transition duration-300"
            >
              GO!
            </button>
          </div>
          
          {searchTerm && (
            <div className="mt-2 text-sm text-gray-400">
              Found {filteredShows.length} {filteredShows.length === 1 ? "show" : "shows"}
            </div>
          )}
        </div>
      </div>
      
      {filteredShows.map((show) => {
        const watchedEpisodes = show.seasons ? 
          Object.values(show.seasons)
            .reduce((sum, season) => sum + (season.watchedEpisodes?.length || 0), 0) : 0;

        return (
          <div 
            key={show.id}
            onClick={() => handleShowSelect(show)}
            className="mb-4 relative bg-gray-800/90 rounded-lg border border-yellow-900/30 cursor-pointer hover:bg-gray-700/90"
          >
            {/* X button in the top-right corner - UPDATED STYLING */}
            <button
              onClick={(e) => removeShow(show.id, e)}
              className="absolute top-0 right-0 z-60 bg-red-600 hover:bg-red-700 text-white border rounded w-6 h-6 flex items-center justify-center shadow-md transition-colors transform translate-x-1/2 -translate-y-1/2"
              aria-label="Remove show"
            >
              ✕
            </button>
            
            <div className="flex p-1 relative h-10" style={{ minHeight: '150px' }}>
              <img
                src={`${IMAGE_BASE_URL}${show.poster_path}`}
                alt={show.title}
                onClick={(e) => {
                  e.stopPropagation();
                  handleShowModalSelect(show);
                }}
                className="w-24 h-36 object-cover rounded-md border-2 border-yellow-600/30 cursor-pointer hover:opacity-80 transition-opacity"
              />
              <div className="flex-grow ml-4 flex flex-col">
                <div className="pb-12">
                  <h3 className="text-2xl font-semibold text-yellow-400 line-clamp-2">
                    {show.title}
                  </h3>
                  <div className="text-gray-400 mt-1">
                    {show.number_of_seasons} Seasons • TV Show
                  </div>
                  <div className="text-gray-400 mt-1">
                    {watchedEpisodes} episodes watched
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      
      {/* Show Detail Modal */}
      {showForModal && showDetails && (
        <ShowDetailModal 
          show={showDetails} 
          onClose={closeShowModal}
        />
      )}
      
      {filteredShows.length === 0 && (
        <div className="text-center py-10">
          {watchedShows.length === 0 ? (
            <>
              <p className="text-gray-400">No shows in your watched list</p>
              <p className="text-yellow-500 mt-2">Start adding some shows!</p>
            </>
          ) : (
            <p className="text-gray-400">No shows match your search</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ShowsList;