import React from "react";

const ContinueWatchingSection = ({ items, onOpen }) => {
  if (!items.length) return null;

  return (
    <div className="p-4 mb-6 app-panel">
      <h2 className="mb-2 text-lg font-semibold text-gray-100">
        Continue watching
      </h2>
      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={`continue:${item.id}`}
            type="button"
            onClick={() => onOpen(item)}
            className="w-full p-3 text-left app-card app-card-hover"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-gray-100">
                {item.title || item.name}
              </div>
              <div className="text-[11px] font-semibold tracking-wide text-yellow-300 uppercase">
                Resume
              </div>
            </div>
            <div className="mt-1 text-xs text-gray-300">
              {item.progressLabel}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ContinueWatchingSection;
