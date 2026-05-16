import React, { useMemo, useState } from "react";

const SearchDemo = () => {
  return (
    <div className="onboarding-demo-shell" aria-hidden="true">
      <div className="onboarding-demo-searchbar">
        <SearchGlyph />
        <span className="onboarding-demo-searchtext">Search: Last of us</span>
        <span className="onboarding-demo-caret" />
      </div>

      <div className="mt-3 space-y-2.5">
        {["Last of Us", "The Last Kingdom", "The Last Ship"].map(
          (title, idx) => (
            <div
              key={title}
              className="onboarding-demo-row"
              style={{ animationDelay: `${idx * 110}ms` }}
            >
              <div className="h-10 w-8 rounded-md bg-white/10" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-gray-100">
                  {title}
                </div>
                <div className="mt-1 h-2 w-20 rounded-full bg-white/10" />
              </div>
              <span className="app-pill text-[10px]">TV</span>
            </div>
          ),
        )}
      </div>
    </div>
  );
};

const SwipeDemo = () => {
  return (
    <div className="onboarding-demo-shell" aria-hidden="true">
      <div className="relative mx-auto mt-1 h-40 w-full max-w-[240px]">
        <div className="onboarding-demo-card">
          <div className="h-20 w-full rounded-lg bg-white/10" />
          <div className="mt-3 h-3 w-2/3 rounded-full bg-white/20" />
          <div className="mt-2 h-2 w-1/2 rounded-full bg-white/10" />
        </div>
      </div>

      <div className="mt-2 text-center text-xs text-gray-300">
        Swipe right to save, swipe left to remove
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg border border-yellow-400/35 bg-yellow-500/10 px-2 py-1 text-center font-semibold text-yellow-100">
          → Right: Add
        </div>
        <div className="rounded-lg border border-red-400/35 bg-red-500/10 px-2 py-1 text-center font-semibold text-red-100">
          ← Left: Remove
        </div>
      </div>
    </div>
  );
};

const SmartPicksDemo = () => {
  return (
    <div className="onboarding-demo-shell" aria-hidden="true">
      <div className="mb-2 flex flex-wrap gap-2">
        <span className="app-chip app-chip-active text-[10px]">Drama</span>
        <span className="app-chip text-[10px]">Sci-Fi</span>
        <span className="app-chip text-[10px]">Thriller</span>
      </div>

      <div className="rounded-xl border border-yellow-400/25 bg-yellow-500/10 px-3 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-yellow-200/85">
          AI pick
        </div>
        <div className="mt-1 text-sm font-semibold text-gray-100">Dark</div>
        <div className="mt-1 text-xs text-gray-300">
          Based on your watched list and preferences
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          className="onboarding-demo-pick app-button-primary px-3 py-1.5 text-xs"
          tabIndex={-1}
        >
          Pick
        </button>
      </div>
    </div>
  );
};

const SearchGlyph = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-gray-400"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
    <path
      d="M20 20L17 17"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const OnboardingModal = ({
  onSkip,
  onContinue,
  totalSteps = 3,
  stepOffset = 0,
}) => {
  const [step, setStep] = useState(0);

  const steps = useMemo(
    () => [
      {
        title: "Find in seconds",
        body: "Start on Search. Type a title and jump straight into movie or TV details.",
        Demo: SearchDemo,
      },
      {
        title: "Swipe for quick actions",
        body: "Cards support gestures so you can save or remove items without opening every detail view.",
        Demo: SwipeDemo,
      },
      {
        title: "Get smart recommendations",
        body: "Overview learns from your watched list and preferences to suggest what to watch next.",
        Demo: SmartPicksDemo,
      },
    ],
    [],
  );

  const isLast = step === steps.length - 1;
  const ActiveDemo = steps[step].Demo;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="w-full max-w-md app-panel-solid p-5 shadow-2xl">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-yellow-300">
          Getting started
        </div>

        <div key={step} className="onboarding-demo-enter mt-4">
          <ActiveDemo />
        </div>

        <h2 className="mt-4 text-xl font-bold text-gray-100">
          {steps[step].title}
        </h2>
        <p className="mt-3 text-sm text-gray-300">{steps[step].body}</p>

        <div className="mt-4 flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span
              key={i}
              className={
                "h-1.5 rounded-full transition-all " +
                (i === stepOffset + step
                  ? "w-6 bg-yellow-300"
                  : "w-2 bg-white/25")
              }
              aria-hidden="true"
            />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onSkip}
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
                if (isLast) onContinue();
                else setStep((s) => Math.min(steps.length - 1, s + 1));
              }}
              className="app-button-primary px-4 py-2 text-xs"
            >
              {isLast ? "Continue" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
