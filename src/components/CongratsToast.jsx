/* eslint-disable react/prop-types */
import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

const CongratsToast = ({ onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="relative pointer-events-none">
        <div className="absolute inset-0 -z-10 flex items-center justify-center">
          <div className="congrats-halo congrats-halo-1" aria-hidden="true" />
          <div className="congrats-halo congrats-halo-2" aria-hidden="true" />
        </div>

        <div className="px-8 py-6 rounded-xl shadow-2xl border-2 border-yellow-500 bg-[#181c24] text-yellow-300 flex flex-col items-center gap-2 animate-congrats-toast pointer-events-auto">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="congrats-check" aria-hidden="true" />
            <div className="text-2xl font-bold">Klar!</div>
          </div>
          <div className="text-base text-gray-200">
            Du har sett klart serien.
          </div>
        </div>
      </div>
    </div>
  );
};

export default CongratsToast;
