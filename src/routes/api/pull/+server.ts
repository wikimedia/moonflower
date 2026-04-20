import { json } from '@sveltejs/kit';
import { fetchRandomArticles } from '$lib/api/wiki-api';
import type { WikiArticle } from '$lib/types';
import type { RequestHandler } from './$types';

const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const USER_AGENT = 'Moonflower/1.0 (WikiGacha Experiment Platform; https://github.com/moonflower)';

async function fetchArticlesByTitles(titles: string[], sentences: number): Promise<WikiArticle[]> {
	const cleanTitles = Array.from(
		new Set(
			titles
				.map((title) => title.trim())
				.filter((title) => title.length > 0)
		)
	).slice(0, 50);

	if (cleanTitles.length === 0) {
		return [];
	}

	const params = new URLSearchParams({
		action: 'query',
		format: 'json',
		titles: cleanTitles.join('|'),
		redirects: '1',
		prop: 'extracts|pageimages',
		exintro: 'true',
		explaintext: 'true',
		exsentences: String(sentences),
		piprop: 'thumbnail',
		pithumbsize: '400'
	});

	const response = await fetch(`${WIKI_API}?${params.toString()}`, {
		headers: { 'User-Agent': USER_AGENT }
	});

	if (!response.ok) {
		throw new Error(`Wikimedia API responded with ${response.status}`);
	}

	const data = await response.json();
	const pages = Object.values(data.query?.pages ?? {}) as Array<{
		pageid?: number;
		title?: string;
		extract?: string;
		thumbnail?: { source?: string };
	}>;

	return pages
		.filter((page) => typeof page.pageid === 'number' && typeof page.title === 'string')
		.map((page) => ({
			pageId: page.pageid as number,
			title: page.title as string,
			extract: page.extract ?? '',
			thumbnail: page.thumbnail?.source
		}));
}

export const GET: RequestHandler = async ({ url }) => {
	const count = Math.min(Number(url.searchParams.get('count') ?? 5), 20);
	const sentences = Math.min(Number(url.searchParams.get('sentences') ?? 3), 10);
	const titlesParam = url.searchParams.get('titles');

	if (titlesParam) {
		const titles = titlesParam
			.split(',')
			.map((title) => title.trim())
			.filter((title) => title.length > 0);

		try {
			const articles = await fetchArticlesByTitles(titles, sentences);
			return json(articles);
		} catch {
			return json([], { status: 502 });
		}
	}

	try {
		const articles = await fetchRandomArticles({ count: count * 2, sentences });
		return json(articles.slice(0, count));
	} catch {
		return json([], { status: 502 });
	}
};
