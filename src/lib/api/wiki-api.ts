import type { WikiArticle } from '$lib/types';

const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const USER_AGENT = 'Moonflower/1.0 (WikiGacha Experiment Platform; https://github.com/moonflower)';

export interface FetchArticlesOptions {
	/** Number of random articles to request (max 20, default 10). */
	count?: number;
	/** Number of intro sentences per article (default 3). */
	sentences?: number;
	/** Include page thumbnail when available (default true). */
	withThumbnails?: boolean;
}

/**
 * Fetch random Wikipedia articles from the Wikimedia API.
 *
 * This is the shared helper that every experiment should use
 * to source gacha content. It runs server-side only.
 */
export async function fetchRandomArticles(
	options: FetchArticlesOptions = {}
): Promise<WikiArticle[]> {
	const { count = 10, sentences = 3, withThumbnails = true } = options;

	const params = new URLSearchParams({
		action: 'query',
		format: 'json',
		generator: 'random',
		grnnamespace: '0',
		grnlimit: String(Math.min(count, 20)),
		prop: withThumbnails ? 'extracts|pageimages' : 'extracts',
		exintro: 'true',
		explaintext: 'true',
		exsentences: String(sentences)
	});

	if (withThumbnails) {
		params.set('piprop', 'thumbnail');
		params.set('pithumbsize', '400');
	}

	const res = await fetch(`${WIKI_API}?${params}`, {
		headers: { 'User-Agent': USER_AGENT }
	});

	if (!res.ok) {
		throw new Error(`Wikimedia API responded with ${res.status}`);
	}

	const data = await res.json();

	const pages = Object.values(data.query?.pages ?? {}) as Array<{
		pageid: number;
		title: string;
		extract?: string;
		thumbnail?: { source: string };
	}>;

	return pages
		.filter((p) => p.extract && p.extract.trim().length > 0 && p.thumbnail?.source)
		.map((p) => ({
			pageId: p.pageid,
			title: p.title,
			extract: p.extract ?? '',
			thumbnail: p.thumbnail?.source
		}));
}
