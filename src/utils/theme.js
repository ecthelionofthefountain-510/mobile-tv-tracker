const THEME_PREF_KEY = "theme";

export function themeSettingKeyForUser(user) {
  return user
    ? `settings_${THEME_PREF_KEY}_${user}`
    : `settings_${THEME_PREF_KEY}`;
}

function safeJsonParse(value, fallback) {
  if (value == null) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function getStoredThemePreference(user) {
  try {
    const raw = localStorage.getItem(themeSettingKeyForUser(user));
    const parsed = safeJsonParse(raw, "system");
    if (parsed === "light" || parsed === "dark" || parsed === "system")
      return parsed;
    return "system";
  } catch {
    return "system";
  }
}

export function resolveTheme(preference) {
  if (preference === "light" || preference === "dark") return preference;
  return "dark";
}

export function applyThemePreference(preference) {
  if (typeof window === "undefined") return;

  // Dark-only for now.
  document.body.classList.remove("theme-light");
  try {
    document.documentElement.style.colorScheme = "dark";
  } catch {
    // ignore
  }
}
