import React, { useEffect } from "react";

const NotificationModal = ({ message, onClose, autoCloseTime = 3000 }) => {
  // Stäng automatiskt efter angiven tid (default 3 sekunder)
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, autoCloseTime);
    
    return () => clearTimeout(timer);
  }, [onClose, autoCloseTime]);

  // Stäng om man klickar utanför modalen
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 transition-opacity"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-gray-800 rounded-lg p-5 shadow-xl border-2 border-yellow-600/30 transform transition-all max-w-sm w-full animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center mb-3">
          <div className="text-green-400 text-2xl mr-3">✓</div>
          <h3 className="text-lg font-semibold text-yellow-400">Success</h3>
        </div>
        <p className="text-gray-300 mb-4">{message}</p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-yellow-500 text-gray-900 rounded-md hover:bg-yellow-600 font-medium"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;