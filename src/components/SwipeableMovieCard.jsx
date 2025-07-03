import { useSwipeable } from 'react-swipeable';
import { useState, useRef } from 'react';
import MovieCard from './MovieCard';


const iconTrash = (
  <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
    <rect width="24" height="24" rx="12" fill="#fff" fillOpacity="0.1"/>
    <path d="M9 10v6M12 10v6M15 10v6M4 7h16M10 7V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const iconCheck = (
  <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
    <rect width="24" height="24" rx="12" fill="#fff" fillOpacity="0.1"/>
    <path d="M6 13l4 4 8-8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const iconStar = (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24">
    <path stroke="#fff" strokeWidth="2" d="M12 17.27L18.18 21 16.54 13.97 22 9.24l-9.19-.63L12 2 11.18 8.64 2 9.24l5.46 4.73L5.82 21z"/>
  </svg>
);

const SWIPE_THRESHOLD = 120;

const SwipeableMovieCard = ({
  movie,
  onSelect,
  onRemove,
  onAddToWatched,
  onAddToFavorites
}) => {
  const [deltaX, setDeltaX] = useState(0);
  const [animating, setAnimating] = useState(false);
  const justSwiped = useRef(false);

  const handlers = useSwipeable({
    onSwiping: (e) => {
      setDeltaX(e.deltaX);
    },
    onSwipedLeft: (e) => {
      if (Math.abs(e.deltaX) > SWIPE_THRESHOLD && onRemove) {
        justSwiped.current = true;
        setDeltaX(-window.innerWidth);
        setAnimating(true);
        setTimeout(() => {
          setDeltaX(0);
          setAnimating(false);
          onRemove(movie.id);
        }, 200);
      } else {
        setDeltaX(0);
      }
    },
    onSwipedRight: (e) => {
      if (e.deltaX > SWIPE_THRESHOLD && onAddToFavorites) {
        justSwiped.current = true;
        setDeltaX(window.innerWidth);
        setAnimating(true);
        setTimeout(() => {
          setDeltaX(0);
          setAnimating(false);
          onAddToFavorites(movie);
        }, 200);
      } else {
        setDeltaX(0);
      }
    },
    onSwiped: () => {
      setTimeout(() => { justSwiped.current = false; }, 400);
      if (!animating) setDeltaX(0);
    },
    preventScrollOnSwipe: true,
    trackTouch: true,
    trackMouse: true,
    delta: 10,
  });

  // Bakgrundsfärg och ikon beroende på drag
  let bg = '';
  let icon = null;
  if (deltaX < -10) {
    bg = 'bg-red-600';
    icon = iconTrash;
  } else if (deltaX > 10) {
    bg = 'bg-yellow-400';
    icon = iconStar;
  }

  const handleSafeSelect = () => {
    if (justSwiped.current || animating) return;
    onSelect(movie);
  };

  return (
    <div className="relative" style={{ minHeight: 72 }}>
      {/* Bakgrund */}
      {(deltaX !== 0 || animating) && (
        <div className={`absolute inset-0 z-0 flex items-center ${deltaX < 0 ? 'justify-end pr-6' : 'justify-start pl-6'} ${bg} rounded-lg transition-all`}>
          {icon}
        </div>
      )}
      {/* Kortet */}
      <div
        {...handlers}
        className="relative z-10"
        style={{
          touchAction: 'pan-y',
          userSelect: 'none',
          transform: `translateX(${deltaX}px)`,
          transition: animating ? 'transform 0.2s' : deltaX === 0 ? 'transform 0.2s' : 'none',
          pointerEvents: animating ? 'none' : 'auto',
        }}
      >
        <MovieCard
          item={movie}
          onSelect={handleSafeSelect}
          onRemove={onRemove}
          showRemoveButton={false}
        />
      </div>
    </div>
  );
};

export default SwipeableMovieCard;