// OverviewPage.jsx
import React, { useEffect, useState } from "react";
import { loadWatchedAll } from "../utils/watchedStorage";

const OverviewPage = () => {
  const [loading, setLoading] = useState(true);
  const [shows, setShows] = useState([]);
  const [movies, setMovies] = useState([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      const all = await loadWatchedAll();
      if (cancelled) return;

      const tv = all.filter((x) => x.mediaType === "tv");
      const mv = all.filter((x) => x.mediaType === "movie");

      setShows(tv);
      setMovies(mv);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const countCompletedShows = shows.filter((s) => s.completed).length;
  const countInProgressShows = shows.length - countCompletedShows;

  const sortByDateDesc = (arr) =>
    [...arr].sort(
      (a, b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0)
    );

  const latestShow = sortByDateDesc(shows)[0];
  const latestMovie = sortByDateDesc(movies)[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 pb-20 text-yellow-400">
        Loading overview...
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-20">
      <h1 className="mb-4 text-2xl font-bold text-yellow-400">
        Overview
      </h1>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="p-3 border border-gray-700 rounded-lg bg-gray-900/80">
          <div className="text-xs tracking-wide text-gray-400 uppercase">
            TV Shows
          </div>
          <div className="mt-1 text-2xl font-bold text-yellow-400">
            {shows.length}
          </div>
          <div className="mt-1 text-xs text-gray-400">
            {countInProgressShows} in progress · {countCompletedShows} done
          </div>
        </div>

        <div className="p-3 border border-gray-700 rounded-lg bg-gray-900/80">
          <div className="text-xs tracking-wide text-gray-400 uppercase">
            Movies
          </div>
          <div className="mt-1 text-2xl font-bold text-yellow-400">
            {movies.length}
          </div>
          <div className="mt-1 text-xs text-gray-400">
            All movies in this list are watched
          </div>
        </div>
      </div>

      {/* Latest added */}
      <div className="space-y-4">
        <div className="p-3 border border-gray-700 rounded-lg bg-gray-900/80">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm font-semibold text-yellow-400">
              Latest added show
            </div>
            {latestShow && latestShow.dateAdded && (
              <div className="text-xs text-gray-500">
                {new Date(latestShow.dateAdded).toLocaleDateString()}
              </div>
            )}
          </div>
          {latestShow ? (
            <>
              <div className="text-sm text-white">
                {(latestShow.title || latestShow.name || "").toUpperCase()}
              </div>
              {latestShow.number_of_seasons && (
                <div className="text-xs text-gray-400 mt-0.5">
                  {latestShow.number_of_seasons} season
                  {latestShow.number_of_seasons > 1 ? "s" : ""}
                </div>
              )}
              <div className="mt-1 text-xs text-gray-400">
                Status:{" "}
                {latestShow.completed ? (
                  <span className="text-green-400">Done</span>
                ) : (
                  <span className="text-yellow-400">In progress</span>
                )}
              </div>
            </>
          ) : (
            <div className="text-xs text-gray-500">
              No shows in your list yet.
            </div>
          )}
        </div>

        <div className="p-3 border border-gray-700 rounded-lg bg-gray-900/80">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm font-semibold text-yellow-400">
              Latest added movie
            </div>
            {latestMovie && latestMovie.dateAdded && (
              <div className="text-xs text-gray-500">
                {new Date(latestMovie.dateAdded).toLocaleDateString()}
              </div>
            )}
          </div>
          {latestMovie ? (
            <>
              <div className="text-sm text-white">
                {(latestMovie.title || "").toUpperCase()}
              </div>
              {latestMovie.release_date && (
                <div className="text-xs text-gray-400 mt-0.5">
                  Released:{" "}
                  {new Date(latestMovie.release_date).getFullYear()}
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-gray-500">
              No movies in your list yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OverviewPage;