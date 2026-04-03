import { useEffect } from "react";

const SwipeInfoToast = ({
  onClose,
  autoCloseTime = 5000,
  leftAction = {
    icon: "👈",
    color: "text-green-400",
    label: "VÄNSTER",
    text: "",
  },
  rightAction = { icon: "→", color: "text-red-400", label: "HÖGER", text: "" },
  title = "Swipe Info",
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, autoCloseTime);
    return () => clearTimeout(timer);
  }, [onClose, autoCloseTime]);

  return (
    <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 app-panel-solid ring-1 ring-inset ring-yellow-500/30 px-6 py-5 shadow-xl text-white flex flex-col items-center gap-2 max-w-[90vw] w-[340px]">
      <div className="mb-1 text-lg font-bold tracking-wide">{title}</div>
      <div className="flex flex-col items-center text-base">
        <div>
          <span className="mr-2 text-2xl">{leftAction.icon}</span>
          <span>
            <span className={`font-semibold ${leftAction.color}`}>
              {leftAction.label}
            </span>{" "}
            {leftAction.text}
          </span>
        </div>
        <div className="mt-2">
          <span className="mr-2 text-2xl">{rightAction.icon}</span>
          <span>
            <span className={`font-semibold ${rightAction.color}`}>
              {rightAction.label}
            </span>{" "}
            {rightAction.text}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="app-button-primary mt-4 px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
      >
        OK
      </button>
    </div>
  );
};

export default SwipeInfoToast;
