import { json } from '@sveltejs/kit';
import { fetchRandomArticles } from '$lib/api/wiki-api';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const count = Math.min(Number(url.searchParams.get('count') ?? 5), 20);
	const sentences = Math.min(Number(url.searchParams.get('sentences') ?? 3), 10);
	const requireImages = url.searchParams.get('requireImages') === 'true';

	try {
		const articles = await fetchRandomArticles({ count: count * 2, sentences, requireImages });
		return json(articles.slice(0, count));
	} catch {
		return json([], { status: 502 });
	}
};
