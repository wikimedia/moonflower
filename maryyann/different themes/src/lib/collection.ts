import type { WikiCard } from "../types";

const KEY = "wiki-themes-collection-v1";

export interface StoredCard extends WikiCard {
  savedAt: string;
}

function readRaw(): StoredCard[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as StoredCard[];
  } catch {
    return [];
  }
}

export function loadCollection(): StoredCard[] {
  return readRaw();
}

export function saveKeptCard(card: WikiCard): void {
  const existing = readRaw();
  if (existing.some((c) => c.pageid === card.pageid)) return;
  const next: StoredCard[] = [
    ...existing,
    { ...card, savedAt: new Date().toISOString() },
  ];
  localStorage.setItem(KEY, JSON.stringify(next));
}
