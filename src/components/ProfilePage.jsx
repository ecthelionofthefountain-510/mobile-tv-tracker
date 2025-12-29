import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { get as idbGet, set as idbSet } from "idb-keyval";
import {
  FaCamera,
  FaChevronRight,
  FaEllipsisH,
  FaPlus,
  FaTimes,
} from "react-icons/fa";
import { API_KEY, IMAGE_BASE_URL, TMDB_BASE_URL } from "../config";
import {
  favoriteIdentity,
  getCurrentUser,
  loadFavorites,
  saveFavorites,
} from "../utils/favoritesStorage";
import { emitProfileMediaUpdated } from "../utils/profileMediaEvents";
import { createWatchedMovie, createWatchedShow } from "../utils/watchedMapper";
import { loadWatchedAll, saveWatchedAll } from "../utils/watchedStorage";
import { cachedFetchJson } from "../utils/tmdbCache";
import MovieDetailModal from "./MovieDetailModal";
import ShowDetailModal from "./ShowDetailModal";

const profileAvatarKeyForUser = (user) =>
  user ? `profileAvatar_${user}` : "profileAvatar";

const profileCoverKeyForUser = (user) =>
  user ? `profileCover_${user}` : "profileCover";

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

const ProfilePage = () => {
  const navigate = useNavigate();
  const [currentUser] = useState(() =>
    JSON.parse(localStorage.getItem("currentUser"))
  );
  const [profileImages, setProfileImages] = useState(
    () => JSON.parse(localStorage.getItem("profileImages")) || {}
  );
  const [profileCovers, setProfileCovers] = useState(
    () => JSON.parse(localStorage.getItem("profileCovers")) || {}
  );
  const [profileDisplayNames, setProfileDisplayNames] = useState(
    () => JSON.parse(localStorage.getItem("profileDisplayNames")) || {}
  );
  const [profileInfo, setProfileInfo] = useState(
    () => JSON.parse(localStorage.getItem("profileInfo")) || {}
  );

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState({
    avatarDataUrl: "",
    coverDataUrl: "",
    displayName: "",
    birthYear: "",
    gender: "",
    country: "",
  });
  const [editStatus, setEditStatus] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [favorites, setFavorites] = useState([]);
  const [watched, setWatched] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemDetails, setItemDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [profileLoadError, setProfileLoadError] = useState("");

  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const activeUser = useMemo(() => {
    const u = currentUser || getCurrentUser();
    return typeof u === "string" && u.trim() ? u : null;
  }, [currentUser]);

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
          ])
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
          })
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

  useEffect(() => {
    if (!isMenuOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMenuOpen]);

  // Load active user's avatar from IndexedDB.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!activeUser) return;
      try {
        const avatar = await idbGet(profileAvatarKeyForUser(activeUser));
        if (cancelled) return;
        if (typeof avatar === "string" && avatar) {
          setProfileImages((prev) => ({ ...prev, [activeUser]: avatar }));
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
      if (!activeUser) return;
      try {
        const cover = await idbGet(profileCoverKeyForUser(activeUser));
        if (cancelled) return;
        if (typeof cover === "string" && cover) {
          setProfileCovers((prev) => ({ ...prev, [activeUser]: cover }));
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeUser]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setProfileLoadError("");
      try {
        const favs = await loadFavorites(activeUser);
        const watched = await loadWatchedAll(activeUser);

        if (!cancelled) {
          setFavorites(Array.isArray(favs) ? favs : []);
          setWatched(Array.isArray(watched) ? watched : []);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setFavorites([]);
          setWatched([]);
          setProfileLoadError("Could not load profile data.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeUser]);

  const handleCoverChange = (user, file) => {
    (async () => {
      if (!user || !file) return;
      try {
        const dataUrl = await imageFileToDataUrl(file, {
          maxSizePx: 1600,
          quality: 0.86,
        });
        if (!dataUrl) return;

        setProfileCovers((prev) => ({ ...prev, [user]: dataUrl }));

        try {
          await idbSet(profileCoverKeyForUser(user), dataUrl);
        } catch (e) {
          console.warn("Could not save cover to IndexedDB", e);
        }

        try {
          const next = { ...profileCovers, [user]: dataUrl };
          localStorage.setItem("profileCovers", JSON.stringify(next));
        } catch {
          // ignore
        }
        emitProfileMediaUpdated({ kind: "cover", user });
      } catch (e) {
        console.error(e);
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

  const coverUrlFor = (user) => {
    if (!user) return "/img/background.avif";
    return profileCovers?.[user] || "/img/background.avif";
  };

  const displayNameFor = (user) => {
    if (!user) return "Profile";
    return profileDisplayNames?.[user] || user;
  };

  const openEditProfile = () => {
    setEditStatus("");
    if (!activeUser) return;
    const info = profileInfo?.[activeUser] || {};
    setEditDraft({
      avatarDataUrl: "",
      coverDataUrl: "",
      displayName: String(profileDisplayNames?.[activeUser] || activeUser),
      birthYear: info.birthYear ? String(info.birthYear) : "",
      gender: info.gender ? String(info.gender) : "",
      country: info.country ? String(info.country) : "",
    });
    setIsEditOpen(true);
  };

  const closeEditProfile = () => {
    setIsEditOpen(false);
    setEditStatus("");
    setEditDraft({
      avatarDataUrl: "",
      coverDataUrl: "",
      displayName: "",
      birthYear: "",
      gender: "",
      country: "",
    });
  };

  const saveEditProfile = () => {
    if (!activeUser) return;

    const updatedDisplayNames = {
      ...profileDisplayNames,
      [activeUser]: (editDraft.displayName || "").trim() || activeUser,
    };
    setProfileDisplayNames(updatedDisplayNames);
    try {
      localStorage.setItem(
        "profileDisplayNames",
        JSON.stringify(updatedDisplayNames)
      );
    } catch {
      // ignore
    }

    const nextInfoForUser = {
      birthYear: (editDraft.birthYear || "").trim(),
      gender: (editDraft.gender || "").trim(),
      country: (editDraft.country || "").trim(),
    };
    const updatedInfo = { ...profileInfo, [activeUser]: nextInfoForUser };
    setProfileInfo(updatedInfo);
    try {
      localStorage.setItem("profileInfo", JSON.stringify(updatedInfo));
    } catch {
      // ignore
    }

    if (editDraft.avatarDataUrl) {
      const updatedImages = {
        ...profileImages,
        [activeUser]: editDraft.avatarDataUrl,
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
        [activeUser]: editDraft.coverDataUrl,
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

  const sameEntry = (a, b) =>
    String(a?.id) === String(b?.id) &&
    (a?.mediaType || (a?.first_air_date ? "tv" : "movie")) ===
      (b?.mediaType || (b?.first_air_date ? "tv" : "movie"));

  const openDetails = async (item) => {
    if (!item || item.id == null) return;
    const mediaType = item.mediaType || (item.first_air_date ? "tv" : "movie");
    const endpoint = mediaType === "tv" ? "tv" : "movie";

    setSelectedItem({ ...item, mediaType });
    setItemDetails(null);
    setIsLoading(true);
    setDetailsError("");

    try {
      const [details, credits, videos] = await Promise.all([
        cachedFetchJson(
          `${TMDB_BASE_URL}/${endpoint}/${item.id}?api_key=${API_KEY}`,
          { ttlMs: 6 * 60 * 60 * 1000 }
        ),
        cachedFetchJson(
          `${TMDB_BASE_URL}/${endpoint}/${item.id}/credits?api_key=${API_KEY}`,
          { ttlMs: 24 * 60 * 60 * 1000 }
        ),
        cachedFetchJson(
          `${TMDB_BASE_URL}/${endpoint}/${item.id}/videos?api_key=${API_KEY}`,
          { ttlMs: 24 * 60 * 60 * 1000 }
        ),
      ]);
      setItemDetails({ ...details, credits, videos });
    } catch (e) {
      console.error(e);
      setDetailsError("Could not load details.");
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedItem(null);
    setItemDetails(null);
    setIsLoading(false);
    setDetailsError("");
  };

  const toggleFavorite = (item) => {
    const normalizedItem = {
      ...item,
      mediaType: item?.mediaType || (item?.first_air_date ? "tv" : "movie"),
    };

    const prevFavorites = favorites;
    const exists = favorites.some(
      (f) => favoriteIdentity(f) === favoriteIdentity(normalizedItem)
    );
    const updated = exists
      ? favorites.filter(
          (f) => favoriteIdentity(f) !== favoriteIdentity(normalizedItem)
        )
      : [...favorites, normalizedItem];

    setFavorites(updated);
    (async () => {
      const ok = await saveFavorites(updated, activeUser);
      if (!ok) setFavorites(prevFavorites);
    })();
  };

  const toggleWatched = async (item) => {
    const mediaType =
      item?.mediaType || (item?.first_air_date ? "tv" : "movie");
    const existing = watched.some((w) => sameEntry(w, { ...item, mediaType }));

    if (existing) {
      const updated = watched.filter(
        (w) => !sameEntry(w, { ...item, mediaType })
      );
      setWatched(updated);
      await saveWatchedAll(updated, activeUser);
      return;
    }

    let base =
      mediaType === "tv" ? createWatchedShow(item) : createWatchedMovie(item);

    if (mediaType === "tv") {
      try {
        const needsDetails =
          !base.number_of_seasons ||
          typeof base.number_of_episodes !== "number" ||
          base.number_of_episodes <= 0;
        let tvDetails = null;
        if (needsDetails) {
          tvDetails = await cachedFetchJson(
            `${TMDB_BASE_URL}/tv/${item.id}?api_key=${API_KEY}`,
            { ttlMs: 6 * 60 * 60 * 1000 }
          );
        }

        const seasonsCount =
          base.number_of_seasons || tvDetails?.number_of_seasons || 0;
        const episodesCount =
          typeof base.number_of_episodes === "number" &&
          base.number_of_episodes > 0
            ? base.number_of_episodes
            : tvDetails?.number_of_episodes;

        const seasons = {};
        for (let i = 1; i <= seasonsCount; i++) {
          seasons[i] = { watchedEpisodes: [] };
        }

        base = {
          ...base,
          number_of_seasons: seasonsCount,
          number_of_episodes:
            typeof episodesCount === "number" && episodesCount > 0
              ? episodesCount
              : base.number_of_episodes,
          seasons,
        };
      } catch (e) {
        console.warn("Could not enrich TV watched item", e);
      }
    }

    const updated = [...watched, base];
    setWatched(updated);
    await saveWatchedAll(updated, activeUser);
  };

  const favoritesShows = useMemo(
    () =>
      favorites.filter(
        (f) => (f?.mediaType || (f?.first_air_date ? "tv" : "movie")) === "tv"
      ),
    [favorites]
  );
  const favoritesMovies = useMemo(
    () =>
      favorites.filter(
        (f) =>
          (f?.mediaType || (f?.first_air_date ? "tv" : "movie")) === "movie"
      ),
    [favorites]
  );
  const watchedShows = useMemo(
    () =>
      watched.filter(
        (w) => (w?.mediaType || (w?.first_air_date ? "tv" : "movie")) === "tv"
      ),
    [watched]
  );
  const watchedMovies = useMemo(
    () =>
      watched.filter(
        (w) =>
          (w?.mediaType || (w?.first_air_date ? "tv" : "movie")) === "movie"
      ),
    [watched]
  );

  const primaryShows =
    favoritesShows.length > 0 ? favoritesShows : watchedShows;
  const primaryMovies =
    favoritesMovies.length > 0 ? favoritesMovies : watchedMovies;

  const PosterRow = ({ items, emptyCta }) => {
    if (!items || items.length === 0) return emptyCta || null;
    return (
      <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.slice(0, 20).map((item) => {
          const key =
            favoriteIdentity(item) ||
            `${item?.mediaType || "x"}:${String(item?.id)}`;
          const title = item?.title || item?.name || "";
          return (
            <button
              key={key}
              type="button"
              onClick={() => openDetails(item)}
              className="flex-shrink-0 w-[94px] sm:w-[110px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
              aria-label={title ? `Open ${title}` : "Open item"}
            >
              <div className="overflow-hidden border border-gray-800 rounded-xl bg-gray-900/70">
                {item?.poster_path ? (
                  <img
                    src={`${IMAGE_BASE_URL}${item.poster_path}`}
                    alt={title}
                    className="object-cover w-full aspect-[2/3]"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full text-xs text-gray-500 aspect-[2/3] bg-gray-800">
                    No image
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-20 bg-gray-950">
      {/* Hero */}
      <div className="relative h-56 sm:h-64">
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

        {/* Top actions */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-end p-4">
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className="flex items-center justify-center w-12 h-12 text-gray-100 border rounded-full border-white/10 bg-black/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
            aria-label="Open menu"
          >
            <FaEllipsisH />
          </button>
        </div>
      </div>

      <div className="px-4">
        {/* Avatar row */}
        <div className="flex items-end justify-between gap-3 -mt-10">
          <div className="flex items-end gap-3">
            <div className="relative">
              <img
                src={avatarUrlFor(activeUser)}
                alt={activeUser ? `${activeUser} profile` : "Profile"}
                className="object-cover w-20 h-20 bg-gray-900 border-2 rounded-full border-gray-950"
              />
              <div
                className="absolute inset-0 rounded-full ring-2 ring-white/15"
                aria-hidden="true"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={openEditProfile}
            disabled={!activeUser}
            className="px-5 py-2 text-sm font-semibold tracking-wide text-gray-100 uppercase transition border rounded-full border-white/15 bg-black/35 hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 disabled:opacity-50"
          >
            Edit
          </button>
        </div>

        {/* Name */}
        <div className="mt-3">
          <div className="text-2xl font-bold text-gray-100">
            {displayNameFor(activeUser)}
          </div>
          <div className="text-xs text-gray-400">
            {activeUser ? "Active" : "Open settings to create a user"}
          </div>
        </div>

        {profileLoadError && (
          <div className="mt-3 text-xs text-red-300">{profileLoadError}</div>
        )}

        {/* Stats section */}
        {/* <div className="mt-8">
          <Link
            to="/overview"
            className="flex items-center justify-between text-2xl font-bold text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
            aria-label="Open overview"
          >
            <span>Stats</span>
            <FaChevronRight className="text-gray-300" />
          </Link>
        </div> */}

        {/* Lists section */}
        {/* <div className="mt-8">
          <div className="flex items-center justify-between text-2xl font-bold text-gray-100">
            <span>Lists</span>
            <FaChevronRight className="text-gray-300" aria-hidden="true" />
          </div>

          <Link
            to="/search"
            className="flex flex-col items-center justify-center w-full gap-2 p-6 mt-4 border border-white/10 rounded-2xl bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
            aria-label="Add favorites"
          >
            <div className="text-5xl text-gray-100">
              <FaPlus />
            </div>
            <div className="text-sm font-bold tracking-wide text-gray-100 uppercase">
              Add favorites
            </div>
            <div className="text-xs text-gray-400">
              Search and heart what you like
            </div>
          </Link>
        </div> */}

        {/* Shows section */}
        <div className="mt-10">
          <Link
            to="/shows"
            className="flex items-center justify-between text-2xl font-bold text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
            aria-label="Open shows"
          >
            <span>Favorite Shows</span>
            <FaChevronRight className="text-gray-300" />
          </Link>

          <div className="mt-4">
            <PosterRow
              items={primaryShows}
              emptyCta={
                <Link
                  to="/search"
                  className="flex flex-col items-center justify-center w-full gap-2 p-6 border border-white/10 rounded-2xl bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
                >
                  <div className="text-5xl text-gray-100">
                    <FaPlus />
                  </div>
                  <div className="text-sm font-bold tracking-wide text-gray-100 uppercase">
                    Add favorite shows
                  </div>
                </Link>
              }
            />
          </div>
        </div>

        {/* Movies section */}
        <div className="mt-10">
          <Link
            to="/movies"
            className="flex items-center justify-between text-2xl font-bold text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
            aria-label="Open movies"
          >
            <span>Favorite Movies</span>
            <FaChevronRight className="text-gray-300" />
          </Link>

          <div className="mt-4">
            <PosterRow
              items={primaryMovies}
              emptyCta={
                <Link
                  to="/search"
                  className="flex flex-col items-center justify-center w-full gap-2 p-6 border border-white/10 rounded-2xl bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
                >
                  <div className="text-5xl text-gray-100">
                    <FaPlus />
                  </div>
                  <div className="text-sm font-bold tracking-wide text-gray-100 uppercase">
                    Add favorite movies
                  </div>
                </Link>
              }
            />
          </div>
        </div>

        {isMenuOpen && (
          <div
            className="fixed inset-0 z-[60] flex items-end pb-20 bg-black/60"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            onClick={() => setIsMenuOpen(false)}
          >
            <div
              className="w-full p-3 border-t border-white/10 bg-gray-950 rounded-t-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  navigate("/settings");
                }}
                className="flex items-center justify-between w-full px-4 py-4 text-base font-semibold text-gray-100 border border-white/10 rounded-2xl bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
              >
                <span>Settings</span>
                <FaChevronRight className="text-gray-300" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* Details modal */}
        {selectedItem &&
          !isLoading &&
          itemDetails &&
          (selectedItem.mediaType === "tv" ||
          itemDetails?.seasons ||
          itemDetails?.number_of_seasons ? (
            <ShowDetailModal
              show={itemDetails}
              onClose={closeModal}
              showActions
              isWatched={watched.some((w) => sameEntry(w, selectedItem))}
              isFavorited={favorites.some(
                (f) => favoriteIdentity(f) === favoriteIdentity(selectedItem)
              )}
              onAddToWatched={() => toggleWatched(selectedItem)}
              onAddToFavorites={() => toggleFavorite(selectedItem)}
            />
          ) : (
            <MovieDetailModal
              movie={itemDetails}
              onClose={closeModal}
              showActions
              isWatched={watched.some((w) => sameEntry(w, selectedItem))}
              isFavorited={favorites.some(
                (f) => favoriteIdentity(f) === favoriteIdentity(selectedItem)
              )}
              onAddToWatched={() => toggleWatched(selectedItem)}
              onAddToFavorites={() => toggleFavorite(selectedItem)}
            />
          ))}

        {selectedItem && isLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
            <div className="w-full max-w-sm p-6 bg-gray-900 border border-white/10 rounded-2xl">
              <div className="text-lg font-semibold text-yellow-400">
                Loading…
              </div>
              {detailsError && (
                <div className="mt-2 text-sm text-red-300">{detailsError}</div>
              )}
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 mt-4 text-sm font-semibold text-white bg-gray-700 rounded-md hover:bg-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit profile modal */}
      {isEditOpen && activeUser && (
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
                    placeholder={activeUser}
                    className="w-full px-0 py-3 mt-2 text-base text-gray-100 bg-transparent border-b border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-4 focus-visible:ring-offset-gray-950"
                  />
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
