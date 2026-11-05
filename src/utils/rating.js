// src/utils/rating.js
//
// Ratings are stored on a 0–10 scale (IMDb-style), with one decimal of
// precision (e.g. 8.2). Items carry a `ratingScale` marker: 10 means the
// value is already on the new scale. Legacy items used a 1–5 star rating with
// no marker, and are migrated by ×2 the first time they are normalized. The
// marker travels with the item (including through cloud sync), which keeps the
// migration idempotent and safe across devices.

export const RATING_MAX = 10;
export const RATING_SCALE = 10;

// Clamp an incoming rating to the 0–10 scale with one decimal. Returns
// undefined for a missing / non-positive rating (i.e. "no rating").
export function normalizeRating10(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.min(RATING_MAX, Math.max(0, Math.round(n * 10) / 10));
}

// Convert a stored rating to the 0–10 scale, migrating a legacy 1–5 value when
// it isn't marked as already-migrated (ratingScale !== 10).
export function toRating10(value, scale) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  if (scale === RATING_SCALE) return normalizeRating10(n);
  return normalizeRating10(n * 2);
}

// Display helper: "8.2", or "8" when the decimal is .0.
export function formatRating10(value) {
  const n = normalizeRating10(value);
  if (n == null) return "";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

// Trim and cap a free-text note; returns undefined when empty.
export function normalizeComment(text, max = 2000) {
  if (typeof text !== "string") return undefined;
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}
