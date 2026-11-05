import React from "react";
import { normalizeRating10, formatRating10, RATING_MAX } from "../utils/rating";

// A 0–10 rating slider (one decimal) with a live readout, ±0.1 fine-tuning and
// a clear button. `value` is a 0–10 number (or null/undefined for unrated);
// `onChange` receives a normalized number (0 = cleared).
export default function RatingInput({ value, onChange, idBase = "rating" }) {
  const current = normalizeRating10(value) ?? 0;

  const set = (next) => onChange?.(normalizeRating10(next) ?? 0);
  const nudge = (delta) =>
    onChange?.(normalizeRating10(Math.min(RATING_MAX, Math.max(0, current + delta))) ?? 0);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={`${idBase}-slider`}
          className="text-xs font-semibold uppercase tracking-wide text-gray-400"
        >
          Your rating
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => nudge(-0.1)}
            disabled={current <= 0}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm text-gray-200 disabled:opacity-40"
            aria-label="Decrease rating by 0.1"
          >
            −
          </button>
          <div className="min-w-[4.5rem] text-center text-sm font-bold text-yellow-300">
            {current > 0 ? `${formatRating10(current)} / ${RATING_MAX}` : "—"}
          </div>
          <button
            type="button"
            onClick={() => nudge(0.1)}
            disabled={current >= RATING_MAX}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm text-gray-200 disabled:opacity-40"
            aria-label="Increase rating by 0.1"
          >
            +
          </button>
        </div>
      </div>

      <input
        id={`${idBase}-slider`}
        type="range"
        min="0"
        max={RATING_MAX}
        step="0.1"
        value={current}
        onChange={(e) => set(e.target.value)}
        className="mt-3 w-full accent-yellow-400"
        aria-valuetext={current > 0 ? `${formatRating10(current)} of ${RATING_MAX}` : "No rating"}
      />

      {current > 0 && (
        <div className="mt-1 text-right">
          <button
            type="button"
            onClick={() => set(0)}
            className="text-xs text-gray-400 transition-colors hover:text-gray-200"
          >
            Clear rating
          </button>
        </div>
      )}
    </div>
  );
}
