import React, { useId, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { IMAGE_BASE_URL } from "../config";
import { useModalA11y } from "../hooks/useModalA11y";

const getTitle = (item) => item?.title || item?.name || "";
const getMediaType = (item) =>
  item?.mediaType || (item?.first_air_date ? "tv" : "movie");

const FavoritesTitlesModal = ({ title, items, onClose }) => {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const titleId = useId();
  const navigate = useNavigate();

  const { handleDialogKeyDown } = useModalA11y({
    enabled: true,
    dialogRef,
    initialFocusRef: closeButtonRef,
    onClose,
  });

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const safeItems = Array.isArray(items) ? items : [];

  const navigateToSearch = (item) => {
    const q = getTitle(item).trim();
    if (!q) return;
    const mt = getMediaType(item);
    const type = mt === "tv" ? "tv" : "movies";
    onClose?.();
    navigate(
      `/search?q=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}`,
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        className="relative app-panel-solid w-full max-w-full max-h-[92vh] overflow-y-auto hide-scrollbar rounded-t-3xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleDialogKeyDown}
        tabIndex={-1}
      >
        <div className="sticky top-0 z-10">
          <div className="relative overflow-hidden border-b border-white/10">
            <div
              className="h-24 bg-gradient-to-br from-gray-900 via-gray-950 to-black"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/70 to-transparent"
              aria-hidden="true"
            />

            <div
              className="absolute left-1/2 top-2 z-20 h-1.5 w-12 -translate-x-1/2 rounded-full bg-white/15"
              aria-hidden="true"
            />

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

            <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-4">
              <div className="flex items-end justify-between gap-3">
                <h2
                  id={titleId}
                  className="text-2xl font-bold text-yellow-300 truncate"
                >
                  {title}
                </h2>
                <span className="app-pill flex-none">{safeItems.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-5 pb-[calc(5rem+env(safe-area-inset-bottom))]">
          {safeItems.length === 0 ? (
            <div className="py-10 text-center">
              <div className="text-gray-400">No favorites yet.</div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {safeItems.map((item) => {
                const key = `${item?.mediaType || "x"}:${String(item?.id)}`;
                const label = getTitle(item);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => navigateToSearch(item)}
                    className="app-card app-card-hover overflow-hidden p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                    aria-label={label ? `Search for ${label}` : "Search"}
                    title={label || "Search"}
                  >
                    {item?.poster_path ? (
                      <img
                        src={`${IMAGE_BASE_URL}${item.poster_path}`}
                        alt={label || "Poster"}
                        className="w-full aspect-[2/3] object-cover app-poster bg-gray-900"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex aspect-[2/3] w-full items-center justify-center text-[10px] text-gray-500 bg-gray-950/30">
                        No image
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="pointer-events-none sticky bottom-0 left-0 z-10 h-12 w-full bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent" />
      </div>
    </div>
  );
};

export default FavoritesTitlesModal;
