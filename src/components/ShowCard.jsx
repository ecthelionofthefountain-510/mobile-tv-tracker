import React from "react";
import { IMAGE_BASE_URL } from "../config";

const ShowCard = ({ item, onShowInfo, onSelect }) => {
  return (
    <div
      className="relative mb-4 overflow-hidden transition-colors duration-200 border rounded-lg cursor-pointer bg-gray-800/90 border-yellow-900/30 hover:bg-gray-700/90"
      onClick={onSelect}
    >
      <div className="flex h-32 sm:h-40">
        <div
          className="flex-shrink-0 w-24 h-full sm:w-28"
          onClick={(e) => {
            e.stopPropagation(); // Hindra bubbling till hela kortet
            onShowInfo(item);
          }}
          style={{ cursor: "pointer" }}
        >
          <img
            src={`${IMAGE_BASE_URL}${item.poster_path}`}
            alt={item.title}
            className="object-cover w-full h-full border-r border-yellow-900/30"
          />
        </div>
        <div className="flex flex-col justify-between flex-1 p-3">
          <div>
            <h3 className="text-lg font-semibold text-yellow-400 sm:text-xl line-clamp-1">
              {item.title}
            </h3>
            <div className="mt-1 text-sm text-gray-400">
              TV Show
              {item.first_air_date && (
                <span className="ml-2">
                  • {new Date(item.first_air_date).getFullYear()}
                </span>
              )}
            </div>
            {item.number_of_seasons && (
              <div className="text-sm text-gray-400">
                {item.number_of_seasons}{" "}
                {item.number_of_seasons === 1 ? "Season" : "Seasons"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShowCard;