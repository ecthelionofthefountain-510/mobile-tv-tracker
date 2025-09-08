import React, { useEffect } from "react";

const CongratsToast = ({ onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="px-8 py-6 rounded-xl shadow-2xl border-2 border-yellow-500 bg-[#181c24] text-yellow-300 flex flex-col items-center gap-2 animate-fade-in pointer-events-auto">
        {/* <div className="mb-1 text-4xl">🎉</div> */}
        <div className="text-2xl font-bold">Såååja!</div>
        <div className="text-base text-gray-200">Vidare till nästa serie!</div>
      </div>
    </div>
  );
};

export default CongratsToast;