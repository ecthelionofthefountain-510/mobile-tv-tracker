import React, { useState, useEffect } from "react";
import { IMAGE_BASE_URL } from "../config";

const FavoritesList = () => {
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    const storedFavorites = JSON.parse(localStorage.getItem("favorites")) || [];
    setFavorites(storedFavorites);
  }, []);

  // Ta bort film/serie från "Favorites"
  const removeFromFavorites = (id) => {
    const updatedList = favorites.filter((movie) => movie.id !== id);
    setFavorites(updatedList);
    localStorage.setItem("favorites", JSON.stringify(updatedList));
  };

  return (
    <div className="p-4">
      <h2 className="text-yellow-400 text-xl">Favorite List</h2>
      <ul>
        {favorites.map((movie) => (
          <li key={movie.id} className="flex items-center space-x-4">
            <img src={`${IMAGE_BASE_URL}${movie.poster_path}`} alt={movie.title} className="w-16 h-auto rounded-md" />
            <span>{movie.title}</span>
            <button onClick={() => removeFromFavorites(movie.id)} className="bg-red-600 p-1 text-white rounded">Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FavoritesList;