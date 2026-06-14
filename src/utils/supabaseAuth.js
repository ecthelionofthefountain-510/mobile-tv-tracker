// src/utils/supabaseAuth.js
import { supabase } from "./supabaseClient";

// Turn a Supabase auth user into a friendly display name used across the app
// (avatars, per-user data keys, greetings). Falls back to the email's local
// part, then the user id.
export function deriveDisplayName(user) {
  if (!user) return null;
  const meta = user.user_metadata || {};
  const fromMeta =
    typeof meta.display_name === "string" ? meta.display_name.trim() : "";
  if (fromMeta) return fromMeta;
  if (user.email) return user.email.split("@")[0];
  return user.id;
}

export async function signUpWithEmail(email, password, displayName) {
  const trimmedEmail = String(email || "").trim();
  const name = String(displayName || "").trim() || trimmedEmail.split("@")[0];

  const { data, error } = await supabase.auth.signUp({
    email: trimmedEmail,
    password,
    options: { data: { display_name: name } },
  });

  if (error) return { ok: false, error: error.message };

  // When email confirmation is enabled, Supabase returns no session yet.
  return {
    ok: true,
    session: data.session,
    needsEmailConfirmation: !data.session,
  };
}

export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(email || "").trim(),
    password,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, session: data.session };
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  return { ok: !error, error: error?.message || null };
}

export async function getCurrentSession() {
  const { data } = await supabase.auth.getSession();
  return data.session || null;
}

export function onAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session || null);
  });
  return () => data.subscription.unsubscribe();
}
