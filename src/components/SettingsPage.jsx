import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaChevronLeft } from "react-icons/fa";
import { getCurrentUser } from "../utils/favoritesStorage";
import { signOutUser } from "../utils/supabaseAuth";
import { emitProfileMediaUpdated } from "../utils/profileMediaEvents";
import { applyThemePreference } from "../utils/theme";
import {
  APP_DEFAULT_SORTS,
  APP_LANGUAGES,
  APP_TOAST_DURATIONS,
  loadAppPreference,
  saveAppPreference,
  setOnboardingSeen,
} from "../utils/appPreferences";

const TMDB_CACHE_PREFIX = "tmdb:cache:v1:";

function safeJsonParse(value, fallback) {
  if (value == null) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function makeSettingKey(user, name) {
  return user ? `settings_${name}_${user}` : `settings_${name}`;
}

const SettingsPage = () => {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(() =>
    JSON.parse(localStorage.getItem("currentUser")),
  );

  const [activeTab, setActiveTab] = useState("account");
  const [status, setStatus] = useState("");

  const activeUser = useMemo(() => {
    const u = currentUser || getCurrentUser();
    return typeof u === "string" && u.trim() ? u : null;
  }, [currentUser]);

  const [prefDisplayLanguage, setPrefDisplayLanguage] = useState(() =>
    safeJsonParse(
      localStorage.getItem(makeSettingKey(activeUser, "displayLanguage")),
      false,
    ),
  );
  const [prefAppLanguage, setPrefAppLanguage] = useState(() =>
    loadAppPreference("appLanguage", "en", activeUser),
  );
  const [prefAutoPlayVideos, setPrefAutoPlayVideos] = useState(() =>
    safeJsonParse(
      localStorage.getItem(makeSettingKey(activeUser, "autoPlayVideos")),
      false,
    ),
  );
  const [prefDefaultSort, setPrefDefaultSort] = useState(() =>
    loadAppPreference("defaultSort", "dateAdded", activeUser),
  );
  const [prefToastDurationMs, setPrefToastDurationMs] = useState(() =>
    loadAppPreference("toastDurationMs", 2200, activeUser),
  );
  const [prefHideWatchedEpisodes, setPrefHideWatchedEpisodes] = useState(() =>
    safeJsonParse(
      localStorage.getItem(makeSettingKey(activeUser, "hideWatchedEpisodes")),
      false,
    ),
  );
  const [prefProfilePrivate, setPrefProfilePrivate] = useState(() =>
    safeJsonParse(
      localStorage.getItem(makeSettingKey(activeUser, "profilePrivate")),
      false,
    ),
  );
  const [prefTheme, setPrefTheme] = useState(() =>
    safeJsonParse(
      localStorage.getItem(makeSettingKey(activeUser, "theme")),
      "dark",
    ),
  );

  useEffect(() => {
    // When switching user, reload per-user prefs.
    setPrefDisplayLanguage(
      safeJsonParse(
        localStorage.getItem(makeSettingKey(activeUser, "displayLanguage")),
        false,
      ),
    );
    setPrefAutoPlayVideos(
      safeJsonParse(
        localStorage.getItem(makeSettingKey(activeUser, "autoPlayVideos")),
        false,
      ),
    );
    setPrefAppLanguage(loadAppPreference("appLanguage", "en", activeUser));
    setPrefDefaultSort(
      loadAppPreference("defaultSort", "dateAdded", activeUser),
    );
    setPrefToastDurationMs(
      loadAppPreference("toastDurationMs", 2200, activeUser),
    );
    setPrefHideWatchedEpisodes(
      safeJsonParse(
        localStorage.getItem(makeSettingKey(activeUser, "hideWatchedEpisodes")),
        false,
      ),
    );
    setPrefProfilePrivate(
      safeJsonParse(
        localStorage.getItem(makeSettingKey(activeUser, "profilePrivate")),
        false,
      ),
    );
    setPrefTheme(
      safeJsonParse(
        localStorage.getItem(makeSettingKey(activeUser, "theme")),
        "dark",
      ),
    );
  }, [activeUser]);

  useEffect(() => {
    try {
      localStorage.setItem(
        makeSettingKey(activeUser, "displayLanguage"),
        JSON.stringify(!!prefDisplayLanguage),
      );
    } catch {
      // ignore
    }
  }, [activeUser, prefDisplayLanguage]);

  useEffect(() => {
    saveAppPreference("appLanguage", prefAppLanguage, activeUser);
  }, [activeUser, prefAppLanguage]);

  useEffect(() => {
    try {
      localStorage.setItem(
        makeSettingKey(activeUser, "autoPlayVideos"),
        JSON.stringify(!!prefAutoPlayVideos),
      );
    } catch {
      // ignore
    }
  }, [activeUser, prefAutoPlayVideos]);

  useEffect(() => {
    saveAppPreference("defaultSort", prefDefaultSort, activeUser);
  }, [activeUser, prefDefaultSort]);

  useEffect(() => {
    const valid = Number(prefToastDurationMs) || 2200;
    saveAppPreference("toastDurationMs", valid, activeUser);
  }, [activeUser, prefToastDurationMs]);

  useEffect(() => {
    try {
      localStorage.setItem(
        makeSettingKey(activeUser, "hideWatchedEpisodes"),
        JSON.stringify(!!prefHideWatchedEpisodes),
      );
    } catch {
      // ignore
    }
  }, [activeUser, prefHideWatchedEpisodes]);

  useEffect(() => {
    try {
      localStorage.setItem(
        makeSettingKey(activeUser, "profilePrivate"),
        JSON.stringify(!!prefProfilePrivate),
      );
    } catch {
      // ignore
    }
  }, [activeUser, prefProfilePrivate]);

  useEffect(() => {
    try {
      localStorage.setItem(
        makeSettingKey(activeUser, "theme"),
        JSON.stringify("dark"),
      );
    } catch {
      // ignore
    }
  }, [activeUser, prefTheme]);

  useEffect(() => {
    // Dark-only for now.
    if (prefTheme !== "dark") setPrefTheme("dark");
    applyThemePreference("dark");
  }, [prefTheme]);

  const clearTmdbCache = () => {
    setStatus("");
    try {
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(TMDB_CACHE_PREFIX)) toRemove.push(key);
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
      setStatus("Cache cleared.");
    } catch {
      setStatus("Could not clear cache.");
    }
  };

  const rerunOnboarding = () => {
    setStatus("");
    setOnboardingSeen(false, activeUser);
    setStatus("Onboarding will show next time you leave Settings.");
  };

  const logOut = async () => {
    setStatus("");
    await signOutUser();
    setCurrentUser(null);
    emitProfileMediaUpdated({ kind: "user", user: null });
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-black/80 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center justify-center text-gray-100 w-11 h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
            aria-label="Back"
          >
            <FaChevronLeft />
          </button>

          <div className="text-lg font-semibold text-gray-100">Settings</div>

          <div className="w-11 h-11" aria-hidden="true" />
        </div>

        <div className="grid grid-cols-3 text-sm font-semibold tracking-wide text-gray-400 uppercase">
          <button
            type="button"
            onClick={() => setActiveTab("account")}
            className={
              "px-4 pb-3 text-center " +
              (activeTab === "account"
                ? "text-gray-100 border-b-2 border-gray-100"
                : "opacity-60")
            }
          >
            Account
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("app")}
            className={
              "px-4 pb-3 text-center " +
              (activeTab === "app"
                ? "text-gray-100 border-b-2 border-gray-100"
                : "opacity-60")
            }
          >
            App
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upcoming")}
            className={
              "px-4 pb-3 text-center " +
              (activeTab === "upcoming"
                ? "text-gray-100 border-b-2 border-gray-100"
                : "opacity-60")
            }
          >
            Upcoming
          </button>
        </div>
      </div>

      <div className="px-4 pt-6 pb-10">
        {status && <div className="text-sm text-gray-300">{status}</div>}

        {activeTab === "account" && (
          <>
            <div className="mt-2 text-2xl font-bold text-gray-100">
              Identification
            </div>

            <div className="mt-5 space-y-6">
              <div>
                <div className="text-lg font-semibold text-gray-100">
                  Username
                </div>
                <div className="mt-1 text-xl font-semibold text-blue-500">
                  {activeUser || "—"}
                </div>
              </div>

              <div>
                <div className="text-lg font-semibold text-gray-100">
                  User ID
                </div>
                <div className="mt-1 text-xl font-semibold text-gray-400">
                  {activeUser || "—"}
                </div>
              </div>

              <button
                type="button"
                className="flex items-center justify-between w-full py-4 border-t border-white/10"
              >
                <div className="text-lg font-semibold text-gray-100">
                  Change password
                </div>
                <div className="text-gray-300" aria-hidden="true">
                  ›
                </div>
              </button>

              <div className="pt-6 border-t border-white/10">
                <div className="text-2xl font-bold text-gray-100">Privacy</div>
                <div className="flex items-center justify-between gap-4 mt-4">
                  <div>
                    <div className="text-lg font-semibold text-gray-100">
                      Set profile to private
                    </div>
                    <div className="mt-1 text-sm text-gray-400">
                      If your profile is private, only followers can see your
                      activity.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPrefProfilePrivate((v) => !v)}
                    role="switch"
                    aria-checked={!!prefProfilePrivate}
                    className={
                      "relative inline-flex h-8 w-14 items-center rounded-full border border-white/10 transition " +
                      (prefProfilePrivate ? "bg-yellow-500" : "bg-white/10")
                    }
                  >
                    <span
                      className={
                        "inline-block h-6 w-6 transform rounded-full bg-gray-950 transition " +
                        (prefProfilePrivate ? "translate-x-7" : "translate-x-1")
                      }
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10">
                <button
                  type="button"
                  onClick={logOut}
                  className="app-button-primary w-full px-4 py-4 text-base"
                >
                  Log out
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === "app" && (
          <>
            <div className="text-2xl font-bold text-gray-100">Titles</div>
            <div className="flex items-center justify-between gap-4 mt-5">
              <div>
                <div className="text-lg font-semibold text-gray-100">
                  App language
                </div>
                <div className="mt-1 text-sm text-gray-400">
                  Select language for labels and copy in the app.
                </div>
              </div>
              <select
                value={prefAppLanguage}
                onChange={(e) => setPrefAppLanguage(e.target.value)}
                className="app-select min-w-36"
              >
                {APP_LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-8 mt-8 border-t border-white/10">
              <div className="text-2xl font-bold text-gray-100">Theme</div>
              <div className="mt-3 text-sm text-gray-400">
                Dark mode is enabled.
              </div>
            </div>

            <div className="pt-8 mt-8 border-t border-white/10">
              <div className="text-2xl font-bold text-gray-100">Feed</div>
              <div className="flex items-center justify-between gap-4 mt-5">
                <div>
                  <div className="text-lg font-semibold text-gray-100">
                    Auto-play videos
                  </div>
                  <div className="mt-1 text-sm text-gray-400">
                    Automatically play video trailers
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPrefAutoPlayVideos((v) => !v)}
                  role="switch"
                  aria-checked={!!prefAutoPlayVideos}
                  className={
                    "relative inline-flex h-8 w-14 items-center rounded-full border border-white/10 transition " +
                    (prefAutoPlayVideos ? "bg-yellow-500" : "bg-white/10")
                  }
                >
                  <span
                    className={
                      "inline-block h-6 w-6 transform rounded-full bg-gray-950 transition " +
                      (prefAutoPlayVideos ? "translate-x-7" : "translate-x-1")
                    }
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>

            <div className="pt-8 mt-8 border-t border-white/10">
              <div className="text-2xl font-bold text-gray-100">Behavior</div>

              <div className="mt-5">
                <div className="text-lg font-semibold text-gray-100">
                  Default sort order
                </div>
                <div className="mt-1 text-sm text-gray-400">
                  Used in your watched and favorites lists.
                </div>
                <select
                  value={prefDefaultSort}
                  onChange={(e) => setPrefDefaultSort(e.target.value)}
                  className="app-select mt-3 w-full"
                >
                  {APP_DEFAULT_SORTS.map((sort) => (
                    <option key={sort.value} value={sort.value}>
                      {sort.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6">
                <div className="text-lg font-semibold text-gray-100">
                  Toast duration
                </div>
                <div className="mt-1 text-sm text-gray-400">
                  How long short notifications should stay visible.
                </div>
                <select
                  value={String(prefToastDurationMs)}
                  onChange={(e) =>
                    setPrefToastDurationMs(Number(e.target.value))
                  }
                  className="app-select mt-3 w-full"
                >
                  {APP_TOAST_DURATIONS.map((dur) => (
                    <option key={dur.value} value={String(dur.value)}>
                      {dur.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-8 mt-8 border-t border-white/10">
              <div className="text-2xl font-bold text-gray-100">Onboarding</div>
              <div className="mt-2 text-sm text-gray-400">
                Run the quick intro again to re-learn the main flows.
              </div>
              <button
                type="button"
                onClick={rerunOnboarding}
                className="app-button-ghost mt-4 w-full px-4 py-3"
              >
                Show onboarding again
              </button>
            </div>

            <div className="pt-8 mt-8 border-t border-white/10">
              <button
                type="button"
                onClick={clearTmdbCache}
                className="app-button-primary w-full px-4 py-4 text-base"
              >
                Clear cache
              </button>
            </div>
          </>
        )}

        {activeTab === "upcoming" && (
          <>
            <button
              type="button"
              onClick={() => navigate("/upcoming")}
              className="app-button-primary w-full px-4 py-4 text-base"
            >
              Open Upcoming
            </button>

            <div className="text-2xl font-bold text-gray-100">
              Episodes to display
            </div>
            <button
              type="button"
              className="flex items-center justify-between w-full py-5 mt-4 border-t border-white/10"
            >
              <div className="text-lg font-semibold text-gray-100">
                Filter networks
              </div>
              <div className="text-gray-300" aria-hidden="true">
                ›
              </div>
            </button>

            <div className="flex items-center justify-between gap-4 pt-6 mt-6 border-t border-white/10">
              <div>
                <div className="text-lg font-semibold text-gray-100">
                  Hide watched episodes
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPrefHideWatchedEpisodes((v) => !v)}
                role="switch"
                aria-checked={!!prefHideWatchedEpisodes}
                className={
                  "relative inline-flex h-8 w-14 items-center rounded-full border border-white/10 transition " +
                  (prefHideWatchedEpisodes ? "bg-yellow-500" : "bg-white/10")
                }
              >
                <span
                  className={
                    "inline-block h-6 w-6 transform rounded-full bg-gray-950 transition " +
                    (prefHideWatchedEpisodes
                      ? "translate-x-7"
                      : "translate-x-1")
                  }
                  aria-hidden="true"
                />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
