import React, { useMemo, useState } from "react";

const SearchTargetDemo = () => (
  <div className="onboarding-demo-shell" aria-hidden="true">
    <div className="rounded-xl border border-yellow-400/40 bg-yellow-500/10 p-2.5">
      <div className="onboarding-demo-searchbar">
        <span className="text-xs text-gray-300">Search content ...</span>
      </div>
    </div>
    <div className="mt-3 flex justify-end">
      <button
        type="button"
        className="app-button-primary px-3 py-1.5 text-xs"
        tabIndex={-1}
      >
        GO!
      </button>
    </div>
  </div>
);

const CardActionsDemo = () => (
  <div className="onboarding-demo-shell" aria-hidden="true">
    <div className="rounded-2xl border border-yellow-400/35 bg-white/[0.02] p-3">
      <div className="flex gap-3">
        <div className="h-16 w-12 rounded-lg bg-white/10" />
        <div className="min-w-0 flex-1">
          <div className="h-3.5 w-2/3 rounded-full bg-white/20" />
          <div className="mt-2 h-2.5 w-1/2 rounded-full bg-white/10" />
          <div className="mt-3 flex gap-2">
            <span className="rounded-lg border border-yellow-400/30 bg-yellow-500/15 px-2 py-1 text-[10px] font-semibold text-yellow-100">
              Add to watched
            </span>
            <span className="rounded-lg border border-white/20 bg-white/5 px-2 py-1 text-[10px] font-semibold text-gray-200">
              Favorite
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ShowsActionsDemo = () => (
  <div className="onboarding-demo-shell" aria-hidden="true">
    <div className="rounded-2xl border border-yellow-400/35 bg-white/[0.02] p-3">
      <div className="flex gap-3">
        <div className="relative">
          <div className="h-16 w-12 rounded-lg bg-white/10" />
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full border border-yellow-400/40 bg-yellow-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-yellow-100">
            Info
          </span>
        </div>
        <div className="relative min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 p-2.5">
          <div className="h-3 w-2/3 rounded-full bg-white/20" />
          <div className="mt-2 h-2.5 w-1/2 rounded-full bg-white/10" />
          <span className="absolute -bottom-1 right-2 rounded-full border border-blue-400/40 bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-blue-100">
            Episodes
          </span>
        </div>
      </div>
    </div>
  </div>
);

const SearchOnboardingCoach = ({
  open,
  onComplete,
  onSkip,
  onBackToIntro,
  totalSteps = 3,
  stepOffset = 0,
}) => {
  const [step, setStep] = useState(0);

  const steps = useMemo(
    () => [
      {
        title: "Search quickly",
        body: "Type a title here to find movies and shows instantly.",
        Demo: SearchTargetDemo,
      },
      {
        title: "Explore cards",
        body: "Tap a card to open details. You can also add to watched or favorites right from the card.",
        Demo: CardActionsDemo,
      },
      {
        title: "Use Shows efficiently",
        body: "In Shows, tap the thumbnail for quick info, or tap the card body to open and track watched episodes.",
        Demo: ShowsActionsDemo,
      },
    ],
    [],
  );

  if (!open) return null;

  const isLast = step === steps.length - 1;
  const current = steps[step];
  const ActiveDemo = current.Demo;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md app-panel-solid p-5 shadow-2xl">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-yellow-300">
          Getting started
        </div>

        <div key={step} className="onboarding-demo-enter mt-4">
          <ActiveDemo />
        </div>

        <h3 className="mt-1 text-base font-bold text-gray-100">
          {current.title}
        </h3>
        <p className="mt-2 text-sm text-gray-300">{current.body}</p>

        <div className="mt-3 flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, idx) => (
            <span
              key={idx}
              className={
                "h-1.5 rounded-full transition-all " +
                (idx === stepOffset + step
                  ? "w-6 bg-yellow-300"
                  : "w-2 bg-white/25")
              }
              aria-hidden="true"
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="app-button-ghost px-3 py-2 text-xs"
          >
            Skip
          </button>

          <div className="flex items-center gap-2">
            {(step > 0 || onBackToIntro) && (
              <button
                type="button"
                onClick={() => {
                  if (step > 0) setStep((s) => Math.max(0, s - 1));
                  else onBackToIntro?.();
                }}
                className="app-button-ghost px-3 py-2 text-xs"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (isLast) onComplete();
                else setStep((s) => Math.min(steps.length - 1, s + 1));
              }}
              className="app-button-primary px-4 py-2 text-xs"
            >
              {isLast ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchOnboardingCoach;
