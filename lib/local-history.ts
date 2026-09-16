"use client";

// Anonymous visitors have no account to hang history off, so the lists they
// made and voted on are remembered in this browser only.
const CREATED_KEY = "rankit:created";
const VOTED_KEY = "rankit:voted";
const LIMIT = 50;

export type HistoryEntry = {
  slug: string;
  title: string;
  savedAt: number;
};

function read(key: string): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is HistoryEntry =>
        Boolean(entry) &&
        typeof (entry as HistoryEntry).slug === "string" &&
        typeof (entry as HistoryEntry).title === "string"
      )
      .map((entry) => ({ ...entry, savedAt: Number(entry.savedAt) || 0 }))
      .sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

function write(key: string, entries: HistoryEntry[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(entries.slice(0, LIMIT)));
  } catch {
    // Private browsing and blocked storage are not worth failing a vote over.
  }
}

function remember(key: string, entry: Omit<HistoryEntry, "savedAt">) {
  if (typeof window === "undefined") return;
  const existing = read(key).filter((saved) => saved.slug !== entry.slug);
  write(key, [{ ...entry, savedAt: Date.now() }, ...existing]);
}

export function rememberCreatedList(slug: string, title: string) {
  remember(CREATED_KEY, { slug, title });
}

export function rememberVotedList(slug: string, title: string) {
  remember(VOTED_KEY, { slug, title });
}

export function getCreatedLists() {
  return read(CREATED_KEY);
}

export function getVotedLists() {
  return read(VOTED_KEY);
}

export function clearHistory() {
  try {
    window.localStorage.removeItem(CREATED_KEY);
    window.localStorage.removeItem(VOTED_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}
