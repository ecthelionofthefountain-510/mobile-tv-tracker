import React from "react";

const UpcomingSection = ({
  upcoming,
  loading,
  error,
  onOpen,
  onSeeAll,
  relativeLabel,
  fmtDate,
  imageBaseUrl,
}) => {
  if (!loading && !error && upcoming.length === 0) return null;

  return (
    <div className="p-4 mb-6 app-panel">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 className="text-lg font-semibold text-gray-100">Upcoming</h2>
        <button
          type="button"
          onClick={onSeeAll}
          className="px-3 py-2 text-xs app-button-ghost"
        >
          See all
        </button>
      </div>

      {loading && <div className="py-1 text-sm text-gray-400">Loading…</div>}

      {!loading && error && (
        <div className="py-1 text-sm text-red-300">{error}</div>
      )}

      {!loading && !error && upcoming.length > 0 && (
        <div className="space-y-2">
          {upcoming.map((item) => {
            const rel = relativeLabel(item.air_date);
            const isSeasonPremiere = item.episode_number === 1;
            return (
              <button
                key={`upcoming:${item.id}`}
                type="button"
                onClick={() => onOpen(item)}
                className="flex w-full text-left app-card app-card-hover"
              >
                <div className="flex-shrink-0 w-16 sm:w-20">
                  {item.poster_path ? (
                    <img
                      src={`${imageBaseUrl}${item.poster_path}`}
                      alt={item.name}
                      className="object-cover w-full h-full"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-xs text-gray-500 bg-gray-800">
                      No image
                    </div>
                  )}
                </div>

                <div className="flex-1 px-3 py-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="text-sm font-bold text-yellow-400 sm:text-base">
                      {(item.name || "").toUpperCase()}
                    </div>
                    {rel && (
                      <div className="text-[10px] font-semibold tracking-wide text-gray-400">
                        {rel.toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="mt-0.5 text-xs text-gray-300">
                    {isSeasonPremiere ? "SEASON PREMIERE" : "NEXT EPISODE"}
                    {typeof item.season_number === "number" &&
                      typeof item.episode_number === "number" && (
                        <>
                          {" "}
                          • S{item.season_number}E{item.episode_number}
                        </>
                      )}
                    {item.air_date && <> • {fmtDate(item.air_date)}</>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UpcomingSection;
