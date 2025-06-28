import { useEffect } from "react";

const SwipeInfoToast = ({ onClose, autoCloseTime = 5000 }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, autoCloseTime);
    return () => clearTimeout(timer);
  }, [onClose, autoCloseTime]);

  return (
    <div className="fixed left-1/2 bottom-28 z-50 -translate-x-1/2 px-6 py-5 rounded-xl shadow-2xl border-2 border-yellow-500 bg-[#181c24] text-white flex flex-col items-center gap-2 max-w-[90vw] w-[340px]">
      <div className="mb-1 text-lg font-bold tracking-wide">Swipe Info</div>
      <div className="flex flex-col items-center text-base">
        <div>
          <span className="mr-2 text-2xl">👈</span>
          <span>
            <span className="font-semibold text-green-400">VÄNSTER</span> för att
            lägga till i{" "}
            <span className="italic">"watched"</span>
          </span>
        </div>
        <div className="mt-2">
          <span className="mr-2 text-2xl">👉</span>
          <span>
            <span className="font-semibold text-red-400">HÖGER</span> för att ta
            bort från favoriter
          </span>
        </div>
      </div>
      <button
        onClick={onClose}
        className="px-4 py-1 mt-4 font-bold text-gray-900 transition bg-yellow-500 rounded shadow hover:bg-yellow-400"
      >
        OK
      </button>
    </div>
  );
};

export default SwipeInfoToast;