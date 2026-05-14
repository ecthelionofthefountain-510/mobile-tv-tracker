import { getCurrentUser } from "./favoritesStorage";

export const APP_LANGUAGES = [
  { value: "en", label: "English" },
  { value: "sv", label: "Svenska" },
];

export const APP_DEFAULT_SORTS = [
  { value: "dateAdded", label: "Most recent" },
  { value: "title", label: "A-Z" },
  { value: "incomplete", label: "Not finished first" },
];

export const APP_TOAST_DURATIONS = [
  { value: 2200, label: "Short (2.2s)" },
  { value: 3200, label: "Normal (3.2s)" },
  { value: 4500, label: "Long (4.5s)" },
];

const PREF_PREFIX = "settings";

function safeJsonParse(value, fallback) {
  if (value == null) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function activeUserFromArg(user) {
  return typeof user === "string" && user.trim() ? user : getCurrentUser();
}

export function appPreferenceKey(name, user) {
  const u = activeUserFromArg(user);
  return u ? `${PREF_PREFIX}_${name}_${u}` : `${PREF_PREFIX}_${name}`;
}

export function loadAppPreference(name, fallback, user) {
  try {
    return safeJsonParse(
      localStorage.getItem(appPreferenceKey(name, user)),
      fallback,
    );
  } catch {
    return fallback;
  }
}

export function saveAppPreference(name, value, user) {
  try {
    localStorage.setItem(appPreferenceKey(name, user), JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function getOnboardingSeen(user) {
  return !!loadAppPreference("onboardingSeen", false, user);
}

export function setOnboardingSeen(seen, user) {
  return saveAppPreference("onboardingSeen", !!seen, user);
}
