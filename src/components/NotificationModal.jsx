import React, { useEffect, useId, useRef } from "react";

const NotificationModal = ({ message, onClose, autoCloseTime = 3000 }) => {
  const dialogRef = useRef(null);
  const okButtonRef = useRef(null);
  const previouslyFocusedElementRef = useRef(null);
  const titleId = useId();

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

  const getFocusableElements = () => {
    const dialogEl = dialogRef.current;
    if (!dialogEl) return [];
    const elements = dialogEl.querySelectorAll(
      [
        "a[href]",
        "button:not([disabled])",
        "input:not([disabled])",
        "select:not([disabled])",
        "textarea:not([disabled])",
        "[tabindex]:not([tabindex='-1'])",
      ].join(",")
    );
    return Array.from(elements).filter(
      (el) =>
        !el.hasAttribute("disabled") &&
        el.getAttribute("aria-hidden") !== "true"
    );
  };

  const handleDialogKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key !== "Tab") return;

    const focusables = getFocusableElements();
    if (focusables.length === 0) {
      e.preventDefault();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (e.shiftKey) {
      if (active === first || !dialogRef.current?.contains(active)) {
        e.preventDefault();
        last.focus();
      }
      return;
    }

    if (active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  useEffect(() => {
    previouslyFocusedElementRef.current = document.activeElement;

    const focusInitial = () => {
      if (okButtonRef.current) {
        okButtonRef.current.focus({ preventScroll: true });
        return;
      }

      const focusables = getFocusableElements();
      if (focusables[0]?.focus) {
        focusables[0].focus({ preventScroll: true });
        return;
      }

      dialogRef.current?.focus?.({ preventScroll: true });
    };

    const raf = requestAnimationFrame(focusInitial);

    return () => {
      cancelAnimationFrame(raf);
      const prev = previouslyFocusedElementRef.current;
      try {
        prev?.focus?.({ preventScroll: true });
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 transition-opacity"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        className="bg-gray-800 rounded-lg p-5 shadow-xl border-2 border-yellow-600/30 transform transition-all max-w-sm w-full animate-fade-in"
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
            className="px-4 py-2 bg-yellow-500 text-gray-900 rounded-md hover:bg-yellow-600 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;
