import React, { useState } from "react";
import RatingInput from "./RatingInput";

// Bottom-floating "rate this show" prompt: a 0–10 slider plus an optional note.
// Shared by ShowsList (after completion is detected) and ShowDetail (right
// after the completion celebration). Calls onRate(rating, comment).
export default function RatingPrompt({
  title,
  initialRating = 0,
  initialComment = "",
  onRate,
  onLater,
}) {
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);

  return (
    <div className="fixed left-0 right-0 z-50 flex justify-center px-4 pointer-events-none bottom-36">
      <div
        className="w-full max-w-lg p-4 border shadow-2xl pointer-events-auto app-toast-pop flex flex-col rounded-2xl border-yellow-300/25 bg-gray-900/95 backdrop-blur"
        style={{
          boxShadow:
            "0 14px 34px rgba(0,0,0,0.55),inset 0 0 0 1px rgba(255,255,255,0.05)",
        }}
      >
        <p className="text-sm font-semibold leading-snug tracking-normal text-center text-yellow-100 normal-case truncate">
          {title || "Rate this show"}
        </p>

        <div className="mt-3">
          <RatingInput value={rating} onChange={setRating} idBase="prompt" />
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a note (optional) — e.g. a quick verdict…"
          rows={2}
          className="app-input mt-3 w-full resize-none text-sm"
        />

        <div className="flex justify-center gap-2 mt-3">
          <button
            type="button"
            onClick={onLater}
            className="px-4 py-1.5 text-xs font-semibold leading-none text-gray-200 transition-colors border rounded-lg border-white/15 bg-white/5 hover:bg-white/10"
          >
            Later
          </button>
          <button
            type="button"
            onClick={() => onRate?.(rating, comment)}
            className="app-button-primary px-4 py-1.5 text-xs"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
