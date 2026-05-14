import { beforeEach, describe, expect, it } from "vitest";
import {
  appPreferenceKey,
  getOnboardingSeen,
  loadAppPreference,
  saveAppPreference,
  setOnboardingSeen,
} from "./appPreferences";

describe("appPreferences", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("builds user-scoped and global keys", () => {
    expect(appPreferenceKey("defaultSort", "Alice")).toBe(
      "settings_defaultSort_Alice",
    );
    expect(appPreferenceKey("defaultSort", null)).toBe("settings_defaultSort");
  });

  it("returns fallback for missing or invalid values", () => {
    expect(loadAppPreference("toastDurationMs", 2200, "Alice")).toBe(2200);

    localStorage.setItem("settings_toastDurationMs_Alice", "not-json");
    expect(loadAppPreference("toastDurationMs", 2200, "Alice")).toBe(2200);
  });

  it("uses currentUser when no user argument is provided", () => {
    localStorage.setItem("currentUser", JSON.stringify("Alice"));
    const saved = saveAppPreference("defaultSort", "title");

    expect(saved).toBe(true);
    expect(loadAppPreference("defaultSort", "dateAdded")).toBe("title");
  });

  it("persists onboarding seen flag", () => {
    expect(getOnboardingSeen("Alice")).toBe(false);
    expect(setOnboardingSeen(true, "Alice")).toBe(true);
    expect(getOnboardingSeen("Alice")).toBe(true);
  });
});
