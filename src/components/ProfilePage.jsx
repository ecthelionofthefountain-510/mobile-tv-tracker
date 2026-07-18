import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { get as idbGet, set as idbSet } from "idb-keyval";
import {
  FaCamera,
  FaChartPie,
  FaChevronRight,
  FaRegCalendarAlt,
  FaTimes,
} from "react-icons/fa";
import {
  getCurrentUser,
  loadFavorites,
  recoverFavoritesFromDevice,
} from "../utils/favoritesStorage";
import { emitProfileMediaUpdated } from "../utils/profileMediaEvents";
import { loadWatchedAll } from "../utils/watchedStorage";
import { clearCache } from "../utils/tmdbCache";
import BackupControls from "./BackupControls";
import {
  loadAppPreference,
  saveAppPreference,
  setOnboardingSeen,
} from "../utils/appPreferences";
import { AI_GENRES } from "../utils/aiPreferences";

const DEFAULT_PROFILE_KEY = "__default__";
const API_BASE = import.meta.env.VITE_AI_API_BASE || "/api";

const profileAvatarKeyForUser = (user) =>
  user ? `profileAvatar_${user}` : "profileAvatar";

const profileCoverKeyForUser = (user) =>
  user ? `profileCover_${user}` : "profileCover";

const DEFAULT_COVER_URL = `${import.meta.env.BASE_URL}img/background.avif`;

const BIO_MAX_LEN = 160;
const MAX_FAVORITE_GENRES = 5;

const imageFileToDataUrl = async (file, { maxSizePx, quality = 0.86 } = {}) => {
  if (!file) return "";
  const safeMax =
    typeof maxSizePx === "number" && maxSizePx > 0 ? maxSizePx : 1024;

  // Prefer createImageBitmap when available
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

  // Fallback: Image + object URL
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

const ProfilePage = ({ onFullLogout }) => {
  const navigate = useNavigate();
  const [currentUser] = useState(() =>
    JSON.parse(localStorage.getItem("currentUser")),
  );
  const [profileImages, setProfileImages] = useState(
    () => JSON.parse(localStorage.getItem("profileImages")) || {},
  );
  const [profileCovers, setProfileCovers] = useState(
    () => JSON.parse(localStorage.getItem("profileCovers")) || {},
  );
  const [profileDisplayNames, setProfileDisplayNames] = useState(
    () => JSON.parse(localStorage.getItem("profileDisplayNames")) || {},
  );
  const [profileInfo, setProfileInfo] = useState(
    () => JSON.parse(localStorage.getItem("profileInfo")) || {},
  );

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState({
    avatarDataUrl: "",
    coverDataUrl: "",
    displayName: "",
    bio: "",
    favoriteGenres: [],
    birthYear: "",
    gender: "",
    country: "",
  });
  const [editStatus, setEditStatus] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [prefDefaultSort, setPrefDefaultSort] = useState("dateAdded");
  const [prefToastDurationMs, setPrefToastDurationMs] = useState(3000);
  const [widgetSyncApiBase, setWidgetSyncApiBase] = useState(API_BASE);
  const [widgetSyncToken, setWidgetSyncToken] = useState("");
  const [widgetSyncLoading, setWidgetSyncLoading] = useState(false);
  const toastDurationMs = Number(prefToastDurationMs) || 3000;
  const toastTimer = useRef(null);
  const showToast = useCallback(
    (msg) => {
      setToastMsg(msg);
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToastMsg(""), toastDurationMs);
    },
    [toastDurationMs],
  );

  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const quickCoverInputRef = useRef(null);
  const quickAvatarInputRef = useRef(null);

  const activeUser = useMemo(() => {
    const u = currentUser || getCurrentUser();
    return typeof u === "string" && u.trim() ? u : null;
  }, [currentUser]);

  useEffect(() => {
    setPrefDefaultSort(
      loadAppPreference("defaultSort", "dateAdded", activeUser),
    );
    setPrefToastDurationMs(
      Number(loadAppPreference("toastDurationMs", 3000, activeUser)) || 3000,
    );
    setWidgetSyncApiBase(
      loadAppPreference("widgetSyncApiBase", API_BASE, activeUser),
    );
    setWidgetSyncToken(loadAppPreference("widgetSyncToken", "", activeUser));
  }, [activeUser]);

  useEffect(() => {
    saveAppPreference("defaultSort", prefDefaultSort, activeUser);
  }, [activeUser, prefDefaultSort]);

  useEffect(() => {
    saveAppPreference(
      "toastDurationMs",
      Number(prefToastDurationMs),
      activeUser,
    );
  }, [activeUser, prefToastDurationMs]);

  useEffect(() => {
    saveAppPreference("widgetSyncApiBase", widgetSyncApiBase, activeUser);
  }, [activeUser, widgetSyncApiBase]);

  useEffect(() => {
    saveAppPreference("widgetSyncToken", widgetSyncToken, activeUser);
  }, [activeUser, widgetSyncToken]);

  const storageKeyForUser = (user) => (user ? user : DEFAULT_PROFILE_KEY);

  // Migrate legacy localStorage maps (profileImages/profileCovers) into IndexedDB.
  useEffect(() => {
    (async () => {
      try {
        const legacyImages =
          JSON.parse(localStorage.getItem("profileImages") || "{}") || {};
        const legacyCovers =
          JSON.parse(localStorage.getItem("profileCovers") || "{}") || {};

        const keys = Array.from(
          new Set([
            ...Object.keys(legacyImages || {}),
            ...Object.keys(legacyCovers || {}),
          ]),
        ).filter(Boolean);

        await Promise.all(
          keys.map(async (u) => {
            try {
              const img = legacyImages?.[u];
              if (typeof img === "string" && img) {
                await idbSet(profileAvatarKeyForUser(u), img);
              }
              const cov = legacyCovers?.[u];
              if (typeof cov === "string" && cov) {
                await idbSet(profileCoverKeyForUser(u), cov);
              }
            } catch {
              // ignore
            }
          }),
        );

        // Best effort cleanup to avoid quota problems from huge base64 strings.
        try {
          localStorage.removeItem("profileImages");
          localStorage.removeItem("profileCovers");
        } catch {
          // ignore
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  // Load active user's avatar from IndexedDB.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const avatar = await idbGet(profileAvatarKeyForUser(activeUser));
        if (cancelled) return;
        if (typeof avatar === "string" && avatar) {
          const key = storageKeyForUser(activeUser);
          setProfileImages((prev) => ({ ...prev, [key]: avatar }));
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeUser]);

  // Load active user's cover from IndexedDB.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const cover = await idbGet(profileCoverKeyForUser(activeUser));
        if (cancelled) return;
        if (typeof cover === "string" && cover) {
          const key = storageKeyForUser(activeUser);
          setProfileCovers((prev) => ({ ...prev, [key]: cover }));
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeUser]);

  const avatarUrlFor = (user) => {
    const key = storageKeyForUser(user);
    const stored = profileImages?.[key];
    if (typeof stored === "string" && stored) return stored;
    if (!user) return "https://ui-avatars.com/api/?name=User";
    return "https://ui-avatars.com/api/?name=" + encodeURIComponent(user);
  };

  const coverUrlFor = (user) => {
    const key = storageKeyForUser(user);
    const stored = profileCovers?.[key];
    if (typeof stored === "string" && stored) return stored;
    return DEFAULT_COVER_URL;
  };

  const displayNameFor = (user) => {
    const key = storageKeyForUser(user);
    if (!user) return profileDisplayNames?.[key] || "Profile";
    return profileDisplayNames?.[key] || user;
  };

  const openEditProfile = () => {
    setEditStatus("");
    const key = storageKeyForUser(activeUser);
    const info = profileInfo?.[key] || {};
    setEditDraft({
      avatarDataUrl: "",
      coverDataUrl: "",
      displayName: String(
        profileDisplayNames?.[key] || activeUser || "Profile",
      ),
      bio: info.bio ? String(info.bio) : "",
      favoriteGenres: Array.isArray(info.favoriteGenres)
        ? info.favoriteGenres.filter((g) => typeof g === "string")
        : [],
      birthYear: info.birthYear ? String(info.birthYear) : "",
      gender: info.gender ? String(info.gender) : "",
      country: info.country ? String(info.country) : "",
    });
    setIsEditOpen(true);
  };

  const handleQuickCoverPick = (file) => {
    (async () => {
      setEditStatus("");
      if (!file) return;
      try {
        const dataUrl = await imageFileToDataUrl(file, {
          maxSizePx: 1600,
          quality: 0.86,
        });
        if (!dataUrl) return;

        const key = storageKeyForUser(activeUser);

        setProfileCovers((prev) => ({ ...prev, [key]: dataUrl }));

        try {
          await idbSet(profileCoverKeyForUser(activeUser), dataUrl);
        } catch {
          // ignore
        }

        try {
          const next = { ...profileCovers, [key]: dataUrl };
          localStorage.setItem("profileCovers", JSON.stringify(next));
        } catch {
          // ignore
        }

        emitProfileMediaUpdated({ kind: "cover", user: activeUser });
      } catch (e) {
        console.error(e);
        setEditStatus("Could not load image.");
      }
    })();
  };

  const handleQuickAvatarPick = (file) => {
    (async () => {
      setEditStatus("");
      if (!file) return;
      try {
        const dataUrl = await imageFileToDataUrl(file, {
          maxSizePx: 512,
          quality: 0.86,
        });
        if (!dataUrl) return;

        const key = storageKeyForUser(activeUser);

        setProfileImages((prev) => ({ ...prev, [key]: dataUrl }));

        try {
          await idbSet(profileAvatarKeyForUser(activeUser), dataUrl);
        } catch {
          // ignore
        }

        try {
          const next = { ...profileImages, [key]: dataUrl };
          localStorage.setItem("profileImages", JSON.stringify(next));
        } catch {
          // ignore
        }

        emitProfileMediaUpdated({ kind: "avatar", user: activeUser });
      } catch (e) {
        console.error(e);
        setEditStatus("Could not load image.");
      }
    })();
  };

  const closeEditProfile = () => {
    setIsEditOpen(false);
    setEditStatus("");
    setEditDraft({
      avatarDataUrl: "",
      coverDataUrl: "",
      displayName: "",
      bio: "",
      favoriteGenres: [],
      birthYear: "",
      gender: "",
      country: "",
    });
  };

  const saveEditProfile = () => {
    const key = storageKeyForUser(activeUser);
    const identity = activeUser || "Profile";

    const updatedDisplayNames = {
      ...profileDisplayNames,
      [key]: (editDraft.displayName || "").trim() || identity,
    };
    setProfileDisplayNames(updatedDisplayNames);
    try {
      localStorage.setItem(
        "profileDisplayNames",
        JSON.stringify(updatedDisplayNames),
      );
    } catch {
      // ignore
    }

    const nextInfoForUser = {
      bio: (editDraft.bio || "").trim().slice(0, BIO_MAX_LEN),
      favoriteGenres: Array.isArray(editDraft.favoriteGenres)
        ? editDraft.favoriteGenres
            .filter((g) => typeof g === "string")
            .slice(0, MAX_FAVORITE_GENRES)
        : [],
      birthYear: (editDraft.birthYear || "").trim(),
      gender: (editDraft.gender || "").trim(),
      country: (editDraft.country || "").trim(),
    };
    const updatedInfo = { ...profileInfo, [key]: nextInfoForUser };
    setProfileInfo(updatedInfo);
    try {
      localStorage.setItem("profileInfo", JSON.stringify(updatedInfo));
    } catch {
      // ignore
    }

    if (editDraft.avatarDataUrl) {
      const updatedImages = {
        ...profileImages,
        [key]: editDraft.avatarDataUrl,
      };
      setProfileImages(updatedImages);
      try {
        idbSet(profileAvatarKeyForUser(activeUser), editDraft.avatarDataUrl);
      } catch {
        // ignore
      }
      try {
        localStorage.setItem("profileImages", JSON.stringify(updatedImages));
      } catch {
        // ignore
      }
      emitProfileMediaUpdated({ kind: "avatar", user: activeUser });
    }

    if (editDraft.coverDataUrl) {
      const updatedCovers = {
        ...profileCovers,
        [key]: editDraft.coverDataUrl,
      };
      setProfileCovers(updatedCovers);
      try {
        idbSet(profileCoverKeyForUser(activeUser), editDraft.coverDataUrl);
      } catch {
        // ignore
      }
      try {
        localStorage.setItem("profileCovers", JSON.stringify(updatedCovers));
      } catch {
        // ignore
      }
      emitProfileMediaUpdated({ kind: "cover", user: activeUser });
    }

    closeEditProfile();
  };

  useEffect(() => {
    if (!isEditOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeEditProfile();
    };
    const prevOverflow = document?.body?.style?.overflow;
    if (document?.body?.style) document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (document?.body?.style)
        document.body.style.overflow = prevOverflow || "";
    };
  }, [isEditOpen]);

  const clearTmdbCache = () => {
    try {
      clearCache();
      showToast("Cache cleared — fresh data will be fetched.");
    } catch {
      showToast("Could not clear cache.");
    }
  };

  const rerunOnboarding = () => {
    setOnboardingSeen(false, activeUser);
    showToast("Onboarding will show next time you open a page.");
  };

  const recoverFavorites = useCallback(async () => {
    showToast("Searching this device for favorites…");
    try {
      const result = await recoverFavoritesFromDevice(activeUser);
      if (!result.ok) {
        showToast(result.error || "Could not recover favorites.");
        return;
      }
      if (result.recovered > 0) {
        showToast(
          `Recovered ${result.recovered} favorite${
            result.recovered === 1 ? "" : "s"
          }. Open the Favorites tab to see them.`,
        );
      } else {
        showToast("No favorites found on this device.");
      }
    } catch (e) {
      console.error(e);
      showToast("Could not recover favorites.");
    }
  }, [activeUser, showToast]);

  const syncWidgetProfile = useCallback(async () => {
    const apiBase = String(widgetSyncApiBase || "")
      .trim()
      .replace(/\/$/, "");
    const token = String(widgetSyncToken || "").trim();

    if (!apiBase) {
      showToast("Add your widget API base first.");
      return;
    }

    if (!token) {
      showToast("Add the same widget token as in Android.");
      return;
    }

    setWidgetSyncLoading(true);

    try {
      const [nextFavorites, nextWatched] = await Promise.all([
        loadFavorites(activeUser),
        loadWatchedAll(activeUser),
      ]);

      const res = await fetch(`${apiBase}/widget/profile-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-widget-server-token": token,
        },
        body: JSON.stringify({
          favorites: Array.isArray(nextFavorites) ? nextFavorites : [],
          watched: Array.isArray(nextWatched) ? nextWatched : [],
        }),
      });

      if (!res.ok) {
        throw new Error(`Sync failed: ${res.status}`);
      }

      const payload = await res.json();
      showToast(
        `Widget synced: ${payload.favoritesCount || 0} favorites, ${payload.watchedCount || 0} watched.`,
      );
    } catch (e) {
      console.error(e);
      showToast("Could not sync widget profile.");
    } finally {
      setWidgetSyncLoading(false);
    }
  }, [activeUser, showToast, widgetSyncApiBase, widgetSyncToken]);

  const handleFullLogout = () => {
    emitProfileMediaUpdated({ kind: "user", user: null });
    if (onFullLogout) onFullLogout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen pb-20 bg-gray-950">
      {/* Hero */}
      <div className="relative h-40 sm:h-48">
        <div
          className="absolute inset-0 bg-center bg-cover"
          style={{ backgroundImage: `url(${coverUrlFor(activeUser)})` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/35 to-gray-950"
          aria-hidden="true"
        />

        {/* Quick cover action */}
        <div className="absolute inset-x-0 flex items-center justify-end px-4 bottom-3">
          <button
            type="button"
            onClick={() => quickCoverInputRef.current?.click()}
            className="flex items-center justify-center text-gray-100 border rounded-full w-11 h-11 border-white/10 bg-black/35 hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
            aria-label="Change cover photo"
            title="Change cover"
          >
            <FaCamera />
          </button>

          <input
            ref={quickCoverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (e.target) e.target.value = "";
              if (file) handleQuickCoverPick(file);
            }}
          />
        </div>
      </div>

      <div className="px-4">
        {/* Profile header */}
        <div className="flex flex-col items-center -mt-12 text-center">
          <div className="relative">
            <img
              src={avatarUrlFor(activeUser)}
              alt={activeUser ? `${activeUser} profile` : "Profile"}
              className="object-cover w-24 h-24 bg-gray-900 border-2 rounded-full border-gray-950"
            />
            <div
              className="absolute inset-0 rounded-full ring-2 ring-white/15"
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={() => quickAvatarInputRef.current?.click()}
              className="absolute flex items-center justify-center bg-yellow-500 border rounded-full w-9 h-9 -bottom-1 -right-1 border-gray-950 text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
              aria-label="Change profile photo"
              title="Change photo"
            >
              <FaCamera />
            </button>
            <input
              ref={quickAvatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (e.target) e.target.value = "";
                if (file) handleQuickAvatarPick(file);
              }}
            />
          </div>

          <div className="mt-2 text-xl font-bold text-gray-100">
            {displayNameFor(activeUser)}
          </div>
          <div className="mt-0.5 text-xs text-gray-400">
            {activeUser ? "On this device" : "Local profile"}
          </div>

          {(() => {
            const info = profileInfo?.[storageKeyForUser(activeUser)] || {};
            const bio = typeof info.bio === "string" ? info.bio.trim() : "";
            const genres = Array.isArray(info.favoriteGenres)
              ? info.favoriteGenres.filter((g) => typeof g === "string")
              : [];
            if (!bio && genres.length === 0) return null;
            return (
              <div className="flex flex-col items-center w-full max-w-xs mt-3">
                {bio && (
                  <p className="text-sm leading-relaxed text-gray-300">{bio}</p>
                )}
                {genres.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                    {genres.map((g) => (
                      <span
                        key={g}
                        className="px-2.5 py-0.5 text-xs font-semibold rounded-full text-yellow-300 border border-yellow-400/30 bg-yellow-400/10"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          <button
            type="button"
            onClick={openEditProfile}
            className="w-full max-w-xs px-6 py-2 mt-3 text-xs font-semibold tracking-wide uppercase transition bg-yellow-500 rounded-full text-gray-950 hover:bg-yellow-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
          >
            Edit profile
          </button>
        </div>

        {editStatus && (
          <div className="mt-3 text-xs text-red-300">{editStatus}</div>
        )}

        {/* Actions list */}
        <div className="p-0 mt-4 overflow-hidden divide-y app-panel divide-white/10">
          <button
            type="button"
            onClick={() => navigate("/upcoming")}
            className="flex items-center justify-between w-full px-3 py-3 text-sm font-semibold text-gray-100 bg-transparent hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
          >
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 text-yellow-300 border rounded-lg border-white/10 bg-black/25">
                <FaRegCalendarAlt aria-hidden="true" />
              </div>
              <span>Upcoming</span>
            </div>
            <FaChevronRight
              className="text-xs text-gray-300"
              aria-hidden="true"
            />
          </button>

          <button
            type="button"
            onClick={() => navigate("/overview")}
            className="flex items-center justify-between w-full px-3 py-3 text-sm font-semibold text-gray-100 bg-transparent hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
          >
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 text-yellow-300 border rounded-lg border-white/10 bg-black/25">
                <FaChartPie aria-hidden="true" />
              </div>
              <span>Overview</span>
            </div>
            <FaChevronRight
              className="text-xs text-gray-300"
              aria-hidden="true"
            />
          </button>
        </div>

        <div className="p-4 mt-8 app-panel">
          <h2 className="text-lg font-semibold tracking-wide text-gray-100 uppercase">
            App settings
          </h2>
          <p className="mt-1 text-xs text-gray-400">
            Account and app controls for this device.
          </p>

          <div className="pt-4 mt-4 space-y-3 border-t border-white/10">
            <button
              type="button"
              onClick={rerunOnboarding}
              className="w-full px-4 py-3 app-button-ghost"
            >
              Show onboarding again
            </button>
            <button
              type="button"
              onClick={clearTmdbCache}
              className="w-full px-4 py-3 app-button-ghost"
            >
              Clear cache
            </button>
            <button
              type="button"
              onClick={recoverFavorites}
              className="w-full px-4 py-3 app-button-ghost"
            >
              Recover favorites from this device
            </button>
            <div className="pt-4 mt-2 border-t border-white/10">
              <div className="text-sm font-semibold tracking-wide text-gray-100 uppercase">
                Widget Sync
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Use the same API base and token as your Android widget app.
              </p>

              <div className="mt-3 space-y-3">
                <input
                  type="text"
                  value={widgetSyncApiBase}
                  onChange={(e) => setWidgetSyncApiBase(e.target.value)}
                  placeholder="http://192.168.x.x:5174/api"
                  className="w-full app-input"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <input
                  type="text"
                  value={widgetSyncToken}
                  onChange={(e) => setWidgetSyncToken(e.target.value)}
                  placeholder="same token as Android widget"
                  className="w-full app-input"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={syncWidgetProfile}
                  disabled={widgetSyncLoading}
                  className="w-full px-4 py-3 app-button-ghost disabled:opacity-60"
                >
                  {widgetSyncLoading
                    ? "Syncing widget..."
                    : "Sync widget data now"}
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={handleFullLogout}
              className="w-full px-4 py-3 text-red-500 app-button-ghost hover:text-red-600"
            >
              Log out
            </button>
            <div className="pt-1">
              <BackupControls compact />
            </div>
          </div>
        </div>

        {/* Cache-cleared toast */}
        {toastMsg && (
          <div className="fixed left-0 right-0 z-50 flex justify-center pointer-events-none bottom-24">
            <div className="app-toast">{toastMsg}</div>
          </div>
        )}

      </div>

      {/* Edit profile modal */}
      {isEditOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/80"
          role="dialog"
          aria-modal="true"
          aria-label="Edit profile"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeEditProfile();
          }}
        >
          <div className="absolute inset-0 overflow-auto">
            <div className="min-h-full bg-gray-950">
              <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gray-950/95 backdrop-blur">
                <button
                  type="button"
                  onClick={closeEditProfile}
                  className="flex items-center justify-center w-10 h-10 text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
                  aria-label="Close"
                >
                  <FaTimes />
                </button>

                <div className="text-base font-semibold text-gray-100">
                  Edit profile
                </div>

                <button
                  type="button"
                  onClick={saveEditProfile}
                  className="px-3 py-2 text-sm font-semibold tracking-wide text-gray-300 uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
                >
                  Save
                </button>
              </div>

              <div className="px-4 py-6">
                <div className="border border-white/10 rounded-2xl bg-white/5">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="flex items-center w-full gap-4 p-4 text-left border-b border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={
                          editDraft.avatarDataUrl || avatarUrlFor(activeUser)
                        }
                        alt="Profile"
                        className="object-cover bg-gray-900 border rounded-full w-14 h-14 border-white/10"
                      />
                    </div>
                    <div className="text-base font-semibold text-yellow-300">
                      Choose profile photo
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="flex items-center w-full gap-4 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
                  >
                    <div className="flex items-center justify-center flex-shrink-0 border w-14 h-14 rounded-xl border-white/10 bg-black/25">
                      <FaCamera className="text-yellow-300" />
                    </div>
                    <div className="text-base font-semibold text-yellow-300">
                      Choose cover photo
                    </div>
                  </button>

                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (e.target) e.target.value = "";
                      if (!file) return;
                      try {
                        const dataUrl = await imageFileToDataUrl(file, {
                          maxSizePx: 512,
                          quality: 0.86,
                        });
                        setEditDraft((d) => ({
                          ...d,
                          avatarDataUrl: String(dataUrl || ""),
                        }));
                        setEditStatus("");
                      } catch (err) {
                        console.error(err);
                        setEditStatus("Could not load image.");
                      }
                    }}
                  />

                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (e.target) e.target.value = "";
                      if (!file) return;
                      try {
                        const dataUrl = await imageFileToDataUrl(file, {
                          maxSizePx: 1600,
                          quality: 0.86,
                        });
                        setEditDraft((d) => ({
                          ...d,
                          coverDataUrl: String(dataUrl || ""),
                        }));
                        setEditStatus("");
                      } catch (err) {
                        console.error(err);
                        setEditStatus("Could not load image.");
                      }
                    }}
                  />
                </div>

                <div className="mt-8">
                  <div className="text-lg font-bold text-gray-100">
                    Display name
                  </div>
                  <input
                    type="text"
                    value={editDraft.displayName}
                    onChange={(e) =>
                      setEditDraft((d) => ({
                        ...d,
                        displayName: e.target.value,
                      }))
                    }
                    placeholder={activeUser || "Profile"}
                    className="w-full px-0 py-3 mt-2 text-base text-gray-100 bg-transparent border-b border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-4 focus-visible:ring-offset-gray-950"
                  />
                </div>

                <div className="mt-8">
                  <div className="flex items-baseline justify-between">
                    <div className="text-lg font-bold text-gray-100">Bio</div>
                    <div className="text-xs text-gray-500">
                      {(editDraft.bio || "").length}/{BIO_MAX_LEN}
                    </div>
                  </div>
                  <textarea
                    value={editDraft.bio}
                    maxLength={BIO_MAX_LEN}
                    rows={3}
                    onChange={(e) =>
                      setEditDraft((d) => ({
                        ...d,
                        bio: e.target.value,
                      }))
                    }
                    placeholder="Say something about your taste in movies & shows…"
                    className="w-full px-0 py-3 mt-2 text-base text-gray-100 bg-transparent border-b resize-none border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-4 focus-visible:ring-offset-gray-950"
                  />
                </div>

                <div className="mt-8">
                  <div className="flex items-baseline justify-between">
                    <div className="text-lg font-bold text-gray-100">
                      Favorite genres
                    </div>
                    <div className="text-xs text-gray-500">
                      {(editDraft.favoriteGenres || []).length}/
                      {MAX_FAVORITE_GENRES}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {AI_GENRES.map((g) => {
                      const selected = (editDraft.favoriteGenres || []).includes(
                        g.name,
                      );
                      const atLimit =
                        (editDraft.favoriteGenres || []).length >=
                        MAX_FAVORITE_GENRES;
                      const disabled = !selected && atLimit;
                      return (
                        <button
                          key={g.name}
                          type="button"
                          disabled={disabled}
                          onClick={() =>
                            setEditDraft((d) => {
                              const current = Array.isArray(d.favoriteGenres)
                                ? d.favoriteGenres
                                : [];
                              const next = current.includes(g.name)
                                ? current.filter((x) => x !== g.name)
                                : current.length < MAX_FAVORITE_GENRES
                                  ? [...current, g.name]
                                  : current;
                              return { ...d, favoriteGenres: next };
                            })
                          }
                          className={`px-3 py-1.5 text-sm font-semibold rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 ${
                            selected
                              ? "bg-yellow-500 text-gray-950 border-yellow-500"
                              : disabled
                                ? "text-gray-600 border-white/10 opacity-50"
                                : "text-gray-200 border-white/15 hover:bg-white/5"
                          }`}
                        >
                          {g.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-10">
                  <div className="text-lg font-bold text-gray-100">
                    Personal information
                  </div>

                  <div className="mt-6 space-y-7">
                    <div>
                      <div className="text-base font-semibold text-gray-100">
                        Birth year
                      </div>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={editDraft.birthYear}
                        onChange={(e) =>
                          setEditDraft((d) => ({
                            ...d,
                            birthYear: e.target.value,
                          }))
                        }
                        placeholder="—"
                        className="w-full px-0 py-3 text-base text-yellow-300 bg-transparent border-b border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-4 focus-visible:ring-offset-gray-950"
                      />
                    </div>

                    <div>
                      <div className="text-base font-semibold text-gray-100">
                        Gender
                      </div>
                      <select
                        value={editDraft.gender}
                        onChange={(e) =>
                          setEditDraft((d) => ({
                            ...d,
                            gender: e.target.value,
                          }))
                        }
                        className="w-full px-0 py-3 text-base text-yellow-300 bg-transparent border-b border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-4 focus-visible:ring-offset-gray-950"
                      >
                        <option value="" className="text-gray-900">
                          —
                        </option>
                        <option value="Male" className="text-gray-900">
                          Male
                        </option>
                        <option value="Female" className="text-gray-900">
                          Female
                        </option>
                        <option value="Other" className="text-gray-900">
                          Other
                        </option>
                        <option
                          value="Prefer not to say"
                          className="text-gray-900"
                        >
                          Prefer not to say
                        </option>
                      </select>
                    </div>

                    <div>
                      <div className="text-base font-semibold text-gray-100">
                        Country
                      </div>
                      <input
                        type="text"
                        value={editDraft.country}
                        onChange={(e) =>
                          setEditDraft((d) => ({
                            ...d,
                            country: e.target.value,
                          }))
                        }
                        placeholder="—"
                        className="w-full px-0 py-3 text-base text-yellow-300 bg-transparent border-b border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-4 focus-visible:ring-offset-gray-950"
                      />
                    </div>
                  </div>
                </div>

                {editDraft.coverDataUrl && (
                  <div className="mt-8 text-xs text-gray-400">
                    Cover photo selected (will apply after Save)
                  </div>
                )}

                {editStatus && (
                  <div className="mt-6 text-sm text-red-300">{editStatus}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
