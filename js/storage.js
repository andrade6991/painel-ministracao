const KEY = "painel_ministracao_v1";

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

/** Carrega seeds e acrescenta itens novos por id (sem apagar o que o usuário já editou). */
export async function mergeSeedData(store) {
  const files = [
    ["data/messages.json", "messages"],
    ["data/ebd-lessons.json", "ebd"],
  ];
  for (const [path, key] of files) {
    try {
      const res = await fetch(path);
      if (!res.ok) continue;
      const json = await res.json();
      const seeds = Array.isArray(json) ? json : json[key] || [];
      if (!store[key]?.length) {
        store[key] = seeds;
        continue;
      }
      const have = new Set(store[key].map((x) => x.id));
      const missing = seeds.filter((s) => s.id && !have.has(s.id));
      if (missing.length) {
        store[key] = [...missing, ...store[key]];
      }
    } catch {
      /* offline / file open */
    }
  }
  saveStore(store);
  return store;
}
