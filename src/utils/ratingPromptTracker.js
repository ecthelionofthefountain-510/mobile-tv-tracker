// Tracks shows whose rating prompt was already shown on the detail page this
// session, so ShowsList doesn't pop a second prompt when you navigate back.
// Session-scoped (resets on reload) — matches ShowsList's transition-based
// detection, which also only fires within a session.

const handled = new Set();

export function markRatingPromptHandled(id) {
  if (id == null) return;
  handled.add(String(id));
}

export function wasRatingPromptHandled(id) {
  if (id == null) return false;
  return handled.has(String(id));
}
