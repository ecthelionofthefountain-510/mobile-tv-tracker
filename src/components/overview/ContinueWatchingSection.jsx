import React from "react";
import { IMAGE_BASE_URL } from "../../config";
import { FaTv } from "react-icons/fa";

const ContinueWatchingSection = ({ items, onOpen }) => {
  if (!items.length) return null;

  return (
    <div className="p-4 mb-6 app-panel">
      <h2 className="mb-2 text-lg font-semibold text-gray-100">
        Continue watching
      </h2>
      <div className="app-stagger-list space-y-2">
        {items.map((item) => {
          const poster = item.poster_path ?? item.posterPath ?? null;
          const total =
            typeof item.totalEpisodes === "number" && item.totalEpisodes > 0
              ? item.totalEpisodes
              : null;
          const ratio =
            total != null
              ? Math.min(1, Math.max(0, (item.watchedEpisodes || 0) / total))
              : null;

          return (
            <button
              key={`continue:${item.id}`}
              type="button"
              onClick={() => onOpen(item)}
              className="app-card app-card-hover app-stagger-item flex w-full items-center gap-3 p-3 text-left"
            >
              {poster ? (
                <img
                  src={`${IMAGE_BASE_URL}${poster}`}
                  alt=""
                  loading="lazy"
                  className="h-16 w-11 flex-shrink-0 rounded-md bg-gray-800 object-cover"
                />
              ) : (
                <div className="flex h-16 w-11 flex-shrink-0 items-center justify-center rounded-md bg-gray-800 text-gray-600">
                  <FaTv aria-hidden="true" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="truncate text-sm font-semibold text-gray-100">
                    {item.title || item.name}
                  </div>
                  <div className="flex-shrink-0 text-[11px] font-semibold uppercase tracking-wide text-yellow-300">
                    Resume
                  </div>
                </div>

                <div className="mt-1 text-xs text-gray-300">
                  {item.progressLabel}
                </div>

                {ratio != null && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-yellow-400"
                      style={{ width: `${Math.round(ratio * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ContinueWatchingSection;
