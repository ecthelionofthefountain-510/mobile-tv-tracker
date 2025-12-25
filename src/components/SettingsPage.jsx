import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { del as idbDel, get as idbGet, set as idbSet } from "idb-keyval";
import { FaCamera, FaChevronLeft } from "react-icons/fa";
import { getCurrentUser } from "../utils/favoritesStorage";
import { emitProfileMediaUpdated } from "../utils/profileMediaEvents";
import { applyThemePreference } from "../utils/theme";

const profileAvatarKeyForUser = (user) =>
  user ? `profileAvatar_${user}` : "profileAvatar";

const profileCoverKeyForUser = (user) =>
  user ? `profileCover_${user}` : "profileCover";

const WATCHED_KEY_BASE = "watched";
const FAVORITES_KEY_BASE = "favorites";

const TMDB_CACHE_PREFIX = "tmdb:cache:v1:";

function safeJsonParse(value, fallback) {
  if (value == null) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function watchedKeyForUser(user) {
  return user ? `${WATCHED_KEY_BASE}_${user}` : WATCHED_KEY_BASE;
}

function favoritesKeyForUser(user) {
  return user ? `${FAVORITES_KEY_BASE}_${user}` : FAVORITES_KEY_BASE;
}

function makeSettingKey(user, name) {
  return user ? `settings_${name}_${user}` : `settings_${name}`;
}

const imageFileToDataUrl = async (file, { maxSizePx, quality = 0.86 } = {}) => {
  if (!file) return "";
  const safeMax =
    typeof maxSizePx === "number" && maxSizePx > 0 ? maxSizePx : 1024;

  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, safeMax / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No canvas context");
    ctx.drawImage(bitmap, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not load image"));
      el.src = url;
    });

    const scale = Math.min(1, safeMax / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No canvas context");
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
};

const SettingsPage = () => {
  const navigate = useNavigate();

  const [users, setUsers] = useState(
    () => JSON.parse(localStorage.getItem("users")) || []
  );
  const [currentUser, setCurrentUser] = useState(() =>
    JSON.parse(localStorage.getItem("currentUser"))
  );
  const [newUser, setNewUser] = useState("");
  const [profileImages, setProfileImages] = useState(
    () => JSON.parse(localStorage.getItem("profileImages")) || {}
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
      false
    )
  );
  const [prefAutoPlayVideos, setPrefAutoPlayVideos] = useState(() =>
    safeJsonParse(
      localStorage.getItem(makeSettingKey(activeUser, "autoPlayVideos")),
      false
    )
  );
  const [prefHideWatchedEpisodes, setPrefHideWatchedEpisodes] = useState(() =>
    safeJsonParse(
      localStorage.getItem(makeSettingKey(activeUser, "hideWatchedEpisodes")),
      false
    )
  );
  const [prefProfilePrivate, setPrefProfilePrivate] = useState(() =>
    safeJsonParse(
      localStorage.getItem(makeSettingKey(activeUser, "profilePrivate")),
      false
    )
  );
  const [prefTheme, setPrefTheme] = useState(() =>
    safeJsonParse(
      localStorage.getItem(makeSettingKey(activeUser, "theme")),
      "dark"
    )
  );

  useEffect(() => {
    // When switching user, reload per-user prefs.
    setPrefDisplayLanguage(
      safeJsonParse(
        localStorage.getItem(makeSettingKey(activeUser, "displayLanguage")),
        false
      )
    );
    setPrefAutoPlayVideos(
      safeJsonParse(
        localStorage.getItem(makeSettingKey(activeUser, "autoPlayVideos")),
        false
      )
    );
    setPrefHideWatchedEpisodes(
      safeJsonParse(
        localStorage.getItem(makeSettingKey(activeUser, "hideWatchedEpisodes")),
        false
      )
    );
    setPrefProfilePrivate(
      safeJsonParse(
        localStorage.getItem(makeSettingKey(activeUser, "profilePrivate")),
        false
      )
    );
    setPrefTheme(
      safeJsonParse(
        localStorage.getItem(makeSettingKey(activeUser, "theme")),
        "dark"
      )
    );
  }, [activeUser]);

  useEffect(() => {
    try {
      localStorage.setItem(
        makeSettingKey(activeUser, "displayLanguage"),
        JSON.stringify(!!prefDisplayLanguage)
      );
    } catch {
      // ignore
    }
  }, [activeUser, prefDisplayLanguage]);

  useEffect(() => {
    try {
      localStorage.setItem(
        makeSettingKey(activeUser, "autoPlayVideos"),
        JSON.stringify(!!prefAutoPlayVideos)
      );
    } catch {
      // ignore
    }
  }, [activeUser, prefAutoPlayVideos]);

  useEffect(() => {
    try {
      localStorage.setItem(
        makeSettingKey(activeUser, "hideWatchedEpisodes"),
        JSON.stringify(!!prefHideWatchedEpisodes)
      );
    } catch {
      // ignore
    }
  }, [activeUser, prefHideWatchedEpisodes]);

  useEffect(() => {
    try {
      localStorage.setItem(
        makeSettingKey(activeUser, "profilePrivate"),
        JSON.stringify(!!prefProfilePrivate)
      );
    } catch {
      // ignore
    }
  }, [activeUser, prefProfilePrivate]);

  useEffect(() => {
    try {
      localStorage.setItem(
        makeSettingKey(activeUser, "theme"),
        JSON.stringify("dark")
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

  // Load avatars for users list from IndexedDB.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const list = Array.isArray(users) ? users.filter(Boolean) : [];
      if (list.length === 0) return;

      try {
        const entries = await Promise.all(
          list.map(async (u) => {
            try {
              const v = await idbGet(profileAvatarKeyForUser(u));
              return [u, typeof v === "string" ? v : null];
            } catch {
              return [u, null];
            }
          })
        );

        if (cancelled) return;

        const next = {};
        for (const [u, v] of entries) {
          if (typeof v === "string" && v) next[u] = v;
        }

        if (Object.keys(next).length > 0) {
          setProfileImages((prev) => ({ ...prev, ...next }));
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [users]);

  const addUser = () => {
    setStatus("");
    const trimmed = newUser.trim();
    if (!trimmed) return;
    if (users.includes(trimmed)) return;

    const updatedUsers = [...users, trimmed];
    setUsers(updatedUsers);
    localStorage.setItem("users", JSON.stringify(updatedUsers));
    setNewUser("");
  };

  const switchUser = (user) => {
    setStatus("");
    setCurrentUser(user);
    localStorage.setItem("currentUser", JSON.stringify(user));

    emitProfileMediaUpdated({ kind: "user", user });
  };

  const removeUser = (user) => {
    setStatus("");
    const updatedUsers = users.filter((u) => u !== user);
    setUsers(updatedUsers);
    localStorage.setItem("users", JSON.stringify(updatedUsers));

    if (currentUser === user) {
      setCurrentUser(null);
      localStorage.removeItem("currentUser");

      emitProfileMediaUpdated({ kind: "user", user: null });
    }
  };

  const handleImageChange = (user, file) => {
    (async () => {
      setStatus("");
      if (!user || !file) return;
      try {
        const dataUrl = await imageFileToDataUrl(file, {
          maxSizePx: 512,
          quality: 0.86,
        });
        if (!dataUrl) return;

        setProfileImages((prev) => ({ ...prev, [user]: dataUrl }));

        try {
          await idbSet(profileAvatarKeyForUser(user), dataUrl);
        } catch {
          // ignore
        }

        try {
          const next = { ...profileImages, [user]: dataUrl };
          localStorage.setItem("profileImages", JSON.stringify(next));
        } catch {
          // ignore
        }

        emitProfileMediaUpdated({ kind: "avatar", user });
      } catch {
        // ignore
      }
    })();
  };

  const avatarUrlFor = (user) => {
    if (!user) return "https://ui-avatars.com/api/?name=User";
    return (
      profileImages?.[user] ||
      "https://ui-avatars.com/api/?name=" + encodeURIComponent(user)
    );
  };

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

  const logOut = () => {
    setStatus("");
    try {
      localStorage.removeItem("currentUser");
    } catch {
      // ignore
    }
    setCurrentUser(null);
    emitProfileMediaUpdated({ kind: "user", user: null });
    setStatus("Logged out.");
  };

  const deleteAccount = async () => {
    if (!activeUser) return;
    setStatus("");

    const user = activeUser;
    const updatedUsers = users.filter((u) => u !== user);
    setUsers(updatedUsers);
    try {
      localStorage.setItem("users", JSON.stringify(updatedUsers));
    } catch {
      // ignore
    }

    try {
      if (currentUser === user) {
        localStorage.removeItem("currentUser");
        setCurrentUser(null);
      }
    } catch {
      // ignore
    }

    // Remove per-user lists
    try {
      localStorage.removeItem(favoritesKeyForUser(user));
      localStorage.removeItem(watchedKeyForUser(user));
    } catch {
      // ignore
    }

    // Remove per-user settings
    try {
      localStorage.removeItem(makeSettingKey(user, "displayLanguage"));
      localStorage.removeItem(makeSettingKey(user, "autoPlayVideos"));
      localStorage.removeItem(makeSettingKey(user, "hideWatchedEpisodes"));
      localStorage.removeItem(makeSettingKey(user, "profilePrivate"));
      localStorage.removeItem(makeSettingKey(user, "theme"));
    } catch {
      // ignore
    }

    // Best-effort cleanup of legacy maps
    try {
      const displayNames = safeJsonParse(
        localStorage.getItem("profileDisplayNames"),
        {}
      );
      const info = safeJsonParse(localStorage.getItem("profileInfo"), {});
      const images = safeJsonParse(localStorage.getItem("profileImages"), {});
      const covers = safeJsonParse(localStorage.getItem("profileCovers"), {});

      if (displayNames && typeof displayNames === "object")
        delete displayNames[user];
      if (info && typeof info === "object") delete info[user];
      if (images && typeof images === "object") delete images[user];
      if (covers && typeof covers === "object") delete covers[user];

      localStorage.setItem("profileDisplayNames", JSON.stringify(displayNames));
      localStorage.setItem("profileInfo", JSON.stringify(info));
      localStorage.setItem("profileImages", JSON.stringify(images));
      localStorage.setItem("profileCovers", JSON.stringify(covers));
    } catch {
      // ignore
    }

    // Remove IndexedDB blobs
    try {
      await idbDel(profileAvatarKeyForUser(user));
    } catch {
      // ignore
    }
    try {
      await idbDel(profileCoverKeyForUser(user));
    } catch {
      // ignore
    }
    try {
      await idbDel(watchedKeyForUser(user));
    } catch {
      // ignore
    }

    setStatus("Account deleted.");

    emitProfileMediaUpdated({ kind: "user", user: null });
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

              <div className="pt-10 mt-10 border-t border-white/10">
                <div className="text-2xl font-bold text-gray-100">Accounts</div>
                <div className="mt-4 border border-white/10 rounded-2xl bg-white/5">
                  <div className="p-4">
                    <div className="flex items-stretch gap-2">
                      <input
                        type="text"
                        placeholder="Enter new user name"
                        value={newUser}
                        onChange={(e) => setNewUser(e.target.value)}
                        className="flex-1 min-w-0 p-2 text-white placeholder-gray-400 bg-gray-800 border rounded-md border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
                      />
                      <button
                        type="button"
                        onClick={addUser}
                        className="px-4 py-2 text-sm font-semibold text-gray-900 bg-yellow-500 rounded-md hover:bg-yellow-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
                      >
                        Add
                      </button>
                    </div>

                    <div className="mt-4 space-y-3">
                      {users.length === 0 && (
                        <div className="text-sm text-gray-400">
                          No users yet.
                        </div>
                      )}

                      {users.map((user) => {
                        const isActive = activeUser === user;
                        return (
                          <div
                            key={user}
                            className={
                              "flex flex-col gap-3 p-4 border rounded-2xl sm:flex-row sm:items-center sm:justify-between " +
                              (isActive
                                ? "border-yellow-500/60 bg-black/35"
                                : "border-white/10 bg-black/25")
                            }
                          >
                            <div className="flex items-center flex-1 min-w-0 gap-4">
                              <img
                                src={avatarUrlFor(user)}
                                alt={`${user} profile`}
                                className="flex-shrink-0 object-cover w-12 h-12 bg-gray-800 border rounded-full border-white/10"
                              />
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-gray-100 truncate">
                                  {user}
                                </div>
                                {isActive && (
                                  <div className="text-[11px] text-yellow-300">
                                    Active
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center w-full gap-3 sm:w-auto sm:justify-end">
                              <label className="flex items-center justify-center w-12 h-12 border cursor-pointer rounded-xl border-white/10 bg-black/25 hover:bg-black/35 focus-within:ring-2 focus-within:ring-yellow-400/70 focus-within:ring-offset-2 focus-within:ring-offset-gray-900">
                                <FaCamera className="text-yellow-300" />
                                <span className="sr-only">Choose picture</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleImageChange(user, file);
                                    if (e.target) e.target.value = "";
                                  }}
                                />
                              </label>

                              {!isActive && (
                                <button
                                  type="button"
                                  onClick={() => switchUser(user)}
                                  className="px-4 py-3 text-xs font-semibold text-white bg-gray-700 rounded-xl hover:bg-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
                                >
                                  Switch
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => removeUser(user)}
                                className="px-6 py-3 text-xs font-semibold text-white rounded-xl bg-red-700/80 hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10">
                <button
                  type="button"
                  onClick={logOut}
                  className="w-full px-4 py-4 text-base font-semibold text-gray-900 bg-yellow-500 rounded-full hover:bg-yellow-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
                >
                  Log out
                </button>

                <button
                  type="button"
                  onClick={deleteAccount}
                  className="w-full py-5 mt-4 text-base font-semibold text-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
                >
                  Delete account
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
                  Display in your language
                </div>
                <div className="mt-1 text-sm text-gray-400">
                  By default, titles will display in English
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPrefDisplayLanguage((v) => !v)}
                role="switch"
                aria-checked={!!prefDisplayLanguage}
                className={
                  "relative inline-flex h-8 w-14 items-center rounded-full border border-white/10 transition " +
                  (prefDisplayLanguage ? "bg-yellow-500" : "bg-white/10")
                }
              >
                <span
                  className={
                    "inline-block h-6 w-6 transform rounded-full bg-gray-950 transition " +
                    (prefDisplayLanguage ? "translate-x-7" : "translate-x-1")
                  }
                  aria-hidden="true"
                />
              </button>
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
              <button
                type="button"
                onClick={clearTmdbCache}
                className="w-full px-4 py-4 text-base font-semibold text-gray-900 bg-yellow-500 rounded-full hover:bg-yellow-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
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
              className="w-full px-4 py-4 text-base font-semibold text-gray-900 bg-yellow-500 rounded-full hover:bg-yellow-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
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
