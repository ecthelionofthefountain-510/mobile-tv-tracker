import { useSwipeable } from 'react-swipeable';

const SwipeWrapper = ({ onSwipedLeft, onSwipedRight, children }) => {
  const handlers = useSwipeable({
    onSwipedLeft,
    onSwipedRight,
    preventScrollOnSwipe: true,
    trackTouch: true,
    trackMouse: true,
    delta: 10,
  });

  return (
    <div
      {...handlers}
      style={{
        width: '100%',
        touchAction: 'pan-y',
        userSelect: 'none',
      }}
    >
      {children}
    </div>
  );
};

export default SwipeWrapper;