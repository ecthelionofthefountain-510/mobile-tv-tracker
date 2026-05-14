import React, { useMemo, useState } from "react";
import {
  listRememberedSessions,
  registerAccount,
  verifyAccount,
  renameLegacyUsersIfMissing,
} from "../utils/authStorage";

const LoginPage = ({ onLogin }) => {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const knownUsers = useMemo(() => listRememberedSessions(), []);

  const quickLogin = (user) => {
    renameLegacyUsersIfMissing(user);
    onLogin(user);
  };

  const resetSecretFields = () => {
    setPassword("");
    setConfirmPassword("");
  };

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    setError("");
    setSuccess("");
    resetSecretFields();
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const normalizedUsername = username.trim();
    const normalizedPassword = password;

    if (!normalizedUsername) {
      setError("Enter a username.");
      return;
    }

    if (mode === "register") {
      if (normalizedPassword.length < 6) {
        setError("Use at least 6 characters for the password.");
        return;
      }

      if (normalizedPassword !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      if (mode === "register") {
        const result = await registerAccount(
          normalizedUsername,
          normalizedPassword,
        );
        if (!result.ok) {
          setError(result.error || "Could not create account.");
          return;
        }

        renameLegacyUsersIfMissing(normalizedUsername);
        setSuccess("Account created. Welcome back.");
        onLogin(normalizedUsername);
        return;
      }

      const result = await verifyAccount(
        normalizedUsername,
        normalizedPassword,
      );
      if (!result.ok) {
        setError(result.error || "Could not sign in.");
        return;
      }

      renameLegacyUsersIfMissing(normalizedUsername);
      setSuccess("Signed in successfully.");
      onLogin(normalizedUsername);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="h-[100dvh] overflow-hidden bg-[#edf0f4] font-sans text-slate-900 sm:bg-[#edf0f4]">
      {/* blur blobs – only visible on sm+ where card is centered */}
      <div className="absolute inset-0 hidden pointer-events-none sm:block">
        <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-white/90 to-transparent" />
        <div className="absolute left-[-3rem] top-20 h-48 w-48 rounded-full bg-white/75 blur-3xl" />
        <div className="absolute right-[-4rem] bottom-8 h-56 w-56 rounded-full bg-slate-200/80 blur-3xl" />
      </div>

      <div className="relative flex items-stretch w-full h-full sm:items-center sm:px-6 sm:py-8">
        <section className="relative flex h-full w-full flex-col overflow-hidden bg-white sm:h-auto sm:mx-auto sm:max-w-[860px] sm:rounded-[2.2rem] sm:border sm:border-white/70 sm:bg-white/82 sm:p-3 sm:shadow-[0_38px_100px_rgba(15,23,42,0.14)] sm:backdrop-blur-xl sm:p-4">
          <div className="flex flex-1 flex-col overflow-hidden sm:rounded-[1.8rem] sm:border sm:border-slate-200/90 sm:bg-[#fbfbfc] sm:shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
            <div className="flex flex-1 flex-col gap-0 md:grid md:grid-cols-[0.9fr_1.1fr]">
              <div
                className="relative flex flex-1 flex-col justify-between border-b border-slate-200 bg-[#fbfbfc] p-6 pb-0 sm:p-8 md:border-b-0"
                style={{ minHeight: "min(360px, 50vh)" }}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-[2.6rem] font-black uppercase leading-[0.88] tracking-[-0.09em] text-black sm:text-[3.9rem]">
                      {mode === "login" ? "Sign in" : "Sign up"}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleModeChange(
                          mode === "login" ? "register" : "login",
                        )
                      }
                      className="pt-1 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-slate-500 transition-colors hover:text-slate-900"
                    >
                      / {mode === "login" ? "Up" : "In"}
                    </button>
                  </div>

                  {knownUsers.length > 0 && (
                    <div className="mt-6">
                      <p className="mb-2 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-slate-400">
                        Quick switch
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {knownUsers.map((user) => (
                          <button
                            key={user}
                            type="button"
                            onClick={() => quickLogin(user)}
                            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-700 transition-all hover:border-slate-800 hover:bg-slate-900 hover:text-white"
                          >
                            {user}
                            <span className="opacity-50">→</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-8 space-y-6 sm:mt-10">
                    <label className="block">
                      <span className="mb-2 block text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                        Username
                      </span>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value);
                          if (error) setError("");
                          if (success) setSuccess("");
                        }}
                        onKeyDown={handleSubmitKeyDown}
                        placeholder="Username"
                        autoComplete="username"
                        className="w-full border-0 border-b border-slate-300 bg-transparent px-0 py-3 text-[1.08rem] font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-950 focus:ring-0"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                        Password
                      </span>
                      <div className="flex items-center gap-2 py-2 border-b border-slate-300 focus-within:border-slate-950">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (error) setError("");
                            if (success) setSuccess("");
                          }}
                          onKeyDown={handleSubmitKeyDown}
                          placeholder="Password"
                          autoComplete={
                            mode === "register"
                              ? "new-password"
                              : "current-password"
                          }
                          className="min-w-0 flex-1 border-0 bg-transparent px-0 py-1 text-[1.08rem] font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((value) => !value)}
                          className="shrink-0 rounded-full border border-slate-200 px-3 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-slate-500 hover:bg-slate-100"
                        >
                          {showPassword ? "Hide" : "Show"}
                        </button>
                      </div>
                    </label>

                    {mode === "register" && (
                      <label className="block">
                        <span className="mb-2 block text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                          Confirm password
                        </span>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            if (error) setError("");
                            if (success) setSuccess("");
                          }}
                          onKeyDown={handleSubmitKeyDown}
                          placeholder="Confirm password"
                          autoComplete="new-password"
                          className="w-full border-0 border-b border-slate-300 bg-transparent px-0 py-3 text-[1.08rem] font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-950 focus:ring-0"
                        />
                      </label>
                    )}

                    <div className="flex items-center justify-end pt-2">
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="rounded-full bg-slate-950 px-8 py-3 text-[0.74rem] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSubmitting
                          ? mode === "login"
                            ? "Signing in..."
                            : "Creating..."
                          : "Enter"}
                      </button>
                    </div>

                    {(error || success) && (
                      <p
                        className={
                          "text-xs font-medium " +
                          (error ? "text-rose-600" : "text-emerald-600")
                        }
                        role="status"
                      >
                        {error || success}
                      </p>
                    )}
                  </div>
                </div>

                <div
                  className="relative mt-auto -mx-6 overflow-hidden bg-[#f4f6fa] sm:mx-0"
                  style={{ minHeight: "max(260px, 35vh)" }}
                >
                  <img
                    src={`${import.meta.env.BASE_URL}img/background.avif`}
                    alt=""
                    className="absolute bottom-0 right-0 object-cover object-center w-full h-full opacity-85"
                    style={{
                      filter: "grayscale(0.28) sepia(0.38) saturate(1.18)",
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#22130d]/88 via-[#2f1d14]/52 to-transparent" />
                  <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white via-white/75 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6 text-right text-white md:p-8">
                    <div className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.28em] text-white/60">
                      Mobile TV Tracker
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LoginPage;
