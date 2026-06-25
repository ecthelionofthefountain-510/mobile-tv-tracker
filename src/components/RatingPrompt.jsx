import React from "react";

// Bottom-floating "rate this show" prompt with 5 stars + a Later button.
// Shared by ShowsList (after completion is detected) and ShowDetail (right
// after the completion celebration).
export default function RatingPrompt({ title, onRate, onLater }) {
  return (
    <div className="fixed left-0 right-0 z-50 flex justify-center px-4 pointer-events-none bottom-40">
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
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onRate?.(star)}
              className="text-[30px] leading-none text-yellow-300 transition-colors hover:text-yellow-200"
              aria-label={`Rate show ${star} of 5`}
            >
              ★
            </button>
          ))}
        </div>
        <div className="flex justify-center mt-3">
          <button
            type="button"
            onClick={onLater}
            className="px-4 py-1.5 text-xs font-semibold leading-none text-gray-200 transition-colors border rounded-lg border-white/15 bg-white/5 hover:bg-white/10"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
