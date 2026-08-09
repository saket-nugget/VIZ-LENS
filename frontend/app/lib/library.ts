// No-login My Library: typed helpers over localStorage key vl_library.
// Never stores HTML. Storage is injectable for tests; every access is
// try/catch'd so blocked/full/absent localStorage never crashes the app.

export type LibraryEntry = {
  slug: string;
  query: string;
  topic: string;
  date: string; // ISO timestamp
  quizScore: number | null;
};

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const KEY = "vl_library";
const MAX_ENTRIES = 200;

function defaultStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // storage access blocked (e.g. privacy settings)
  }
}

export function readLibrary(storage: StorageLike | null = defaultStorage()): LibraryEntry[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return []; // corrupt JSON or blocked read
  }
}

function writeLibrary(entries: LibraryEntry[], storage: StorageLike | null): void {
  if (!storage) return;
  try {
    storage.setItem(KEY, JSON.stringify(entries));
  } catch {
    // quota full or blocked — losing library writes is acceptable
  }
}

export function addToLibrary(entry: LibraryEntry, storage: StorageLike | null = defaultStorage()): void {
  const entries = readLibrary(storage);
  const withoutDupe = entries.filter((e) => e.slug !== entry.slug);
  const next = [...withoutDupe, entry].slice(-MAX_ENTRIES); // FIFO: oldest dropped first
  writeLibrary(next, storage);
}

export function updateQuizScore(
  slug: string,
  quizScore: number,
  storage: StorageLike | null = defaultStorage()
): void {
  const entries = readLibrary(storage);
  writeLibrary(
    entries.map((e) => (e.slug === slug ? { ...e, quizScore } : e)),
    storage
  );
}
