// Lightweight pub/sub so an "added to watched/favorites" action can briefly
// pulse the relevant navbar icon ("…it landed here").

export const NAV_PULSE_EVENT = "nav:pulse";

// target is the nav route to pulse, e.g. "/shows", "/movies", "/profile".
export function emitNavPulse(target) {
  if (typeof window === "undefined" || !target) return;
  window.dispatchEvent(
    new CustomEvent(NAV_PULSE_EVENT, { detail: { target } }),
  );
}

export function onNavPulse(handler) {
  if (typeof window === "undefined") return () => {};

  const wrapped = (event) => handler?.(event?.detail?.target);
  window.addEventListener(NAV_PULSE_EVENT, wrapped);
  return () => window.removeEventListener(NAV_PULSE_EVENT, wrapped);
}
