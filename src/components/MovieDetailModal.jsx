import React, { useEffect, useId, useRef, useState } from "react";
import { API_KEY, TMDB_BASE_URL, IMAGE_BASE_URL } from "../config";
import { cachedFetchJson } from "../utils/tmdbCache";
import { useModalA11y } from "../hooks/useModalA11y";

const MovieDetailModal = ({
  movie,
  onClose,
  showActions = false,
  isWatched = false,
  isFavorited = false,
  onAddToWatched,
  onAddToFavorites,
}) => {
  // Swipe to close
  const touchStartY = useRef(null);

  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const titleId = useId();

  const isOpen = !!movie;
  const { handleDialogKeyDown } = useModalA11y({
    enabled: isOpen,
    dialogRef,
    initialFocusRef: closeButtonRef,
    onClose,
  });

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartY.current === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    if (touchEndY - touchStartY.current > 80) {
      // 80px swipe down
      onClose();
    }
    touchStartY.current = null;
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const displayMovie = movie;

  const [providers, setProviders] = useState(null);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [providersError, setProvidersError] = useState("");

  const pickProviders = (results) => {
    if (!results || typeof results !== "object") return null;
    return (
      results.SE ||
      results.US ||
      results.GB ||
      results.DE ||
      Object.values(results).find((v) => v && typeof v === "object") ||
      null
    );
  };

  const uniqProviders = (list) => {
    const arr = Array.isArray(list) ? list : [];
    const seen = new Set();
    const out = [];
    for (const p of arr) {
      const id = p?.provider_id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(p);
    }
    return out;
  };

  useEffect(() => {
    if (!displayMovie?.id) return;
    let cancelled = false;

    (async () => {
      setProvidersLoading(true);
      setProvidersError("");
      try {
        const data = await cachedFetchJson(
          `${TMDB_BASE_URL}/movie/${displayMovie.id}/watch/providers?api_key=${API_KEY}`,
          { ttlMs: 24 * 60 * 60 * 1000 },
        );
        if (cancelled) return;
        const picked = pickProviders(data?.results);
        setProviders(picked);
      } catch (err) {
        console.error("Failed to load watch providers", err);
        if (!cancelled) {
          setProviders(null);
          setProvidersError("Could not load streaming providers.");
        }
      } finally {
        if (!cancelled) setProvidersLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayMovie?.id]);

  if (!movie) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 sm:items-center sm:p-4"
      onClick={handleBackdropClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        ref={dialogRef}
        className="relative app-panel-solid w-full max-w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto hide-scrollbar rounded-t-3xl sm:rounded-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleDialogKeyDown}
        tabIndex={-1}
      >
        <div className="relative">
          {displayMovie.backdrop_path ? (
            <div className="relative h-52 sm:h-60 overflow-hidden">
              <img
                src={`${IMAGE_BASE_URL}${displayMovie.backdrop_path}`}
                alt={`${displayMovie.title} backdrop`}
                className="object-cover w-full h-full"
              />
            </div>
          ) : (
            <div className="h-28 sm:h-36 bg-gray-950/40" />
          )}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/80 to-gray-950/10" />

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-20 inline-flex items-center justify-center rounded-xl border border-white/10 bg-black/30 p-2 text-gray-200 backdrop-blur-md transition-colors hover:bg-black/45 hover:text-yellow-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <div className="relative z-10 px-5 pb-4 pt-10 sm:px-6 sm:pt-12">
            <div className="flex items-end gap-4">
              <img
                src={
                  displayMovie.poster_path
                    ? `${IMAGE_BASE_URL}${displayMovie.poster_path}`
                    : "/no-profile.png"
                }
                alt={displayMovie.title}
                className="w-20 sm:w-24 md:w-28 flex-none object-cover app-poster bg-gray-900"
              />

              <div className="min-w-0 flex-1">
                <h2
                  id={titleId}
                  className="mb-1 text-2xl sm:text-3xl font-bold text-yellow-300 truncate"
                >
                  {displayMovie.title}
                </h2>

                {displayMovie.tagline && (
                  <div className="mb-2 text-sm sm:text-base italic text-yellow-200/90 line-clamp-2">
                    “{displayMovie.tagline}”
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {Number(displayMovie.vote_average) > 0 && (
                    <span className="app-badge">
                      ★ {Number(displayMovie.vote_average).toFixed(1)}
                    </span>
                  )}
                  {Number(displayMovie.vote_count) > 0 && (
                    <span className="app-pill">
                      {displayMovie.vote_count} votes
                    </span>
                  )}
                  {displayMovie.release_date && (
                    <span className="app-pill">
                      Released{" "}
                      {new Date(displayMovie.release_date).getFullYear()}
                    </span>
                  )}
                  {Number(displayMovie.runtime) > 0 && (
                    <span className="app-pill">{displayMovie.runtime} min</span>
                  )}
                </div>
              </div>
            </div>

            {displayMovie.genres?.length > 0 && (
              <div className="mt-3 text-sm text-gray-200/90">
                {displayMovie.genres.map((g) => g.name).join(", ")}
              </div>
            )}

            {showActions && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onAddToWatched?.(displayMovie)}
                  disabled={!onAddToWatched}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl transition-colors disabled:opacity-60
                    ${
                      isWatched
                        ? "app-button-success text-xs cursor-default"
                        : "app-button-primary text-xs"
                    }
                  `}
                >
                  {isWatched ? "Remove Watched" : "Add to Watched"}
                </button>

                <button
                  type="button"
                  onClick={() => onAddToFavorites?.(displayMovie)}
                  disabled={!onAddToFavorites}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl transition-colors disabled:opacity-60
                    app-button-ghost text-xs
                    ${isFavorited ? "border-yellow-500/25 text-yellow-200" : "text-gray-100"}
                  `}
                >
                  {isFavorited ? "Unfavorite" : "Favorite"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 sm:px-6 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5">
          {/* Overview */}
          {displayMovie.overview && (
            <div className="mb-4">
              <h3 className="mb-2 text-lg font-semibold text-yellow-300">
                Overview
              </h3>
              <p className="text-gray-300">{displayMovie.overview}</p>
            </div>
          )}

          {/* Where to watch */}
          {(providersLoading || providersError || providers) && (
            <div className="mb-4">
              <div className="app-card p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-yellow-300">
                    Where to watch
                  </h3>

                  {providers?.link && (
                    <a
                      href={providers.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="app-button-ghost px-3 py-1 text-xs"
                    >
                      View on TMDB
                    </a>
                  )}
                </div>

                {providersLoading && (
                  <div className="text-sm text-gray-400">Loading…</div>
                )}

                {!providersLoading && providersError && (
                  <div className="text-sm text-red-300">{providersError}</div>
                )}

                {!providersLoading && !providersError && providers && (
                  <div className="space-y-3">
                    {uniqProviders(providers.flatrate).length > 0 && (
                      <div>
                        <div className="mb-2">
                          <span className="app-badge">Stream</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {uniqProviders(providers.flatrate).map((p) => (
                            <div
                              key={p.provider_id}
                              className="app-pill w-full flex items-center gap-2"
                            >
                              {p.logo_path && (
                                <img
                                  src={`https://image.tmdb.org/t/p/w45${p.logo_path}`}
                                  alt={p.provider_name}
                                  className="h-5 w-5 rounded-md"
                                  loading="lazy"
                                />
                              )}
                              <span className="min-w-0 text-xs text-gray-200 truncate">
                                {p.provider_name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* 
                  {uniqProviders(providers.rent).length > 0 && (
                    <div>
                      <div className="mb-1 text-xs font-semibold tracking-wide text-gray-400 uppercase">
                        Rent
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {uniqProviders(providers.rent).map((p) => (
                          <div
                            key={p.provider_id}
                            className="app-pill flex items-center gap-2"
                          >
                            {p.logo_path && (
                              <img
                                src={`https://image.tmdb.org/t/p/w45${p.logo_path}`}
                                alt={p.provider_name}
                                className="w-5 h-5 rounded"
                                loading="lazy"
                              />
                            )}
                            <span className="text-xs text-gray-200">
                              {p.provider_name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {uniqProviders(providers.buy).length > 0 && (
                    <div>
                      <div className="mb-1 text-xs font-semibold tracking-wide text-gray-400 uppercase">
                        Buy
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {uniqProviders(providers.buy).map((p) => (
                          <div
                            key={p.provider_id}
                            className="app-pill flex items-center gap-2"
                          >
                            {p.logo_path && (
                              <img
                                src={`https://image.tmdb.org/t/p/w45${p.logo_path}`}
                                alt={p.provider_name}
                                className="w-5 h-5 rounded"
                                loading="lazy"
                              />
                            )}
                            <span className="text-xs text-gray-200">
                              {p.provider_name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )} */}

                    {uniqProviders(providers.flatrate).length === 0 &&
                      !providers?.link && (
                        <div className="text-sm text-gray-400">
                          No streaming providers found.
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cast */}
          {displayMovie.credits && displayMovie.credits.cast && (
            <div className="mb-4">
              <h3 className="mb-2 text-lg font-semibold text-yellow-300">
                Cast
              </h3>
              <div className="grid grid-cols-5 gap-4 py-2 sm:gap-6 md:gap-4 lg:gap-6">
                {displayMovie.credits.cast.slice(0, 10).map((actor) => (
                  <div key={actor.id} className="flex flex-col items-center">
                    <div className="relative flex-shrink-0 w-16 h-16 mb-2 overflow-hidden rounded-full border border-white/10 bg-gray-950/40">
                      <img
                        src={
                          actor.profile_path
                            ? `${IMAGE_BASE_URL}${actor.profile_path}`
                            : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23374151'/%3E%3Cpath d='M32 20c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 20c-8.8 0-16 7.2-16 16v8h32v-8c0-8.8-7.2-16-16-16z' fill='%236B7280'/%3E%3C/svg%3E"
                        }
                        alt={actor.name}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <span className="max-w-full text-xs leading-tight text-center text-gray-300 break-words">
                      {actor.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trailer */}
          {displayMovie.videos &&
            displayMovie.videos.results &&
            displayMovie.videos.results.length > 0 && (
              <div className="mb-4">
                <h3 className="mb-2 text-lg font-semibold text-yellow-300">
                  Trailer
                </h3>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <a
                    href={`https://www.youtube.com/watch?v=${displayMovie.videos.results[0].key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="app-button-primary w-full px-6 py-2 text-base sm:w-auto"
                  >
                    ▶️ Watch trailer
                  </a>
                  <button
                    type="button"
                    onClick={onClose}
                    className="app-button-ghost w-full px-6 py-2 text-base sm:w-auto"
                    style={{ minWidth: 80 }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
        </div>

        <div className="pointer-events-none sticky bottom-0 left-0 z-30 h-16 w-full bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent" />
      </div>
    </div>
  );
};

export default MovieDetailModal;
