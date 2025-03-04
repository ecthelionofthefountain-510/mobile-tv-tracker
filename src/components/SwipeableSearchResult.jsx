import React, { useState, useRef } from "react";
import { IMAGE_BASE_URL } from "../config";

const SwipeableSearchResult = ({ 
  item, 
  onFavorite, 
  onAddToWatched, 
  onItemClick,
  isFavorited,
  isWatched 
}) => {
  const [startX, setStartX] = useState(null);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [actionTriggered, setActionTriggered] = useState(false);
  const cardRef = useRef(null);
  
  // Threshold for how far user needs to swipe to trigger action
  const SWIPE_THRESHOLD = 100;
  
  // Handle touch start
  const handleTouchStart = (e) => {
    setStartX(e.touches[0].clientX);
    setActionTriggered(false);
  };
  
  // Handle touch move
  const handleTouchMove = (e) => {
    if (startX === null) return;
    
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    
    // Limit how far the card can be swiped
    const limitedDiff = Math.max(Math.min(diff, 150), -150);
    
    setCurrentOffset(limitedDiff);
    
    // Change opacity of action indicators based on swipe direction
    const card = cardRef.current;
    if (card) {
      const favoriteIndicator = card.querySelector('.swipe-indicator-right');
      const watchedIndicator = card.querySelector('.swipe-indicator-left');
      
      if (limitedDiff > 0 && favoriteIndicator) {
        // Swiping right (favorite)
        const opacity = Math.min(limitedDiff / 100, 1);
        favoriteIndicator.style.opacity = opacity;
        if (watchedIndicator) watchedIndicator.style.opacity = 0;
      } else if (limitedDiff < 0 && watchedIndicator) {
        // Swiping left (watched)
        const opacity = Math.min(Math.abs(limitedDiff) / 100, 1);
        watchedIndicator.style.opacity = opacity;
        if (favoriteIndicator) favoriteIndicator.style.opacity = 0;
      } else {
        // Reset
        if (favoriteIndicator) favoriteIndicator.style.opacity = 0;
        if (watchedIndicator) watchedIndicator.style.opacity = 0;
      }
    }
  };
  
  // Handle touch end
  const handleTouchEnd = () => {
    if (startX === null) return;
    
    const swipeDistance = currentOffset;
    
    // Check if swipe was far enough to trigger action
    if (swipeDistance > SWIPE_THRESHOLD && !actionTriggered) {
      // Swiped right - add to favorites
      onFavorite(item);
      setActionTriggered(true);
    } else if (swipeDistance < -SWIPE_THRESHOLD && !actionTriggered) {
      // Swiped left - add to watched
      onAddToWatched(item);
      setActionTriggered(true);
    }
    
    // Reset state and return card to original position
    setStartX(null);
    setCurrentOffset(0);
    
    // Reset opacity of indicators
    const card = cardRef.current;
    if (card) {
      const favoriteIndicator = card.querySelector('.swipe-indicator-right');
      const watchedIndicator = card.querySelector('.swipe-indicator-left');
      
      if (favoriteIndicator) favoriteIndicator.style.opacity = 0;
      if (watchedIndicator) watchedIndicator.style.opacity = 0;
    }
  };
  
  return (
    <div 
      ref={cardRef}
      className="mb-4 relative bg-gray-900 rounded-lg overflow-hidden border border-gray-700 cursor-pointer touch-manipulation"
      style={{
        transform: `translateX(${currentOffset}px)`,
        transition: startX === null ? 'transform 0.3s ease-out' : 'none'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={() => onItemClick(item)}
    >
      {/* Left indicator (Watched) */}
      <div className="swipe-indicator-left absolute top-0 bottom-0 left-0 flex items-center justify-center bg-green-800/90 text-white w-16 opacity-0 z-10">
        <div className="flex flex-col items-center">
          <span className="text-lg">✓</span>
          <span className="text-xs">WATCHED</span>
        </div>
      </div>
      
      {/* Right indicator (Favorite) */}
      <div className="swipe-indicator-right absolute top-0 bottom-0 right-0 flex items-center justify-center bg-yellow-700/90 text-white w-16 opacity-0 z-10">
        <div className="flex flex-col items-center">
          <span className="text-lg">★</span>
          <span className="text-xs">FAVORITE</span>
        </div>
      </div>
      
      <div className="flex relative z-0">
        {/* Poster */}
        <div className="w-16 sm:w-20 flex-shrink-0 p-1">
          {item.poster_path ? (
            <img 
              src={`${IMAGE_BASE_URL}${item.poster_path}`} 
              alt={item.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-600">
              No Image
            </div>
          )}
        </div>
        
        {/* Content section */}
        <div className="flex-1 pl-2 pr-2 py-1.5 flex flex-col">
          <h3 className="text-base sm:text-lg font-bold text-yellow-500">
            {item.title?.toUpperCase()}
          </h3>
          
          <div className="text-gray-400 text-xs mt-0.5">
            <div>
              {item.mediaType === 'tv' ? 'TV SHOW' : 'MOVIE'}
              {item.mediaType === 'tv' && item.number_of_seasons && (
                <span> • {item.number_of_seasons} {item.number_of_seasons === 1 ? 'SEASON' : 'SEASONS'}</span>
              )}
            </div>
            {item.release_date && (
              <div>
                RELEASED: {new Date(item.release_date).getFullYear()}
              </div>
            )}
            {item.first_air_date && (
              <div>
                FIRST AIRED: {new Date(item.first_air_date).getFullYear()}
              </div>
            )}
          </div>
          
          {/* Buttons */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFavorite(item);
              }}
              className={`py-1 rounded font-medium text-xs text-center ${
                isFavorited 
                  ? "bg-yellow-600 text-white" 
                  : "bg-gray-800 text-yellow-500 border border-yellow-600/40"
              }`}
            >
              <span className="flex justify-center items-center">
                <span className="mr-1">{isFavorited ? "★" : "☆"}</span>
                <span>{isFavorited ? "FAVORITED" : "FAVORITE"}</span>
              </span>
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToWatched(item);
              }}
              className={`py-1 rounded font-medium text-xs text-center ${
                isWatched
                  ? "bg-green-700 text-white" 
                  : "bg-green-800 text-green-400"
              }`}
            >
              <span className="flex justify-center items-center">
                <span className="mr-1">{isWatched ? "✓" : ""}</span>
                <span>{isWatched ? "WATCHED" : "ADD TO WATCHED"}</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwipeableSearchResult;