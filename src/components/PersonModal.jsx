import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { API_KEY, TMDB_BASE_URL, IMAGE_BASE_URL } from "../config";
import { cachedFetchJson } from "../utils/tmdbCache";
import { useModalA11y } from "../hooks/useModalA11y";

const PROFILE_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'%3E%3Crect width='96' height='96' fill='%23374151'/%3E%3Cpath d='M48 30c-6.6 0-12 5.4-12 12s5.4 12 12 12 12-5.4 12-12-5.4-12-12-12zm0 30c-13.2 0-24 10.8-24 24v12h48V84c0-13.2-10.8-24-24-24z' fill='%236B7280'/%3E%3C/svg%3E";

const POSTER_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='112' height='168' viewBox='0 0 112 168'%3E%3Crect width='112' height='168' fill='%23374151'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='0.3em' fill='%236B7280' font-family='Arial' font-size='12'%3ENo Image%3C/text%3E%3C/svg%3E";

// Merge cast + crew credits into one deduped, sorted list of titles.
const buildCredits = (combined) => {
  const cast = Array.isArray(combined?.cast) ? combined.cast : [];
  const crew = Array.isArray(combined?.crew) ? combined.crew : [];
  const byKey = new Map();

  const add = (entry, role) => {
    const mediaType = entry.media_type === "tv" ? "tv" : "movie";
    const key = `${mediaType}-${entry.id}`;
    const existing = byKey.get(key);
    if (existing) {
      // Keep acting roles / merge job labels so one title shows once.
      if (role && !existing.roles.includes(role)) existing.roles.push(role);
      if ((entry.popularity ?? 0) > (existing.popularity ?? 0)) {
        existing.popularity = entry.popularity;
      }
      return;
    }
    byKey.set(key, {
      key,
      id: entry.id,
      mediaType,
      title: entry.title || entry.name || "Untitled",
      poster_path: entry.poster_path || null,
      date: entry.release_date || entry.first_air_date || "",
      vote_average: entry.vote_average,
      popularity: entry.popularity ?? 0,
      overview: entry.overview || "",
      genre_ids: entry.genre_ids || [],
      roles: role ? [role] : [],
    });
  };

  cast.forEach((c) => add(c, c.character ? String(c.character).trim() : ""));
  crew.forEach((c) => add(c, c.job ? String(c.job).trim() : ""));

  // Talk show / news / self-appearances are noisy in a filmography; keep them
  // but rank real roles first.
  const TALK_NEWS_GENRES = new Set([10767, 10763, 10764]);
  const isSelfAppearance = (entry) => {
    const roles = entry.roles.filter(Boolean);
    const onlySelf =
      roles.length > 0 && roles.every((r) => /^self\b/i.test(r));
    const talkGenre = (entry.genre_ids || []).some((g) =>
      TALK_NEWS_GENRES.has(g),
    );
    return onlySelf || (roles.length === 0 && talkGenre);
  };

  const list = Array.from(byKey.values());
  list.sort((a, b) => {
    const selfA = isSelfAppearance(a) ? 1 : 0;
    const selfB = isSelfAppearance(b) ? 1 : 0;
    if (selfA !== selfB) return selfA - selfB; // real roles first
    const pop = (b.popularity ?? 0) - (a.popularity ?? 0);
    if (pop !== 0) return pop;
    return (b.date || "").localeCompare(a.date || "");
  });
  return list;
};

const yearOf = (date) => {
  if (!date) return null;
  const y = new Date(date).getFullYear();
  return Number.isFinite(y) ? y : null;
};

const PersonModal = ({ person, onClose, onSelectTitle }) => {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const titleId = useId();

  const personId = person?.id ?? null;
  const isOpen = !!personId;

  const { handleDialogKeyDown } = useModalA11y({
    enabled: isOpen,
    dialogRef,
    initialFocusRef: closeButtonRef,
    onClose,
  });

  // Swipe down to close when scrolled to top.
  const touchStartY = useRef(null);
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e) => {
    if (touchStartY.current === null) return;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartY.current = null;
    if (diffY > 80 && (dialogRef.current?.scrollTop ?? 1) === 0) onClose();
  };
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const [details, setDetails] = useState(null);
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!personId) return;
    let cancelled = false;
    setDetails(null);
    setCredits([]);
    setError("");
    setLoading(true);

    (async () => {
      try {
        const [info, combined] = await Promise.all([
          cachedFetchJson(
            `${TMDB_BASE_URL}/person/${personId}?api_key=${API_KEY}`,
            { ttlMs: 7 * 24 * 60 * 60 * 1000 },
          ),
          cachedFetchJson(
            `${TMDB_BASE_URL}/person/${personId}/combined_credits?api_key=${API_KEY}`,
            { ttlMs: 7 * 24 * 60 * 60 * 1000 },
          ),
        ]);
        if (cancelled) return;
        setDetails(info);
        setCredits(buildCredits(combined));
      } catch (err) {
        console.error("Failed to load person", err);
        if (!cancelled) setError("Could not load this person.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [personId]);

  const name = details?.name || person?.name || "";
  const profilePath = details?.profile_path ?? person?.profile_path ?? null;
  const knownFor = details?.known_for_department || "";

  const visibleCredits = useMemo(() => credits.slice(0, 40), [credits]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 sm:items-center sm:p-4"
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
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 inline-flex items-center justify-center rounded-xl border border-white/10 bg-black/40 p-2 text-gray-200 backdrop-blur-md transition-colors hover:bg-black/55 hover:text-yellow-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
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

        <div className="px-5 pb-4 pt-6 sm:px-6 sm:pt-8">
          <div className="flex items-center gap-4">
            <img
              src={
                profilePath
                  ? `${IMAGE_BASE_URL}${profilePath}`
                  : PROFILE_FALLBACK
              }
              alt={name}
              className="h-20 w-20 flex-none rounded-full border border-white/10 object-cover bg-gray-950/40 sm:h-24 sm:w-24"
            />
            <div className="min-w-0 flex-1">
              <h2
                id={titleId}
                className="text-2xl font-bold text-yellow-300 sm:text-3xl"
              >
                {name}
              </h2>
              {knownFor && (
                <div className="mt-1 text-sm text-gray-300">
                  Known for {knownFor}
                </div>
              )}
              {credits.length > 0 && (
                <div className="mt-0.5 text-xs text-gray-400">
                  {credits.length} title{credits.length === 1 ? "" : "s"}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 sm:px-6 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-1">
          <h3 className="mb-3 text-lg font-semibold text-yellow-300">
            Also appears in
          </h3>

          {loading && (
            <div className="py-6 text-sm text-gray-400">Loading filmography…</div>
          )}

          {!loading && error && (
            <div className="py-6 text-sm text-red-300">{error}</div>
          )}

          {!loading && !error && visibleCredits.length === 0 && (
            <div className="py-6 text-sm text-gray-400">
              No other titles found.
            </div>
          )}

          {!loading && !error && visibleCredits.length > 0 && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {visibleCredits.map((t) => {
                const year = yearOf(t.date);
                const role = t.roles.filter(Boolean)[0] || "";
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => onSelectTitle?.(t)}
                    className="group flex flex-col text-left focus-visible:outline-none"
                  >
                    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg border border-white/10 bg-gray-950/40 shadow-sm transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:border-yellow-400/50 group-focus-visible:border-yellow-400/70">
                      <img
                        src={
                          t.poster_path
                            ? `${IMAGE_BASE_URL}${t.poster_path}`
                            : POSTER_FALLBACK
                        }
                        alt={t.title}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute left-1 top-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-yellow-200 backdrop-blur-sm">
                        {t.mediaType === "tv" ? "TV" : "Film"}
                      </span>
                    </div>
                    <span className="mt-1.5 line-clamp-2 text-xs font-medium text-gray-100">
                      {t.title}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {year || "—"}
                      {role ? ` · ${role}` : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="pointer-events-none sticky bottom-0 left-0 z-30 h-16 w-full bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent" />
      </div>
    </div>
  );
};

export default PersonModal;
