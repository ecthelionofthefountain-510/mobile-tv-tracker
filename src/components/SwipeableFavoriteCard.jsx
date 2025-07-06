import { useSwipeable } from 'react-swipeable';
import { useState, useRef } from 'react';
import FavoriteCard from './FavoriteCard';

const SWIPE_THRESHOLD = 120;

const SwipeableFavoriteCard = ({
  item,
  onSelect,
  onRemove,
  onAddToWatched,
  alreadyWatched // Lägg till denna prop
}) => {
  const [deltaX, setDeltaX] = useState(0);
  const [animating, setAnimating] = useState(false);
  const justSwiped = useRef(false);

  const handlers = useSwipeable({
    onSwiping: (e) => setDeltaX(e.deltaX),
    onSwipedLeft: (e) => {
      if (Math.abs(e.deltaX) > SWIPE_THRESHOLD && onAddToWatched) {
        justSwiped.current = true;
        setDeltaX(-window.innerWidth);
        setAnimating(true);
        setTimeout(() => {
          setDeltaX(0);
          setAnimating(false);
          onAddToWatched(item);
        }, 200);
      } else {
        setDeltaX(0);
      }
    },
    onSwipedRight: (e) => {
      if (e.deltaX > SWIPE_THRESHOLD && onRemove) {
        justSwiped.current = true;
        setDeltaX(window.innerWidth);
        setAnimating(true);
        setTimeout(() => {
          setDeltaX(0);
          setAnimating(false);
          onRemove(item.id);
        }, 200);
      } else {
        setDeltaX(0);
      }
    },
    onSwiped: () => {
      setTimeout(() => { justSwiped.current = false; }, 400);
      if (!animating) setDeltaX(0);
    },
    axis: "x", // Endast horisontell swipe
    preventScrollOnSwipe: true,
    trackTouch: true,
    trackMouse: true,
    delta: 30, // Kräver större rörelse för att trigga swipe
  });

  const handleSafeSelect = () => {
    if (justSwiped.current || animating) return;
    onSelect(item);
  };

  let bg = '';
  let icon = null;
  if (deltaX < -10) {
    bg = 'bg-green-600';
    icon = (
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
        <rect width="24" height="24" rx="12" fill="#fff" fillOpacity="0.1"/>
        <path d="M6 13l4 4 8-8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    );
  } else if (deltaX > 10) {
    bg = 'bg-red-600';
    icon = (
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
        <rect width="24" height="24" rx="12" fill="#fff" fillOpacity="0.1"/>
        <path d="M9 10v6M12 10v6M15 10v6M4 7h16M10 7V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    );
  }

  return (
    <div className="relative" style={{ minHeight: 72 }}>
      {/* ...bakgrund... */}
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
        <div onClick={() => onSelect(item)}>
          <FavoriteCard
            item={item}
            onSelect={handleSafeSelect}
            onRemove={onRemove}
            onAddToWatched={onAddToWatched}
            alreadyWatched={alreadyWatched} // Skicka vidare hit!
            showButtons={false}
          />
        </div>
      </div>
      {(deltaX !== 0 || animating) && (
        <div className={`absolute inset-0 z-0 flex items-center ${deltaX < 0 ? 'justify-end pr-6' : 'justify-start pl-6'} ${bg} rounded-lg transition-all`}>
          {icon}
        </div>
      )}
    </div>
  );
};

export default SwipeableFavoriteCard;