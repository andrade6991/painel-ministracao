const KEY = "painel_ministracao_v2";

const emptyStore = () => ({
  messages: [],
  ebd: [],
  session: false,
  publicOnly: false,
});

export function loadStore() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw);
    const store = { ...emptyStore(), ...parsed };
    delete store.transcriptions;
    return store;
  } catch {
    return emptyStore();
  }
}

export function saveStore(store) {
  const { session, publicOnly, transcriptions, ...data } = store;
  localStorage.setItem(KEY, JSON.stringify(data));
  store.session = session;
  store.publicOnly = publicOnly;
}

export function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Carrega seeds da WEB:
 * - se Acervo vazio → usa seeds
 * - acrescenta ids novos
 * - atualiza mensagens seed publicadas (msg_* do JSON) quando o seed está mais novo
 *   (não sobrescreve ids criados pelo usuário, ex.: msg_xxxxx aleatório)
 */
export async function mergeSeedData(store) {
  const files = [
    ["data/messages.json", "messages"],
    ["data/ebd-lessons.json", "ebd"],
  ];
  for (const [path, key] of files) {
    try {
      const res = await fetch(`${path}?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) continue;
      const json = await res.json();
      const seeds = Array.isArray(json) ? json : json[key] || [];
      if (!store[key]?.length) {
        store[key] = seeds;
        continue;
      }
      const byId = new Map(store[key].map((x) => [x.id, x]));
      const missing = [];
      for (const seed of seeds) {
        if (!seed?.id) continue;
        const local = byId.get(seed.id);
        if (!local) {
          missing.push(seed);
          continue;
        }
        const isCatalogSeed = /^(msg_|ebd_)/.test(seed.id);
        if (isCatalogSeed && seed.publicado) {
          const seedAt = Date.parse(seed.updatedAt || 0) || 0;
          const localAt = Date.parse(local.updatedAt || 0) || 0;
          if (seedAt >= localAt) {
            Object.assign(local, seed);
          }
        }
      }
      if (missing.length) store[key] = [...missing, ...store[key]];
    } catch {
      /* offline / file open */
    }
  }
  saveStore(store);
  return store;
}
