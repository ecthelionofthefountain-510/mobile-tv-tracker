import React, { useState } from "react";
import { API_KEY, TMDB_BASE_URL, IMAGE_BASE_URL } from "../config";

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [watched, setWatched] = useState(() => JSON.parse(localStorage.getItem("watched")) || []);
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem("favorites")) || []);

  // Sök filmer eller serier
  const searchMovies = async () => {
    if (!query.trim()) return;
    const response = await fetch(`${TMDB_BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
    const data = await response.json();
    setResults(data.results || []);
  };

  // Lägg till i "Watched"
  const addToWatched = (movie) => {
    if (!watched.find((item) => item.id === movie.id)) {
      const updatedList = [...watched, movie];
      setWatched(updatedList);
      localStorage.setItem("watched", JSON.stringify(updatedList));
    }
  };

  // Lägg till i "Favorites"
  const addToFavorites = (movie) => {
    if (!favorites.find((item) => item.id === movie.id)) {
      const updatedList = [...favorites, movie];
      setFavorites(updatedList);
      localStorage.setItem("favorites", JSON.stringify(updatedList));
    }
  };

  return (
    <div className="p-4">
      {/* Sökfält och knapp i flexbox */}
      <div className="flex items-center space-x-2">
        <input
          type="text"
          placeholder="Search for a movie or series..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full p-2 border border-yellow-500 rounded-md bg-gray-800 text-white placeholder-gray-400"
        />
        <button
          onClick={searchMovies}
          className="p-2 bg-yellow-500 text-gray-900 font-bold rounded-md hover:bg-yellow-600 transition duration-300"
        >
          Search
        </button>
      </div>

      <ul className="mt-4">
        {results.map((movie) => {
          const isWatched = watched.some((item) => item.id === movie.id);
          const isFavorite = favorites.some((item) => item.id === movie.id);

          return (
            <li key={movie.id} className="mb-2 flex items-center space-x-4 bg-gray-800 p-3 rounded-lg">
              <img src={`${IMAGE_BASE_URL}${movie.poster_path}`} alt={movie.title} className="w-16 h-auto rounded-md" />
              <span className="text-yellow-400 flex-grow">{movie.title}</span>

              <button
                onClick={() => addToWatched(movie)}
                className={`p-1 text-white rounded ${isWatched ? "bg-green-700" : "bg-green-600"}`}
              >
                {isWatched ? "Watched" : "Add to Watched"}
              </button>
              <button
                onClick={() => addToFavorites(movie)}
                className={`p-1 text-white rounded ${isFavorite ? "bg-yellow-700" : "bg-yellow-500"}`}
              >
                {isFavorite ? "Added" : "Add to Favorites"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default SearchPage;