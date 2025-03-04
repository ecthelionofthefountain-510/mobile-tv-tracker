import React, { useEffect } from "react";

const SwipeTipModal = ({ onClose, autoCloseTime = 3000 }) => {
  // Stäng automatiskt efter angiven tid (default 3 sekunder)
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, autoCloseTime);
    
    return () => clearTimeout(timer);
  }, [onClose, autoCloseTime]);

  return (
    <div className="fixed inset-x-0 bottom-20 flex justify-center items-center p-4 z-40 pointer-events-none">
      <div 
        className="bg-gray-800/90 rounded-lg p-3 shadow-xl border border-yellow-600/30 transform transition-all animate-fade-in max-w-sm"
      >
        <div className="flex items-center space-x-3">
          <div className="flex flex-col items-center space-y-2">
            <span className="text-yellow-400 text-lg">⟿</span>
            <span className="text-yellow-500 text-xs">SWIPE RIGHT: FAVORITE</span>
          </div>
          
          <div className="mx-3 h-8 w-px bg-gray-700"></div>
          
          <div className="flex flex-col items-center space-y-2">
            <span className="text-green-400 text-lg">⟽</span>
            <span className="text-green-500 text-xs">SWIPE LEFT: WATCH</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwipeTipModal;