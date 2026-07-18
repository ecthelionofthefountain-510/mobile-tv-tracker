import React from "react";
import { useNavigate } from "react-router-dom";
import { FaTv, FaFilm } from "react-icons/fa";
import ShowsList from "./ShowsList";
import MoviesList from "./MoviesList";

// Segmented toggle that swaps between the (unchanged) Shows and Movies lists.
// Kept as separate routes (/shows, /movies) so the Android widget deep-link
// /#/shows?show=<id> still mounts ShowsList and its search-param handling.
const TABS = [
  { type: "tv", to: "/shows", label: "Shows", icon: <FaTv /> },
  { type: "movie", to: "/movies", label: "Movies", icon: <FaFilm /> },
];

export default function WatchedPage({ initialType = "tv" }) {
  const navigate = useNavigate();
  const activeType = initialType === "movie" ? "movie" : "tv";

  return (
    <>
      <div className="w-full max-w-2xl px-4 pt-4 mx-auto">
        <div
          className="flex gap-1 p-1 rounded-full app-panel"
          role="tablist"
          aria-label="Filter watched by type"
        >
          {TABS.map((tab) => {
            const isActive = tab.type === activeType;
            return (
              <button
                key={tab.type}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  if (!isActive) navigate(tab.to);
                }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 ${
                  isActive
                    ? "bg-yellow-500 text-gray-950"
                    : "text-gray-300 hover:bg-white/5"
                }`}
              >
                <span aria-hidden="true">{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      {activeType === "tv" ? <ShowsList /> : <MoviesList />}
    </>
  );
}
