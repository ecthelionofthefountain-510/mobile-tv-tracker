import React, { useEffect, useId, useRef } from "react";
import { useModalA11y } from "../hooks/useModalA11y";

const NotificationModal = ({ message, onClose, autoCloseTime = 3000 }) => {
  const dialogRef = useRef(null);
  const okButtonRef = useRef(null);
  const titleId = useId();

  const { handleDialogKeyDown } = useModalA11y({
    enabled: true,
    dialogRef,
    initialFocusRef: okButtonRef,
    onClose,
  });

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 transition-opacity"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        className="app-panel-solid w-full max-w-sm p-5 shadow-xl transform transition-all animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleDialogKeyDown}
        tabIndex={-1}
      >
        <div className="flex items-center mb-3">
          <div className="text-green-400 text-2xl mr-3">✓</div>
          <h3 id={titleId} className="text-lg font-semibold text-yellow-400">
            Success
          </h3>
        </div>
        <p className="text-gray-300 mb-4">{message}</p>
        <div className="flex justify-end">
          <button
            ref={okButtonRef}
            type="button"
            onClick={onClose}
            className="app-button-primary px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;
