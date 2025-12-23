import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get as idbGet, set as idbSet } from "idb-keyval";
import { FaCamera, FaChevronLeft } from "react-icons/fa";
import { getCurrentUser } from "../utils/favoritesStorage";

const profileAvatarKeyForUser = (user) =>
  user ? `profileAvatar_${user}` : "profileAvatar";

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

  const activeUser = useMemo(() => {
    const u = currentUser || getCurrentUser();
    return typeof u === "string" && u.trim() ? u : null;
  }, [currentUser]);

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
    const trimmed = newUser.trim();
    if (!trimmed) return;
    if (users.includes(trimmed)) return;

    const updatedUsers = [...users, trimmed];
    setUsers(updatedUsers);
    localStorage.setItem("users", JSON.stringify(updatedUsers));
    setNewUser("");
  };

  const switchUser = (user) => {
    setCurrentUser(user);
    localStorage.setItem("currentUser", JSON.stringify(user));
  };

  const removeUser = (user) => {
    const updatedUsers = users.filter((u) => u !== user);
    setUsers(updatedUsers);
    localStorage.setItem("users", JSON.stringify(updatedUsers));

    if (currentUser === user) {
      setCurrentUser(null);
      localStorage.removeItem("currentUser");
    }
  };

  const handleImageChange = (user, file) => {
    (async () => {
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
          <div className="px-4 pb-3 text-center text-gray-100 border-b-2 border-gray-100">
            Account
          </div>
          <div className="px-4 pb-3 text-center opacity-60">App</div>
          <div className="px-4 pb-3 text-center opacity-60">Upcoming</div>
        </div>
      </div>

      <div className="px-4 pt-6 pb-10">
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
                <div className="text-sm text-gray-400">No users yet.</div>
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
    </div>
  );
};

export default SettingsPage;
