/** Senha fixa de acesso */
export const SENHA_FIXA = "Ronaldo@6991";

export function verifyPassword(password) {
  const digitada = String(password ?? "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
  return digitada === SENHA_FIXA;
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
