import React, { useEffect, useMemo, useState } from "react";

const SPOTLIGHT_PADDING = 10;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const readTargetRect = (selector) => {
  const target = document.querySelector(selector);
  if (!target) return null;

  const rect = target.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const left = clamp(rect.left - SPOTLIGHT_PADDING, 8, vw - 8);
  const top = clamp(rect.top - SPOTLIGHT_PADDING, 8, vh - 8);
  const right = clamp(rect.right + SPOTLIGHT_PADDING, 8, vw - 8);
  const bottom = clamp(rect.bottom + SPOTLIGHT_PADDING, 8, vh - 8);

  return {
    left,
    top,
    width: Math.max(40, right - left),
    height: Math.max(40, bottom - top),
  };
};

const SearchOnboardingCoach = ({
  open,
  onClose,
  totalSteps = 3,
  stepOffset = 0,
}) => {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const [viewport, setViewport] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 390,
    height: typeof window !== "undefined" ? window.innerHeight : 844,
  });

  const steps = useMemo(
    () => [
      {
        selector: '[data-onboarding="search-input"]',
        title: "Search quickly",
        body: "Type a title here to find movies and shows instantly.",
      },
      {
        selector: '[data-onboarding="content-card"]',
        title: "Explore cards",
        body: "Tap a card to open details. You can also add to watched or favorites right from the card.",
      },
      {
        selector: '[data-onboarding="nav-movies"]',
        title: "Swipe in lists",
        body: "In Movies and Shows, swipe cards right or left for quick actions.",
      },
    ],
    [],
  );

  useEffect(() => {
    if (!open) return;
    setStep(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      setRect(readTargetRect(steps[step].selector));
    };

    updatePosition();
    const interval = setInterval(updatePosition, 320);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, step, steps]);

  if (!open) return null;

  const isLast = step === steps.length - 1;
  const current = steps[step];
  const panelWidth = Math.min(340, viewport.width - 24);
  const panelHeight = 228;
  const reservedBottomSpace = 106;
  const panelLeft = rect
    ? clamp(rect.left, 12, Math.max(12, viewport.width - panelWidth - 12))
    : 12;

  const belowTop = rect ? rect.top + rect.height + 14 : viewport.height - 210;
  const aboveTop = rect ? rect.top - panelHeight - 14 : 12;
  const preferredTop =
    rect && belowTop + panelHeight + reservedBottomSpace <= viewport.height
      ? belowTop
      : aboveTop;
  const panelTop = clamp(
    preferredTop,
    12,
    Math.max(12, viewport.height - panelHeight - reservedBottomSpace),
  );

  return (
    <div className="search-coach-overlay" role="dialog" aria-modal="true">
      <div className="search-coach-dim" />

      {rect && (
        <div
          className="search-coach-spotlight"
          style={{
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
          }}
          aria-hidden="true"
        />
      )}

      <div
        className="search-coach-panel app-panel-solid"
        style={{
          width: `${panelWidth}px`,
          left: `${panelLeft}px`,
          top: `${panelTop}px`,
        }}
      >
        <div className="text-[11px] font-semibold uppercase tracking-wider text-yellow-300">
          Getting started
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
            onClick={onClose}
            className="app-button-ghost px-3 py-2 text-xs"
          >
            Skip tour
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
                if (isLast) onClose();
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
