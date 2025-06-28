import { useSwipeable } from 'react-swipeable';
import { useState } from 'react';
import ShowCard from './ShowCard';

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

const SWIPE_THRESHOLD = 120;

const SwipeableShowCard = ({ show, onSelect, onRemove, onAddToFavorites }) => {
  const [deltaX, setDeltaX] = useState(0);
  const [animating, setAnimating] = useState(false);

  const handlers = useSwipeable({
    onSwiping: (e) => {
      setDeltaX(e.deltaX);
    },
    onSwipedLeft: (e) => {
      if (Math.abs(e.deltaX) > SWIPE_THRESHOLD) {
        setDeltaX(-window.innerWidth);
        setAnimating(true);
        setTimeout(() => {
          setDeltaX(0);
          setAnimating(false);
          onAddToFavorites(show);
        }, 200);
      } else {
        setDeltaX(0);
      }
    },
    onSwipedRight: (e) => {
      if (e.deltaX > SWIPE_THRESHOLD) {
        setDeltaX(window.innerWidth);
        setAnimating(true);
        setTimeout(() => {
          setDeltaX(0);
          setAnimating(false);
          onRemove(show.id);
        }, 200);
      } else {
        setDeltaX(0);
      }
    },
    onSwiped: () => {
      if (!animating) setDeltaX(0);
    },
    preventScrollOnSwipe: true,
    trackTouch: true,
    trackMouse: true,
    delta: 10,
  });

  let bg = '';
  let icon = null;
  if (deltaX < -10) {
    bg = 'bg-green-600';
    icon = iconCheck;
  } else if (deltaX > 10) {
    bg = 'bg-red-600';
    icon = iconTrash;
  }

  return (
    <div className="relative" style={{ minHeight: 72 }}>
      {(deltaX !== 0 || animating) && (
        <div className={`absolute inset-0 z-0 flex items-center ${deltaX < 0 ? 'justify-end pr-6' : 'justify-start pl-6'} ${bg} rounded-lg transition-all`}>
          {icon}
        </div>
      )}
      <div
        {...handlers}
        className="relative z-10"
        style={{
          touchAction: 'pan-y',
          userSelect: 'none',
          transform: `translateX(${deltaX}px)`,
          transition: animating ? 'transform 0.2s' : deltaX === 0 ? 'transform 0.2s' : 'none',
        }}
      >
        <ShowCard
          item={show}
          onSelect={onSelect}
          onRemove={onRemove}
          showRemoveButton={false}
        />
      </div>
    </div>
  );
};

export default SwipeableShowCard;