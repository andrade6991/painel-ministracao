const AUTH_LS = "painel_ministracao_auth_hash";
const AUTH_SALT = "painel-ministracao-v1";

export function getStoredHash() {
  return localStorage.getItem(AUTH_LS) || null;
}

export async function loadDeployedHash() {
  try {
    const res = await fetch("data/auth-hash.json", { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.hash) {
      if (!getStoredHash()) localStorage.setItem(AUTH_LS, json.hash);
      return json.hash;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function sha256(text) {
  const data = new TextEncoder().encode(`${AUTH_SALT}:${text}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function generatePassword(len = 16) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  return [...arr].map((n) => chars[n % chars.length]).join("");
}

export async function savePassword(password) {
  const hash = await sha256(password);
  localStorage.setItem(AUTH_LS, hash);
  return hash;
}

export async function verifyPassword(password) {
  const stored = getStoredHash();
  if (!stored) return false;
  return (await sha256(password)) === stored;
}

export function exportAuthHash() {
  const hash = getStoredHash();
  if (!hash) return null;
  return { version: 1, algo: "sha256", salt: AUTH_SALT, hash, createdAt: new Date().toISOString() };
}

export function clearSessionFlag() {
  sessionStorage.removeItem("painel_ministracao_ok");
}

export function markSessionOk() {
  sessionStorage.setItem("painel_ministracao_ok", "1");
}

export function hasSessionOk() {
  return sessionStorage.getItem("painel_ministracao_ok") === "1";
}
