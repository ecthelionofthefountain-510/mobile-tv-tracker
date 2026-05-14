const AUTH_ACCOUNTS_KEY = "authAccounts";
const LEGACY_USERS_KEY = "users";
const REMEMBERED_SESSIONS_KEY = "rememberedSessions";

export function listRememberedSessions() {
  try {
    const parsed = safeJsonParse(
      localStorage.getItem(REMEMBERED_SESSIONS_KEY),
      [],
    );
    return Array.isArray(parsed)
      ? parsed.filter((u) => typeof u === "string" && u.trim())
      : [];
  } catch {
    return [];
  }
}

export function addRememberedSession(username) {
  const norm = normalizeUsername(username);
  if (!norm) return;
  try {
    const current = listRememberedSessions();
    if (!current.includes(norm)) {
      localStorage.setItem(
        REMEMBERED_SESSIONS_KEY,
        JSON.stringify([...current, norm]),
      );
    }
  } catch {
    // ignore
  }
}

export function removeRememberedSession(username) {
  const norm = normalizeUsername(username);
  if (!norm) return;
  try {
    const current = listRememberedSessions().filter((u) => u !== norm);
    localStorage.setItem(REMEMBERED_SESSIONS_KEY, JSON.stringify(current));
  } catch {
    // ignore
  }
}

function safeJsonParse(value, fallback) {
  if (value == null) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeUsername(username) {
  return String(username || "").trim();
}

function normalizeUsernameKey(username) {
  return normalizeUsername(username).toLowerCase();
}

function readAccounts() {
  try {
    const parsed = safeJsonParse(localStorage.getItem(AUTH_ACCOUNTS_KEY), []);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAccounts(accounts) {
  try {
    localStorage.setItem(AUTH_ACCOUNTS_KEY, JSON.stringify(accounts));
    return true;
  } catch {
    return false;
  }
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function randomSalt() {
  const bytes = new Uint8Array(16);
  const webCrypto = globalThis.crypto;
  if (webCrypto?.getRandomValues) {
    webCrypto.getRandomValues(bytes);
    return bytesToHex(bytes);
  }

  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytesToHex(bytes);
}

async function digestSha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const webCrypto = globalThis.crypto;

  if (webCrypto?.subtle?.digest) {
    const hash = await webCrypto.subtle.digest("SHA-256", data);
    return bytesToHex(new Uint8Array(hash));
  }

  // Deterministic fallback for environments without Web Crypto.
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return String(hash >>> 0);
}

async function hashPassword(password, salt) {
  return digestSha256(`${salt}:${password}`);
}

function getLegacyUsers() {
  try {
    const parsed = safeJsonParse(localStorage.getItem(LEGACY_USERS_KEY), []);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((user) => typeof user === "string" && user.trim());
  } catch {
    return [];
  }
}

export function listKnownUsernames() {
  const accounts = readAccounts();
  const accountUsernames = accounts
    .map((account) => account?.username)
    .filter((username) => typeof username === "string" && username.trim());

  return Array.from(new Set([...getLegacyUsers(), ...accountUsernames]));
}

export function getAccount(username) {
  const key = normalizeUsernameKey(username);
  if (!key) return null;

  return readAccounts().find((account) => account?.usernameKey === key) || null;
}

export async function registerAccount(username, password) {
  const normalizedUsername = normalizeUsername(username);
  const normalizedPassword = String(password || "");

  if (!normalizedUsername) {
    return { ok: false, error: "Enter a username." };
  }

  if (normalizedPassword.length < 6) {
    return {
      ok: false,
      error: "Use at least 6 characters for the password.",
    };
  }

  const accounts = readAccounts();
  const key = normalizeUsernameKey(normalizedUsername);
  const existing = accounts.find((account) => account?.usernameKey === key);

  if (existing) {
    return {
      ok: false,
      error: "This account already exists. Sign in instead.",
    };
  }

  const salt = randomSalt();
  const passwordHash = await hashPassword(normalizedPassword, salt);

  accounts.push({
    username: normalizedUsername,
    usernameKey: key,
    salt,
    passwordHash,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  });

  const ok = saveAccounts(accounts);
  return ok
    ? { ok: true, account: getAccount(normalizedUsername) }
    : { ok: false, error: "Could not save account." };
}

export async function verifyAccount(username, password) {
  const normalizedUsername = normalizeUsername(username);
  const normalizedPassword = String(password || "");

  if (!normalizedUsername || !normalizedPassword) {
    return { ok: false, error: "Enter your username and password." };
  }

  const account = getAccount(normalizedUsername);
  if (!account) {
    return { ok: false, error: "No account found for that username." };
  }

  const nextHash = await hashPassword(normalizedPassword, account.salt);
  if (nextHash !== account.passwordHash) {
    return { ok: false, error: "Wrong password." };
  }

  const accounts = readAccounts().map((item) =>
    item?.usernameKey === account.usernameKey
      ? { ...item, lastLoginAt: new Date().toISOString() }
      : item,
  );
  saveAccounts(accounts);

  return { ok: true, account: getAccount(normalizedUsername) };
}

export function hasAccount(username) {
  return !!getAccount(username);
}

export function renameLegacyUsersIfMissing(username) {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) return;

  try {
    const users = safeJsonParse(localStorage.getItem(LEGACY_USERS_KEY), []);
    if (!Array.isArray(users)) return;
    const exists = users.some(
      (user) =>
        normalizeUsernameKey(user) === normalizeUsernameKey(normalizedUsername),
    );
    if (exists) return;
    users.push(normalizedUsername);
    localStorage.setItem(LEGACY_USERS_KEY, JSON.stringify(users));
  } catch {
    // ignore
  }
}
