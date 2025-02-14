import React, { useState, useEffect } from "react";
import { IMAGE_BASE_URL } from "../config";

const FavoritesList = () => {
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    const storedFavorites = JSON.parse(localStorage.getItem("favorites")) || [];
    setFavorites(storedFavorites);
  }, []);

  const removeFromFavorites = (id) => {
    const updatedList = favorites.filter((item) => item.id !== id);
    setFavorites(updatedList);
    localStorage.setItem("favorites", JSON.stringify(updatedList));
  };

  return (
    <div className="p-4 min-h-screen">
      <h2 className="text-2xl font-bold text-yellow-400 mb-6 text-center tracking-wider">
        Favorites List
      </h2>
      <div className="grid grid-cols-1 gap-4">
        {favorites.map((item) => (
          <div 
            key={item.id} 
            className="relative bg-gray-800 bg-opacity-90 rounded-lg p-4 shadow-xl transform transition-all duration-300 hover:scale-102 border border-yellow-900/30"
          >
            <div className="flex items-start space-x-4">
              <div className="relative w-24 h-36 flex-shrink-0">
                <img
                  src={`${IMAGE_BASE_URL}${item.poster_path}`}
                  alt={item.title}
                  className="w-full h-full object-cover rounded-md shadow-lg border-2 border-yellow-600/30"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-md"/>
              </div>
              
              <div className="flex-grow">
                <h3 className="text-lg font-semibold text-yellow-400 mb-2">
                  {item.title}
                </h3>
                {item.mediaType && (
                  <span className="inline-block px-2 py-1 bg-yellow-600/20 text-yellow-400 text-xs rounded-full mb-2">
                    {item.mediaType === 'tv' ? 'TV Series' : 'Movie'}
                  </span>
                )}
                <button
                  onClick={() => removeFromFavorites(item.id)}
                  className="mt-2 px-4 py-2 bg-red-600/80 hover:bg-red-700 text-white rounded-md transition-colors duration-200 text-sm flex items-center space-x-1"
                >
                  <span>Remove</span>
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {favorites.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-400">No favorites added yet.</p>
            <p className="text-yellow-500 mt-2">Start adding your favorite movies and shows!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesList;