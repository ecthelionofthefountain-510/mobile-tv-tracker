import React, { useState, useEffect } from "react";
import { IMAGE_BASE_URL } from "../config";
import ShowDetail from "./ShowDetail";

const ShowsList = () => {
  const [watchedShows, setWatchedShows] = useState([]);
  const [selectedShow, setSelectedShow] = useState(null);

  useEffect(() => {
    const allWatched = JSON.parse(localStorage.getItem("watched")) || [];
    const shows = allWatched.filter(item => item.mediaType === "tv");
    setWatchedShows(shows);
  }, []);

  const removeShow = (id) => {
    const allWatched = JSON.parse(localStorage.getItem("watched")) || [];
    const updatedWatched = allWatched.filter(item => item.id !== id);
    localStorage.setItem("watched", JSON.stringify(updatedWatched));
    setWatchedShows(prev => prev.filter(show => show.id !== id));
    setSelectedShow(null);
  };

  if (selectedShow) {
    return (
      <ShowDetail 
        show={selectedShow} 
        onBack={() => setSelectedShow(null)}
        onRemove={removeShow}
      />
    );
  }

  return (
    <div className="p-4 min-h-screen pb-20">
      {watchedShows.map((show) => {
        const watchedEpisodes = show.seasons ? 
          Object.values(show.seasons)
            .reduce((sum, season) => sum + (season.watchedEpisodes?.length || 0), 0) : 0;

        return (
          <div 
            key={show.id}
            onClick={() => setSelectedShow(show)}
            className="mb-4 relative bg-gray-800/90 rounded-lg border border-yellow-900/30 cursor-pointer hover:bg-gray-700/90"
          >
            <div className="flex p-4">
              <img
                src={`${IMAGE_BASE_URL}${show.poster_path}`}
                alt={show.title}
                className="w-24 h-36 object-cover rounded-md border-2 border-yellow-600/30"
              />
              <div className="flex-grow ml-4">
                <h3 className="text-2xl font-semibold text-yellow-400">
                  {show.title}
                </h3>
                <div className="text-gray-400 mt-1">
                  {show.number_of_seasons} Seasons • TV Show
                </div>
                <div className="text-gray-400 mt-1">
                  {watchedEpisodes} episodes watched
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeShow(show.id);
                }}
                className="absolute bottom-4 right-4 px-3 py-1 bg-red-600/80 hover:bg-red-700 text-white rounded-md"
              >
                Remove
              </button>
            </div>
          </div>
        );
      })};
      
      {watchedShows.length === 0 && (
        <div className="text-center py-10">
          <p className="text-gray-400">No shows in your watched list</p>
          <p className="text-yellow-500 mt-2">Start adding some shows!</p>
        </div>
      )}
    </div>
  );
};

export default ShowsList;