/**
 * Bíblia gratuita via AO Lab (helloao.org) — sem chave, com cache IndexedDB.
 * Defaults: EN = BSB · PT = por_onbv (Open Nova Bíblia Viva).
 */

const API = "https://bible.helloao.org/api";
const PREF_KEY = "ancora_bible_prefs_v1";
const FAV_KEY = "ancora_bible_favs_v1";
const POS_KEY = "ancora_bible_pos_v1";
const PLAN_KEY = "ancora_bible_plan_v1";
const DB_NAME = "ancora_bible_cache";
const DB_STORE = "chapters";

export const DEFAULTS = {
  enId: "BSB",
  ptId: "por_onbv",
  easyEnId: "eng_bbe",
};

const STOP_EN = new Set(
  "a an the and or but if as of to in on for with by from that this is are was were be been being he she it they we you i his her their our your not no so then when who which what".split(
    " ",
  ),
);

const GLOSS = {
  god: "Deus",
  lord: "Senhor",
  jesus: "Jesus",
  christ: "Cristo",
  spirit: "Espírito",
  love: "amor / amar",
  loved: "amou",
  world: "mundo",
  son: "filho",
  believe: "crer",
  believes: "crê",
  life: "vida",
  eternal: "eterna",
  perish: "perecer",
  grace: "graça",
  faith: "fé",
  hope: "esperança",
  peace: "paz",
  sin: "pecado",
  sinner: "pecador",
  forgive: "perdoar",
  forgiveness: "perdão",
  father: "pai",
  mother: "mãe",
  heart: "coração",
  word: "palavra",
  truth: "verdade",
  light: "luz",
  dark: "trevas",
  kingdom: "reino",
  heaven: "céu",
  earth: "terra",
  pray: "orar",
  prayer: "oração",
  save: "salvar",
  salvation: "salvação",
  cross: "cruz",
  die: "morrer",
  died: "morreu",
  rise: "ressuscitar",
  rose: "ressuscitou",
  glory: "glória",
  merciful: "misericordioso",
  mercy: "misericórdia",
  compassion: "compaixão",
  ran: "correu",
  kissed: "beijou",
  kiss: "beijar",
};

let translationsCache = null;
let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function cacheGet(key) {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const req = db.transaction(DB_STORE, "readonly").objectStore(DB_STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function cacheSet(key, value) {
  try {
    const db = await openDb();
    await new Promise((resolve) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* ignore */
  }
}

export function loadPrefs() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(PREF_KEY) || "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePrefs(prefs) {
  localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
}

export function loadFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveFavorites(list) {
  localStorage.setItem(FAV_KEY, JSON.stringify(list.slice(0, 200)));
}

export function toggleFavorite(item) {
  const list = loadFavorites();
  const key = `${item.book}|${item.chapter}|${item.verse}`;
  const idx = list.findIndex((f) => `${f.book}|${f.chapter}|${f.verse}` === key);
  if (idx >= 0) list.splice(idx, 1);
  else list.unshift({ ...item, savedAt: new Date().toISOString() });
  saveFavorites(list);
  return list;
}

export function isFavorite(book, chapter, verse) {
  return loadFavorites().some((f) => f.book === book && f.chapter === chapter && f.verse === verse);
}

export function loadPosition() {
  try {
    return JSON.parse(localStorage.getItem(POS_KEY) || "null");
  } catch {
    return null;
  }
}

export function savePosition(pos) {
  localStorage.setItem(POS_KEY, JSON.stringify(pos));
}

export function loadPlanProgress() {
  try {
    return JSON.parse(localStorage.getItem(PLAN_KEY) || "{}");
  } catch {
    return {};
  }
}

export function savePlanProgress(data) {
  localStorage.setItem(PLAN_KEY, JSON.stringify(data));
}

function flattenContent(nodes) {
  if (!nodes) return "";
  if (typeof nodes === "string") return nodes;
  if (!Array.isArray(nodes)) {
    if (nodes.text) return String(nodes.text);
    if (nodes.content) return flattenContent(nodes.content);
    return "";
  }
  return nodes
    .map((n) => {
      if (typeof n === "string") return n;
      if (n?.text) return n.text;
      if (n?.content) return flattenContent(n.content);
      return "";
    })
    .join("");
}

export function parseChapterVerses(chapterJson) {
  const content = chapterJson?.chapter?.content || [];
  const verses = [];
  let heading = "";
  for (const node of content) {
    if (node.type === "heading") {
      heading = flattenContent(node.content);
    } else if (node.type === "verse") {
      verses.push({
        number: node.number,
        text: flattenContent(node.content).trim(),
        heading: heading || null,
      });
      heading = "";
    }
  }
  return {
    translation: chapterJson.translation,
    book: chapterJson.book,
    chapter: chapterJson.chapter?.number,
    verses,
  };
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ${res.status}`);
  return res.json();
}

export async function listTranslations() {
  if (translationsCache) return translationsCache;
  const cached = await cacheGet("translations_meta");
  if (cached?.list?.length) {
    translationsCache = cached.list;
    return translationsCache;
  }
  const data = await fetchJson(`${API}/available_translations.json`);
  const list = (data.translations || []).map((t) => ({
    id: t.id,
    name: t.name || t.englishName || t.id,
    shortName: t.shortName || t.id,
    language: t.language,
    languageName: t.languageName || t.languageEnglishName || t.language,
    languageEnglishName: t.languageEnglishName || t.language,
  }));
  translationsCache = list;
  await cacheSet("translations_meta", { list, at: Date.now() });
  return list;
}

export async function listLanguages() {
  const list = await listTranslations();
  const map = new Map();
  for (const t of list) {
    const key = t.language || "und";
    if (!map.has(key)) {
      map.set(key, {
        code: key,
        name: t.languageName || key,
        englishName: t.languageEnglishName || key,
        count: 0,
      });
    }
    map.get(key).count += 1;
  }
  return [...map.values()].sort((a, b) => a.englishName.localeCompare(b.englishName));
}

export function translationsForLanguage(list, langCode) {
  return list.filter((t) => t.language === langCode).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getBooks(translationId) {
  const key = `books_${translationId}`;
  const cached = await cacheGet(key);
  if (cached?.books) return cached.books;
  const data = await fetchJson(`${API}/${encodeURIComponent(translationId)}/books.json`);
  const books = (data.books || data || []).map((b) => ({
    id: b.id,
    name: b.commonName || b.name || b.id,
    chapters: b.numberOfChapters || b.chapters || 1,
    order: b.order ?? 0,
  }));
  await cacheSet(key, { books, at: Date.now() });
  return books;
}

export async function getChapter(translationId, bookId, chapter) {
  const key = `ch_${translationId}_${bookId}_${chapter}`;
  const cached = await cacheGet(key);
  if (cached?.parsed) return cached.parsed;
  const data = await fetchJson(
    `${API}/${encodeURIComponent(translationId)}/${encodeURIComponent(bookId)}/${chapter}.json`,
  );
  const parsed = parseChapterVerses(data);
  await cacheSet(key, { parsed, at: Date.now() });
  return parsed;
}

export async function prefetchChapter(translationId, bookId, chapter) {
  try {
    await getChapter(translationId, bookId, chapter);
  } catch {
    /* ignore */
  }
}

export function buildMiniLesson(enText, refLabel) {
  const words = String(enText || "")
    .replace(/[^\w\s'-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const keys = [];
  const seen = new Set();
  for (const w of words) {
    const low = w.toLowerCase();
    if (STOP_EN.has(low) || low.length < 3 || seen.has(low)) continue;
    seen.add(low);
    keys.push({ en: w, pt: GLOSS[low] || "→ contexto / dicionário" });
    if (keys.length >= 5) break;
  }
  const tip =
    keys.length >= 2
      ? `Leia o versículo em voz alta 2×. Depois diga em português: “${keys[0].en}” e “${keys[1].en}”.`
      : "Leia o versículo em inglês em voz alta e destaque 2 palavras novas.";
  return { ref: refLabel, words: keys, model: enText, tip };
}

export function bookLabel(books, bookId) {
  return books.find((b) => b.id === bookId)?.name || bookId;
}
