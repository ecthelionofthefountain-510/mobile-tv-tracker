import React, { useMemo, useState } from "react";

const LoginPage = ({ onLogin }) => {
  const [users, setUsers] = useState(
    () => JSON.parse(localStorage.getItem("users") || "[]") || [],
  );
  const [newUser, setNewUser] = useState("");
  const [error, setError] = useState("");

  const normalizedUsers = useMemo(
    () => users.filter((u) => typeof u === "string" && u.trim()),
    [users],
  );

  const persistUsers = (nextUsers) => {
    setUsers(nextUsers);
    try {
      localStorage.setItem("users", JSON.stringify(nextUsers));
    } catch {
      // ignore
    }
  };

  const createAndLogin = () => {
    const name = newUser.trim();
    if (!name) {
      setError("Enter a profile name.");
      return;
    }

    const exists = normalizedUsers.some(
      (u) => u.toLowerCase() === name.toLowerCase(),
    );
    const finalName = exists
      ? normalizedUsers.find((u) => u.toLowerCase() === name.toLowerCase())
      : name;

    if (!exists) {
      persistUsers([...normalizedUsers, name]);
    }

    setError("");
    setNewUser("");
    onLogin(finalName || name);
  };

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="app-panel-solid p-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-yellow-300/90">
            Welcome back
          </div>
          <h1 className="mt-2 text-3xl font-bold text-gray-100">
            Choose profile
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Track separately per person on this device.
          </p>

          <div className="mt-5 space-y-2">
            {normalizedUsers.length === 0 && (
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-400">
                No profiles yet. Create your first profile below.
              </div>
            )}

            {normalizedUsers.map((user) => (
              <button
                key={user}
                type="button"
                onClick={() => onLogin(user)}
                className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition-colors hover:bg-white/10"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user)}`}
                    alt={user}
                    className="h-9 w-9 rounded-full border border-white/10 object-cover"
                    loading="lazy"
                  />
                  <span className="font-semibold text-gray-100">{user}</span>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-300">
                  Open
                </span>
              </button>
            ))}
          </div>

          <div className="mt-6 border-t border-white/10 pt-5">
            <div className="text-sm font-semibold text-gray-200">
              Create new profile
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={newUser}
                onChange={(e) => {
                  setNewUser(e.target.value);
                  if (error) setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") createAndLogin();
                }}
                placeholder="Type a name"
                className="app-input flex-1"
              />
              <button
                type="button"
                onClick={createAndLogin}
                className="app-button-primary px-4 py-2"
              >
                Continue
              </button>
            </div>
            {error && <div className="mt-2 text-xs text-red-300">{error}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
