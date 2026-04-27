import type { WikiArticle } from '$lib/types';

const KEY = 'moonflower-wiki-crawler-v1';

function readRaw(): WikiArticle[] {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(
			(entry): entry is WikiArticle =>
				typeof entry === 'object' &&
				entry !== null &&
				typeof (entry as WikiArticle).pageId === 'number' &&
				typeof (entry as WikiArticle).title === 'string' &&
				typeof (entry as WikiArticle).extract === 'string'
		);
	} catch {
		return [];
	}
}

export function saveKeptIfNew(article: WikiArticle): void {
	const existing = readRaw();
	if (existing.some((entry) => entry.pageId === article.pageId)) return;
	localStorage.setItem(KEY, JSON.stringify([...existing, article]));
}