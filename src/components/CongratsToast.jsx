/* eslint-disable react/prop-types */
import { useEffect } from "react";
import { Check } from "lucide-react";

const CongratsToast = ({ onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 1600);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div
        className="relative pointer-events-none"
        role="status"
        aria-live="polite"
        aria-label="Klar"
      >
        <div className="congrats-done" aria-hidden="true">
          <div className="congrats-done-fill" />
          <div className="congrats-done-ring congrats-done-ring-1" />
          <div className="congrats-done-ring congrats-done-ring-2" />
          <div className="congrats-done-ring congrats-done-ring-3" />
          <div className="congrats-done-core">
            <Check className="congrats-done-check" />
          </div>
        </div>

        <div className="mt-4 text-center">
          <div className="congrats-done-title">Klar!</div>
        </div>
      </div>
    </div>
  );
};

export default CongratsToast;
