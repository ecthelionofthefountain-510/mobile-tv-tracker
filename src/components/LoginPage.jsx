import React, { useState } from "react";
import { signInWithEmail, signUpWithEmail } from "../utils/supabaseAuth";

const LoginPage = () => {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  const clearMessages = () => {
    if (error) setError("");
    if (success) setSuccess("");
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    if (mode === "register") {
      if (password.length < 6) {
        setError("Use at least 6 characters for the password.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    } else if (!password) {
      setError("Enter your password.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      if (mode === "register") {
        const result = await signUpWithEmail(normalizedEmail, password);
        if (!result.ok) {
          setError(result.error || "Could not create account.");
          return;
        }

        if (result.needsEmailConfirmation) {
          setSuccess(
            "Account created. Check your email to confirm, then sign in.",
          );
          setMode("login");
          resetSecretFields();
          return;
        }

        // Signed in immediately — the auth listener in App redirects.
        setSuccess("Account created. Welcome!");
        return;
      }

      const result = await signInWithEmail(normalizedEmail, password);
      if (!result.ok) {
        setError(result.error || "Could not sign in.");
        return;
      }

      // The auth listener in App picks up the session and redirects.
      setSuccess("Signed in successfully.");
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
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-gray-900 via-gray-950 to-black flex items-center justify-center px-4 py-8">
      {/* Animated background blur blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-yellow-600/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-yellow-500/5 blur-3xl" />
        <div className="absolute top-1/2 right-0 w-80 h-80 rounded-full bg-gray-700/5 blur-3xl" />
      </div>

      {/* Main card */}
      <div className="relative w-full max-w-sm">
        <div className="app-panel p-8 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">
              {mode === "login" ? "Welcome back" : "Create account"}
            </h1>
            <p className="text-sm text-gray-400">
              {mode === "login"
                ? "Sign in to your TV tracker"
                : "Start tracking your shows"}
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Email */}
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 block">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearMessages();
                }}
                onKeyDown={handleSubmitKeyDown}
                placeholder="you@example.com"
                autoComplete="email"
                className="app-input text-sm"
              />
            </label>

            {/* Password */}
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 block">
                Password
              </span>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearMessages();
                  }}
                  onKeyDown={handleSubmitKeyDown}
                  placeholder="Your password"
                  autoComplete={
                    mode === "register" ? "new-password" : "current-password"
                  }
                  className="app-input text-sm pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 text-xs font-semibold text-yellow-400/70 hover:text-yellow-400 transition-colors"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            {/* Confirm password (register mode) */}
            {mode === "register" && (
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 block">
                  Confirm password
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    clearMessages();
                  }}
                  onKeyDown={handleSubmitKeyDown}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  className="app-input text-sm"
                />
              </label>
            )}
          </div>

          {/* Error or success message */}
          {(error || success) && (
            <div
              className={
                "p-3 rounded-lg text-sm font-medium " +
                (error
                  ? "bg-red-600/20 border border-red-500/30 text-red-200"
                  : "bg-green-600/20 border border-green-500/30 text-green-200")
              }
              role="status"
            >
              {error || success}
            </div>
          )}

          {/* Submit button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="app-button-primary w-full py-3 font-semibold text-sm"
          >
            {isSubmitting
              ? mode === "login"
                ? "Signing in..."
                : "Creating..."
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>

          {/* Toggle mode */}
          <div className="pt-2 border-t border-white/10">
            <p className="text-xs text-gray-400 text-center">
              {mode === "login"
                ? "Don't have an account? "
                : "Already have an account? "}
              <button
                type="button"
                onClick={() =>
                  handleModeChange(mode === "login" ? "register" : "login")
                }
                className="text-yellow-400 hover:text-yellow-300 font-semibold transition-colors"
              >
                {mode === "login" ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>
        </div>

        {/* Branding */}
        <p className="text-center text-xs text-gray-600 mt-6 font-medium">
          Mobile TV Tracker
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
