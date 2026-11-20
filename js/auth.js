const AUTH_SALT = "painel-ministracao-v1";
/** Hash de Ronaldo@6991 — acesso fixo, sem gerador */
const FIXED_HASH = "b19ab731a1803972cac78941349cf204640b73d5d2ea78c582d3bacaba5ad79e";

export async function sha256(text) {
  const data = new TextEncoder().encode(`${AUTH_SALT}:${text}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPassword(password) {
  return (await sha256(password)) === FIXED_HASH;
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
