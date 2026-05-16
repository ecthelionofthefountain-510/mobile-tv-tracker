import React, { useEffect, useMemo, useState } from "react";

const SEARCH_DEMO_QUERY = "Search: Last of us";
const SEARCH_DEMO_RESULTS = ["Last of Us", "The Last Kingdom", "The Last Ship"];
const SEARCH_DEMO_START_DELAY_MS = 320;

const SearchDemo = () => {
  const [typedChars, setTypedChars] = useState(0);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    let intervalId = null;
    let revealTimeout = null;
    let startTimeout = null;

    setTypedChars(0);
    setShowResults(false);

    startTimeout = setTimeout(() => {
      intervalId = setInterval(() => {
        setTypedChars((prev) => {
          const next = Math.min(prev + 1, SEARCH_DEMO_QUERY.length);
          if (next >= SEARCH_DEMO_QUERY.length) {
            clearInterval(intervalId);
            revealTimeout = setTimeout(() => setShowResults(true), 140);
          }
          return next;
        });
      }, 44);
    }, SEARCH_DEMO_START_DELAY_MS);

    return () => {
      clearTimeout(startTimeout);
      clearInterval(intervalId);
      clearTimeout(revealTimeout);
    };
  }, []);

  return (
    <div className="onboarding-demo-shell" aria-hidden="true">
      <div className="onboarding-demo-searchbar">
        <SearchGlyph />
        <span className="onboarding-demo-searchtext">
          {SEARCH_DEMO_QUERY.slice(0, typedChars)}
        </span>
        <span className="onboarding-demo-caret" />
      </div>

      <div className="mt-3 min-h-[142px] space-y-2.5">
        {showResults &&
          SEARCH_DEMO_RESULTS.map((title, idx) => (
            <div
              key={title}
              className="onboarding-demo-row"
              style={{ animationDelay: `${idx * 110}ms` }}
            >
              <div className="w-8 h-10 rounded-md bg-white/10" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-100 truncate">
                  {title}
                </div>
                <div className="w-20 h-2 mt-1 rounded-full bg-white/10" />
              </div>
              <span className="app-pill text-[10px]">TV</span>
            </div>
          ))}
      </div>
    </div>
  );
};

const SwipeDemo = () => {
  return (
    <div className="onboarding-demo-shell" aria-hidden="true">
      <div className="relative mx-auto mt-1 h-40 w-full max-w-[240px]">
        <div className="onboarding-demo-card">
          <div className="w-full h-20 rounded-lg bg-white/10" />
          <div className="w-2/3 h-3 mt-3 rounded-full bg-white/20" />
          <div className="w-1/2 h-2 mt-2 rounded-full bg-white/10" />
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
        <div className="px-2 py-1 font-semibold text-center text-yellow-100 border rounded-lg border-yellow-400/35 bg-yellow-500/10">
          → Right: Add
        </div>
        <div className="px-2 py-1 font-semibold text-center text-red-100 border rounded-lg border-red-400/35 bg-red-500/10">
          ← Left: Remove
        </div>
      </div>
    </div>
  );
};

const SmartPicksDemo = () => {
  return (
    <div className="onboarding-demo-shell" aria-hidden="true">
      <div className="flex flex-wrap gap-2 mb-2">
        <span className="app-chip app-chip-active text-[10px]">Drama</span>
        <span className="app-chip text-[10px]">Sci-Fi</span>
        <span className="app-chip text-[10px]">Thriller</span>
      </div>

      <div className="px-3 py-3 border rounded-xl border-yellow-400/25 bg-yellow-500/10">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-yellow-200/85">
          AI pick
        </div>
        <div className="mt-1 text-sm font-semibold text-gray-100">Dark</div>
        <div className="mt-1 text-xs text-gray-300">
          Based on your watched list and preferences
        </div>
      </div>

      <div className="flex justify-end mt-3">
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
  initialStep = 0,
  totalSteps = 3,
  stepOffset = 0,
}) => {
  const [step, setStep] = useState(initialStep);

  useEffect(() => {
    const safe = Number.isFinite(initialStep) ? initialStep : 0;
    setStep(Math.max(0, Math.min(2, safe)));
  }, [initialStep]);

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
      <div className="w-full max-w-md p-5 shadow-2xl app-panel-solid">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-yellow-300">
          Getting started
        </div>

        <div key={step} className="mt-4 onboarding-demo-enter">
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

        <div className="flex items-center justify-between gap-3 mt-5">
          <button
            type="button"
            onClick={onSkip}
            className="px-3 py-2 text-xs app-button-ghost"
          >
            Skip
          </button>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="px-3 py-2 text-xs app-button-ghost"
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
              className="px-4 py-2 text-xs app-button-primary"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
