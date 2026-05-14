import React, { useEffect, useState } from "react";

const AppIntroSplash = ({ onDone }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setFadeOut(true), 1250);
    const doneTimer = setTimeout(() => onDone?.(), 1600);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div
      className={
        "fixed inset-0 z-[95] transition-opacity duration-500 " +
        (fadeOut ? "opacity-0" : "opacity-100")
      }
      aria-hidden="true"
    >
      <div className="app-intro-backdrop absolute inset-0" />

      <div className="relative z-10 flex h-full items-center justify-center">
        <div className="app-intro-stage">
          <div className="app-intro-orb" aria-hidden="true">
            <div className="app-intro-ring" />
            <div className="app-intro-ring app-intro-ring-delay" />

            <div className="app-intro-core">
              <span className="app-intro-glyph">✦</span>
            </div>
          </div>

          <div className="mt-6 text-center">
            <div className="text-xs font-semibold tracking-[0.24em] text-gray-300/80 uppercase">
              Mobile TV Tracker
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppIntroSplash;
