import { useEffect } from "react";

const SwipeInfoToast = ({
  onClose,
  autoCloseTime = 5000,
  leftAction = { icon: "👈", color: "text-green-400", label: "VÄNSTER", text: "" },
  rightAction = { icon: "👉", color: "text-red-400", label: "HÖGER", text: "" },
  title = "Swipe Info"
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, autoCloseTime);
    return () => clearTimeout(timer);
  }, [onClose, autoCloseTime]);

  return (
    <div className="fixed left-1/2 bottom-28 z-50 -translate-x-1/2 px-6 py-5 rounded-xl shadow-2xl border-2 border-yellow-500 bg-[#181c24] text-white flex flex-col items-center gap-2 max-w-[90vw] w-[340px]">
      <div className="mb-1 text-lg font-bold tracking-wide">{title}</div>
      <div className="flex flex-col items-center text-base">
        <div>
          <span className="mr-2 text-2xl">{leftAction.icon}</span>
          <span>
            <span className={`font-semibold ${leftAction.color}`}>{leftAction.label}</span> {leftAction.text}
          </span>
        </div>
        <div className="mt-2">
          <span className="mr-2 text-2xl">{rightAction.icon}</span>
          <span>
            <span className={`font-semibold ${rightAction.color}`}>{rightAction.label}</span> {rightAction.text}
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

<SwipeInfoToast
  onClose={() => setShowSwipeInfo(false)}
  leftAction={{
    icon: "👈",
    color: "text-red-400",
    label: "VÄNSTER",
    text: "för att ta bort från listan"
  }}
  rightAction={{
    icon: "👉",
    color: "text-yellow-400",
    label: "HÖGER",
    text: "för att lägga tillbaka i favoriter"
  }}
/>