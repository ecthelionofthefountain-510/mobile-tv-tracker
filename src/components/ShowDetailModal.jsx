import React, { useEffect, useId, useRef, useState } from "react";
import { API_KEY, TMDB_BASE_URL, IMAGE_BASE_URL } from "../config";
import { cachedFetchJson } from "../utils/tmdbCache";

const ShowDetailModal = ({
  show,
  onClose,
  showActions = false,
  isWatched = false,
  isFavorited = false,
  onAddToWatched,
  onAddToFavorites,
}) => {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previouslyFocusedElementRef = useRef(null);
  const titleId = useId();

  // Simple touch handling for swipe down
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    e.currentTarget.startY = touch.clientY;
  };

  const handleTouchMove = (e) => {
    if (!e.currentTarget.startY) return;

    const touch = e.touches[0];
    const diffY = touch.clientY - e.currentTarget.startY;

    if (diffY > 50) {
      // Swipe down threshold
      onClose();
    }
  };

  if (!show) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const displayShow = show;

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
    if (!displayShow?.id) return;
    let cancelled = false;

    (async () => {
      setProvidersLoading(true);
      setProvidersError("");
      try {
        const data = await cachedFetchJson(
          `${TMDB_BASE_URL}/tv/${displayShow.id}/watch/providers?api_key=${API_KEY}`,
          { ttlMs: 24 * 60 * 60 * 1000 }
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
  }, [displayShow?.id]);

  const getFocusableElements = () => {
    const dialogEl = dialogRef.current;
    if (!dialogEl) return [];
    const elements = dialogEl.querySelectorAll(
      [
        "a[href]",
        "button:not([disabled])",
        "input:not([disabled])",
        "select:not([disabled])",
        "textarea:not([disabled])",
        "[tabindex]:not([tabindex='-1'])",
      ].join(",")
    );
    return Array.from(elements).filter(
      (el) =>
        !el.hasAttribute("disabled") &&
        el.getAttribute("aria-hidden") !== "true"
    );
  };

  const handleDialogKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key !== "Tab") return;

    const focusables = getFocusableElements();
    if (focusables.length === 0) {
      e.preventDefault();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (e.shiftKey) {
      if (active === first || !dialogRef.current?.contains(active)) {
        e.preventDefault();
        last.focus();
      }
      return;
    }

    if (active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  useEffect(() => {
    previouslyFocusedElementRef.current = document.activeElement;

    const focusInitial = () => {
      if (closeButtonRef.current) {
        closeButtonRef.current.focus({ preventScroll: true });
        return;
      }

      const focusables = getFocusableElements();
      if (focusables[0]?.focus) {
        focusables[0].focus({ preventScroll: true });
        return;
      }

      dialogRef.current?.focus?.({ preventScroll: true });
    };

    const raf = requestAnimationFrame(focusInitial);

    return () => {
      cancelAnimationFrame(raf);
      const prev = previouslyFocusedElementRef.current;
      try {
        prev?.focus?.({ preventScroll: true });
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 bg-black bg-opacity-75 sm:p-4"
      onClick={handleBackdropClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <div
        ref={dialogRef}
        className="relative bg-gray-800 rounded-none sm:rounded-lg shadow-xl w-full max-w-full sm:max-w-2xl max-h-[100vh] sm:max-h-[90vh] overflow-y-auto hide-scrollbar"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleDialogKeyDown}
        tabIndex={-1}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="absolute z-20 p-1 transition rounded top-2 right-2 hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          aria-label="Close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6 text-gray-300 hover:text-yellow-400"
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

        {displayShow.backdrop_path && (
          <div className="relative w-full h-40 overflow-hidden md:h-56">
            <img
              src={`${IMAGE_BASE_URL}${displayShow.backdrop_path}`}
              alt={`${displayShow.title || displayShow.name} backdrop`}
              className="object-cover w-full h-full"
            />
            <div className="absolute inset-0 z-0 bg-black bg-opacity-70"></div>
          </div>
        )}
        <div className="relative z-10 flex flex-col items-center mb-4 -mt-16">
          <img
            src={
              displayShow.poster_path
                ? `${IMAGE_BASE_URL}${displayShow.poster_path}`
                : "/no-profile.png"
            }
            alt={displayShow.title || displayShow.name}
            className="bg-gray-900 border-2 rounded-md shadow-lg w-28 sm:w-32 md:w-40 border-yellow-600/30"
          />

          {showActions && (
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => onAddToWatched?.(displayShow)}
                disabled={!onAddToWatched}
                className={`px-3 py-2 text-xs font-semibold rounded transition
                  ${
                    isWatched
                      ? "bg-green-600 text-white cursor-default"
                      : "bg-yellow-500 text-gray-900 hover:bg-yellow-600"
                  }
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
                `}
              >
                {isWatched ? "Remove Watched" : "Add to Watched"}
              </button>

              <button
                type="button"
                onClick={() => onAddToFavorites?.(displayShow)}
                disabled={!onAddToFavorites}
                className={`px-3 py-2 text-xs font-semibold rounded transition
                  ${
                    isFavorited
                      ? "bg-yellow-400 text-gray-900 cursor-default"
                      : "bg-gray-700 text-yellow-400 hover:bg-yellow-600 hover:text-gray-900"
                  }
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
                `}
              >
                {isFavorited ? "Unfavorite" : "Favorite"}
              </button>
            </div>
          )}
        </div>
        <div className="px-6 mt-2 text-left">
          <h2 id={titleId} className="mb-1 text-3xl font-bold text-yellow-400">
            {displayShow.title || displayShow.name}
          </h2>
          {displayShow.tagline && (
            <div className="mb-2 text-lg italic text-yellow-300">
              "{displayShow.tagline}"
            </div>
          )}
          <div className="flex items-center gap-2 mb-2">
            {displayShow.vote_average > 0 && (
              <span className="inline-block px-2 py-1 text-sm font-semibold text-white bg-yellow-600 rounded">
                {displayShow.vote_average.toFixed(1)} / 10
              </span>
            )}
            {displayShow.vote_count > 0 && (
              <span className="text-sm text-gray-200">
                {displayShow.vote_count} votes
              </span>
            )}
          </div>
          <div className="mb-2 text-base font-medium text-gray-200">
            {displayShow.genres &&
              displayShow.genres.map((g) => g.name).join(", ")}
          </div>
          {displayShow.first_air_date && (
            <div className="mb-1 text-sm text-gray-200">
              First aired: {new Date(displayShow.first_air_date).getFullYear()}
            </div>
          )}
          {displayShow.last_air_date && (
            <div className="mb-1 text-sm text-gray-200">
              Last aired: {new Date(displayShow.last_air_date).getFullYear()}
            </div>
          )}
          <div className="mb-1 text-sm text-gray-200">
            {displayShow.number_of_seasons}{" "}
            {displayShow.number_of_seasons === 1 ? "Season" : "Seasons"}
            {displayShow.number_of_episodes &&
              ` • ${displayShow.number_of_episodes} Episodes`}
          </div>
          {/* {displayShow.networks && displayShow.networks.length > 0 && (
            <div className="mt-2 text-xs text-gray-400">
              {displayShow.networks.length === 1
                ? "Original network: "
                : "Original networks: "}
              {displayShow.networks.map((n) => n.name).join(", ")}
            </div>
          )} */}
        </div>
        <div className="p-6 pt-3 pb-28">
          {displayShow.overview && (
            <div className="mb-4">
              <h3 className="mb-2 text-lg font-semibold text-yellow-400">
                Overview
              </h3>
              <p className="text-gray-300">{displayShow.overview}</p>
            </div>
          )}

          {/* Where to watch */}
          {(providersLoading || providersError || providers) && (
            <div className="mb-4">
              <h3 className="mb-2 text-lg font-semibold text-yellow-400">
                Where to watch
              </h3>

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
                      <div className="mb-1 text-xs font-semibold tracking-wide text-gray-400 uppercase">
                        Stream
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {uniqProviders(providers.flatrate).map((p) => (
                          <div
                            key={p.provider_id}
                            className="flex items-center gap-2 px-2 py-1 border border-gray-700 rounded bg-gray-900/60"
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

                  {/* {uniqProviders(providers.rent).length > 0 && (
                    <div>
                      <div className="mb-1 text-xs font-semibold tracking-wide text-gray-400 uppercase">
                        Rent
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {uniqProviders(providers.rent).map((p) => (
                          <div
                            key={p.provider_id}
                            className="flex items-center gap-2 px-2 py-1 border border-gray-700 rounded bg-gray-900/60"
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
                            className="flex items-center gap-2 px-2 py-1 border border-gray-700 rounded bg-gray-900/60"
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

                  {providers?.link && (
                    <a
                      href={providers.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-sm font-semibold text-yellow-400 underline underline-offset-4"
                    >
                      View on TMDB
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
          {displayShow.credits && displayShow.credits.cast && (
            <div className="mb-4">
              <h3 className="mb-2 text-lg font-semibold text-yellow-400">
                Cast
              </h3>
              <div className="grid grid-cols-5 gap-4 py-2 sm:gap-6 md:gap-4 lg:gap-6">
                {displayShow.credits.cast.slice(0, 10).map((actor) => (
                  <div key={actor.id} className="flex flex-col items-center">
                    <div className="relative flex-shrink-0 w-16 h-16 mb-2 overflow-hidden bg-gray-900 border-2 rounded-full border-yellow-600/30">
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
          {displayShow.videos &&
            displayShow.videos.results &&
            displayShow.videos.results.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-row items-center justify-between gap-3">
                  <a
                    href={`https://www.youtube.com/watch?v=${displayShow.videos.results[0].key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-2 text-base font-bold text-gray-900 transition bg-yellow-400 rounded-full shadow-lg hover:bg-yellow-500"
                  >
                    ▶️ Watch trailer
                  </a>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2 text-base font-bold text-gray-900 transition bg-yellow-400 rounded-full shadow-lg hover:bg-yellow-500"
                    style={{ minWidth: 80 }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
        </div>
        <div className="sticky bottom-0 left-0 z-30 flex justify-end w-full p-4 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent"></div>
      </div>
    </div>
  );
};

export default ShowDetailModal;
