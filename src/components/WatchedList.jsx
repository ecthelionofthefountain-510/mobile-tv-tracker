import React, { useState, useEffect } from "react";
import { IMAGE_BASE_URL } from "../config";

const WatchedList = () => {
  const [watched, setWatched] = useState([]);

  useEffect(() => {
    const storedWatched = JSON.parse(localStorage.getItem("watched")) || [];
    setWatched(storedWatched);
  }, []);

  // Ta bort film/serie från "Watched"
  const removeFromWatched = (id) => {
    const updatedList = watched.filter((movie) => movie.id !== id);
    setWatched(updatedList);
    localStorage.setItem("watched", JSON.stringify(updatedList));
  };

  return (
    <div className="p-4">
      <h2 className="text-yellow-400 text-xl">Watched List</h2>
      <ul>
        {watched.map((movie) => (
          <li key={movie.id} className="flex items-center space-x-4">
            <img src={`${IMAGE_BASE_URL}${movie.poster_path}`} alt={movie.title} className="w-16 h-auto rounded-md" />
            <span>{movie.title}</span>
            <button onClick={() => removeFromWatched(movie.id)} className="bg-red-600 p-1 text-white rounded">Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default WatchedList;