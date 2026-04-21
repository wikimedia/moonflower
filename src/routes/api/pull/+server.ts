import { json } from '@sveltejs/kit';
import { fetchRandomArticles } from '$lib/api/wiki-api';
import type { WikiArticle } from '$lib/types';
import type { RequestHandler } from './$types';

const WIKI_BATCH = 20;
const MAX_MERGE_ROUNDS = 5;

export const GET: RequestHandler = async ({ url }) => {
	const count = Math.min(Number(url.searchParams.get('count') ?? 5), 20);
	const sentences = Math.min(Number(url.searchParams.get('sentences') ?? 3), 10);

	try {
		const seen = new Set<number>();
		const merged: WikiArticle[] = [];
		let rounds = 0;

		while (merged.length < count && rounds < MAX_MERGE_ROUNDS) {
			rounds++;
			const batch = await fetchRandomArticles({ count: WIKI_BATCH, sentences });
			for (const a of batch) {
				if (seen.has(a.pageId)) continue;
				seen.add(a.pageId);
				merged.push(a);
				if (merged.length >= count) break;
			}
		}

		const pulled = merged.slice(0, count);
		return json(pulled);
	} catch {
		return json([], { status: 502 });
	}
};
