import React, { useMemo, useState } from "react";

const OnboardingModal = ({ onFinish }) => {
  const [step, setStep] = useState(0);

  const steps = useMemo(
    () => [
      {
        title: "Welcome to Mobile TV Tracker",
        body: "Track what you watch, keep favorites in one place, and jump back in with less friction.",
      },
      {
        title: "Fast daily flow",
        body: "Use Shows and Movies for your watched lists. Swipe cards for quick actions and open details when needed.",
      },
      {
        title: "Smart picks",
        body: "Open Overview, set AI preferences, and hit Pick to get suggestions based on your taste.",
      },
    ],
    [],
  );

  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="w-full max-w-md app-panel-solid p-5 shadow-2xl">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-yellow-300">
          Getting started
        </div>
        <h2 className="mt-1 text-xl font-bold text-gray-100">
          {steps[step].title}
        </h2>
        <p className="mt-3 text-sm text-gray-300">{steps[step].body}</p>

        <div className="mt-4 flex items-center gap-1.5">
          {steps.map((_, i) => (
            <span
              key={i}
              className={
                "h-1.5 rounded-full transition-all " +
                (i === step ? "w-6 bg-yellow-300" : "w-2 bg-white/25")
              }
              aria-hidden="true"
            />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onFinish()}
            className="app-button-ghost px-3 py-2 text-xs"
          >
            Skip
          </button>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="app-button-ghost px-3 py-2 text-xs"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (isLast) onFinish();
                else setStep((s) => Math.min(steps.length - 1, s + 1));
              }}
              className="app-button-primary px-4 py-2 text-xs"
            >
              {isLast ? "Start" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
