import type { WikiArticle } from '$lib/types';

const KEY = 'moonflower-walk-v1';

function readRaw(): WikiArticle[] {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(
			(x): x is WikiArticle =>
				typeof x === 'object' &&
				x !== null &&
				typeof (x as WikiArticle).pageId === 'number' &&
				typeof (x as WikiArticle).title === 'string' &&
				typeof (x as WikiArticle).extract === 'string'
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