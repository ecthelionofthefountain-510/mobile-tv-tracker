// OverviewPage.jsx
import React, { useEffect, useState } from "react";
import { API_KEY, TMDB_BASE_URL, IMAGE_BASE_URL } from "../config";
import { loadWatchedAll } from "../utils/watchedStorage";
import MovieDetailModal from "./MovieDetailModal";
import ShowDetailModal from "./ShowDetailModal";

const GENRE_MAP = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};

const OverviewPage = () => {
  const [watched, setWatched] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemDetails, setItemDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const allWatched = await loadWatchedAll();
      setWatched(allWatched || []);
      const favs = JSON.parse(localStorage.getItem("favorites")) || [];
      setFavorites(favs);
    })();
  }, []);

  const isShow = (item) =>
    item.mediaType === "tv" || !!item.seasons || item.type === "show";

  const isMovie = (item) =>
    item.mediaType === "movie" || (!item.seasons && item.type !== "show");

  const watchedShows = watched.filter(isShow);
  const watchedMovies = watched.filter(isMovie);

  const totalEpisodesWatched = watchedShows.reduce((sum, show) => {
    const seasons = show.seasons || {};
    const seasonEpisodeCount = Object.values(seasons).reduce(
      (s, season) => s + (season.watchedEpisodes?.length || 0),
      0
    );
    return sum + seasonEpisodeCount;
  }, 0);

  // Genre-statistik
  const genreCounts = {};
  watched.forEach((item) => {
    // Försök först med fulla genre-objekt (från detaljer)
    let genreNames =
      item.genres?.map((g) => g.name) ||
      item.genre_ids?.map((id) => GENRE_MAP[id]).filter(Boolean) ||
      [];

    // Undvik att räkna samma titel flera gånger per genre om du har dubbletter
    genreNames = Array.from(new Set(genreNames));

    genreNames.forEach((name) => {
      genreCounts[name] = (genreCounts[name] || 0) + 1;
    });
  });

  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5); // topp 5 genrer

  const recentWatched = [...watched].slice(-5).reverse();
  const recentFavorites = [...favorites].slice(-5).reverse();

  // TMDB-detaljer (som på SearchPage)
  const openDetails = async (item) => {
    const mediaType = item.mediaType || (item.seasons ? "tv" : "movie");

    setSelectedItem({ ...item, mediaType });
    setIsLoading(true);

    const endpoint = mediaType === "tv" ? "tv" : "movie";

    try {
      const [details, credits, videos] = await Promise.all([
        fetch(
          `${TMDB_BASE_URL}/${endpoint}/${item.id}?api_key=${API_KEY}`
        ).then((res) => res.json()),
        fetch(
          `${TMDB_BASE_URL}/${endpoint}/${item.id}/credits?api_key=${API_KEY}`
        ).then((res) => res.json()),
        fetch(
          `${TMDB_BASE_URL}/${endpoint}/${item.id}/videos?api_key=${API_KEY}`
        ).then((res) => res.json()),
      ]);

      setItemDetails({ ...details, credits, videos });
    } catch (err) {
      console.error("Failed to load details from TMDB", err);
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedItem(null);
    setItemDetails(null);
  };

  const getYear = (item) => {
    if (item.release_date) return new Date(item.release_date).getFullYear();
    if (item.first_air_date) return new Date(item.first_air_date).getFullYear();
    return null;
  };

  const getSeasonsCount = (item) =>
    item.mediaType === "tv"
      ? item.number_of_seasons ||
        (item.seasons ? Object.keys(item.seasons).length : null)
      : null;

  // --- Highlight-hjälpare ---
  const topRatedMovie =
    watchedMovies.length > 0
      ? watchedMovies.reduce((best, curr) =>
          (curr.vote_average || 0) > (best.vote_average || 0) ? curr : best
        )
      : null;

  const topRatedShow =
    watchedShows.length > 0
      ? watchedShows.reduce((best, curr) =>
          (curr.vote_average || 0) > (best.vote_average || 0) ? curr : best
        )
      : null;

  const longestShow =
    watchedShows.length > 0
      ? watchedShows.reduce((best, curr) => {
          const bestSeasons = getSeasonsCount(best) || 0;
          const currSeasons = getSeasonsCount(curr) || 0;
          return currSeasons > bestSeasons ? curr : best;
        })
      : null;

  const renderSmallCard = (label, item) => {
    if (!item) return null;

    const year = getYear(item);
    const seasonsCount = getSeasonsCount(item);
    const rating =
      typeof item.vote_average === "number"
        ? item.vote_average.toFixed(1)
        : null;

    return (
      <button
        type="button"
        onClick={() => openDetails(item)}
        className="flex w-full overflow-hidden text-left transition border border-gray-800 rounded-lg bg-gray-900/80 hover:border-yellow-500/80 hover:bg-gray-900"
      >
        <div className="flex-shrink-0 w-16 sm:w-20">
          {item.poster_path ? (
            <img
              src={`${IMAGE_BASE_URL}${item.poster_path}`}
              alt={item.title || item.name}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-xs text-gray-500 bg-gray-800">
              No image
            </div>
          )}
        </div>
        <div className="flex-1 px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            {label}
          </div>
          <div className="text-sm font-bold text-yellow-400 sm:text-base">
            {(item.title || item.name || "").toUpperCase()}
          </div>
          <div className="mt-0.5 text-xs text-gray-300">
            {/* Rad 1: typ + år */}
            <div>
              {item.mediaType === "tv" ? "TV SHOW" : "MOVIE"}
              {year && <> • {year}</>}
            </div>

            {/* Rad 2: säsonger + betyg */}
            <div>
              {seasonsCount && (
                <>
                  {seasonsCount} SEASON{seasonsCount > 1 ? "S" : ""}{" "}
                </>
              )}
            </div>

            <div>{rating && <> ⭐ {rating}</>}</div>

            {/* Rad 3: genres (om du vill) */}
            {item.genres && item.genres.length > 0 && (
              <div className="mt-0.5 text-[10px] text-gray-400">
                {item.genres.map((g) => g.name).join(" • ")}
              </div>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-screen p-4 pb-20">
      <h1 className="mb-4 text-2xl font-bold text-yellow-400">Overview</h1>

      {/* Snabba siffror */}
      <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-4">
        <div className="p-3 text-center border rounded-lg bg-gray-900/80 border-yellow-500/60">
          <div className="text-xs text-gray-400">Total watched</div>
          <div className="text-2xl font-bold text-yellow-400">
            {watched.length}
          </div>
        </div>
        <div className="p-3 text-center border rounded-lg bg-gray-900/80 border-yellow-500/60">
          <div className="text-xs text-gray-400">Movies</div>
          <div className="text-2xl font-bold text-yellow-400">
            {watchedMovies.length}
          </div>
        </div>
        <div className="p-3 text-center border rounded-lg bg-gray-900/80 border-yellow-500/60">
          <div className="text-xs text-gray-400">Shows</div>
          <div className="text-2xl font-bold text-yellow-400">
            {watchedShows.length}
          </div>
        </div>
        <div className="p-3 text-center border rounded-lg bg-gray-900/80 border-yellow-500/60">
          <div className="text-xs text-gray-400">Favorites</div>
          <div className="text-2xl font-bold text-yellow-400">
            {favorites.length}
          </div>
        </div>
      </div>

      {/* Avsnitts-statistik */}
      <div className="p-4 mb-6 border border-gray-700 rounded-lg bg-gray-900/80">
        <h2 className="mb-2 text-lg font-semibold text-yellow-400">
          Episode progress
        </h2>
        <p className="text-sm text-gray-300">
          You have tracked{" "}
          <span className="font-semibold text-yellow-400">
            {totalEpisodesWatched}
          </span>{" "}
          watched episodes across{" "}
          <span className="font-semibold text-yellow-400">
            {watchedShows.length}
          </span>{" "}
          shows.
        </p>
      </div>

      {/* Genre breakdown */}
      {topGenres.length > 0 && (
        <div className="p-4 mb-6 border border-gray-700 rounded-lg bg-gray-900/80">
          <h2 className="mb-2 text-lg font-semibold text-yellow-400">
            Top genres
          </h2>
          <p className="mb-3 text-sm text-gray-300">
            Based on your watched movies and shows.
          </p>
          <div className="flex flex-wrap gap-2">
            {topGenres.map(([name, count]) => (
              <span
                key={name}
                className="px-3 py-1 text-xs font-semibold tracking-wide text-yellow-300 uppercase border rounded-full border-yellow-500/70 bg-gray-900/90"
              >
                {name} <span className="text-gray-300">· {count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recently added */}
      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold tracking-wide text-yellow-400 uppercase">
          Recently added to watched
        </h2>

        {recentWatched.length === 0 ? (
          <div className="px-4 py-6 text-sm text-center text-gray-400 border border-gray-800 rounded-lg bg-gray-900/70">
            Nothing here yet. Start adding some movies or shows!
          </div>
        ) : (
          <div className="space-y-3">
            {recentWatched.map((item) => {
              const year = getYear(item);
              const seasonsCount = getSeasonsCount(item);
              const rating =
                typeof item.vote_average === "number"
                  ? item.vote_average.toFixed(1)
                  : null;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openDetails(item)}
                  className="flex w-full overflow-hidden text-left transition border border-gray-800 rounded-lg bg-gray-900/80 hover:border-yellow-500/80 hover:bg-gray-900"
                >
                  <div className="flex-shrink-0 w-16 sm:w-20">
                    {item.poster_path ? (
                      <img
                        src={`${IMAGE_BASE_URL}${item.poster_path}`}
                        alt={item.title || item.name}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-xs text-gray-500 bg-gray-800">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="flex-1 px-3 py-2">
                    <div className="text-sm font-bold text-yellow-400 sm:text-base">
                      {(item.title || item.name || "").toUpperCase()}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-300">
                      {/* Rad 1: typ + år */}
                      <div>
                        {item.mediaType === "tv" ? "TV SHOW" : "MOVIE"}
                        {year && <> • {year}</>}
                      </div>

                      {/* Rad 2: säsonger + betyg */}
                      <div>
                        {seasonsCount && (
                          <>
                            {seasonsCount} SEASON{seasonsCount > 1 ? "S" : ""}{" "}
                          </>
                        )}
                        {rating && <> ⭐ {rating}</>}
                      </div>

                      {/* Rad 3: genres (om du vill) */}
                      {item.genres && item.genres.length > 0 && (
                        <div className="mt-0.5 text-[10px] text-gray-400">
                          {item.genres.map((g) => g.name).join(" • ")}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Highlights */}
      {(topRatedMovie || topRatedShow || longestShow) && (
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-bold tracking-wide text-yellow-400 uppercase">
            Highlights from your collection
          </h2>
          <div className="space-y-3">
            {renderSmallCard("Top rated movie", topRatedMovie)}
            {renderSmallCard("Top rated show", topRatedShow)}
            {renderSmallCard("Longest running show", longestShow)}
          </div>
        </section>
      )}

      {/* Recent favorites */}
      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold tracking-wide text-yellow-400 uppercase">
          Recent favorites
        </h2>

        {recentFavorites.length === 0 ? (
          <p className="text-sm text-gray-400">
            Mark something as favorite to see it here.
          </p>
        ) : (
          <div className="space-y-3">
            {recentFavorites.map((item) => {
              const year = getYear(item);
              const seasonsCount = getSeasonsCount(item);
              const rating =
                typeof item.vote_average === "number"
                  ? item.vote_average.toFixed(1)
                  : null;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openDetails(item)}
                  className="flex w-full overflow-hidden text-left transition border border-gray-800 rounded-lg bg-gray-900/80 hover:border-yellow-500/80 hover:bg-gray-900"
                >
                  {/* Poster */}
                  <div className="flex-shrink-0 w-16 sm:w-20">
                    {item.poster_path ? (
                      <img
                        src={`${IMAGE_BASE_URL}${item.poster_path}`}
                        alt={item.title || item.name}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-xs text-gray-500 bg-gray-800">
                        No image
                      </div>
                    )}
                  </div>

                  {/* Text-info */}
                  <div className="flex-1 px-3 py-2">
                    <div className="text-sm font-bold text-yellow-300 sm:text-base">
                      {(item.title || item.name || "").toUpperCase()}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-300">
                      {/* Rad 1: typ + år */}
                      <div>
                        {item.mediaType === "tv" ? "TV SHOW" : "MOVIE"}
                        {year && <> • {year}</>}
                      </div>

                      {/* Rad 2: säsonger + betyg */}
                      <div>
                        {seasonsCount && (
                          <>
                            {seasonsCount} SEASON{seasonsCount > 1 ? "S" : ""}{" "}
                          </>
                        )}
                        {rating && <> ⭐ {rating}</>}
                      </div>

                      {/* Rad 3: genres (om du vill) */}
                      {item.genres && item.genres.length > 0 && (
                        <div className="mt-0.5 text-[10px] text-gray-400">
                          {item.genres.map((g) => g.name).join(" • ")}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Detalj-modal */}
      {selectedItem &&
        !isLoading &&
        itemDetails &&
        (selectedItem.mediaType === "tv" ? (
          <ShowDetailModal show={itemDetails} onClose={closeModal} />
        ) : (
          <MovieDetailModal movie={itemDetails} onClose={closeModal} />
        ))}
    </div>
  );
};

export default OverviewPage;
