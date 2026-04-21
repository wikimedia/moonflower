const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const WIKI_REST = 'https://en.wikipedia.org/api/rest_v1';

export interface BrowseArticle {
	pageId: number;
	title: string;
	extract: string;
	htmlContent: string;
	thumbnail?: string;
}

interface ParseResponse {
	parse?: {
		pageid?: number;
		title?: string;
		text?: { '*'?: string };
	};
}

interface SummaryResponse {
	pageid?: number;
	title?: string;
	extract?: string;
	thumbnail?: {
		source?: string;
	};
}

/**
 * Fetch the full HTML of a Wikipedia article by title, using the parse API.
 * Returns structured data including HTML body, extract, and thumbnail.
 */
export async function fetchArticleByTitle(title: string): Promise<BrowseArticle> {
	const cleanTitle = title.replace(/_/g, ' ').trim();
	const encodedTitle = encodeURIComponent(cleanTitle);

	// Fetch summary (for extract + thumbnail) and parsed HTML in parallel.
	const [summaryRes, parseRes] = await Promise.all([
		fetch(`${WIKI_REST}/page/summary/${encodedTitle}`),
		fetch(
			`${WIKI_API}?${new URLSearchParams({
				action: 'parse',
				page: cleanTitle,
				format: 'json',
				prop: 'text',
				redirects: '1',
				disableeditsection: '1',
				disabletoc: '1',
				origin: '*'
			})}`
		)
	]);

	if (!parseRes.ok) {
		throw new Error(`Parse API responded with ${parseRes.status}`);
	}

	const parseData = (await parseRes.json()) as ParseResponse;
	const parsed = parseData.parse;
	if (!parsed?.text?.['*']) {
		throw new Error('No parsed content returned');
	}

	let extract = '';
	let thumbnail: string | undefined;
	const pageId = parsed.pageid ?? 0;
	const resolvedTitle = parsed.title ?? cleanTitle;

	if (summaryRes.ok) {
		const summaryData = (await summaryRes.json()) as SummaryResponse;
		extract = summaryData.extract ?? '';
		thumbnail = summaryData.thumbnail?.source;
	}

	return {
		pageId,
		title: resolvedTitle,
		extract,
		htmlContent: parsed.text['*'],
		thumbnail
	};
}

/**
 * Get a random Wikipedia article title via the API.
 */
export async function fetchRandomTitle(): Promise<string> {
	const params = new URLSearchParams({
		action: 'query',
		format: 'json',
		list: 'random',
		rnnamespace: '0',
		rnlimit: '1',
		origin: '*'
	});

	const res = await fetch(`${WIKI_API}?${params}`);
	if (!res.ok) throw new Error(`Random API responded with ${res.status}`);

	const data = await res.json();
	const pages = data.query?.random as Array<{ title?: string }> | undefined;
	const title = pages?.[0]?.title;
	if (!title) throw new Error('No random article returned');
	return title;
}

/**
 * Determine whether an encounter should be triggered based on a capture chance.
 * Base chance is ~15%, increasing slightly the more pages you visit.
 */
export function shouldTriggerEncounter(pagesVisited: number): boolean {
	const baseChance = 0.15;
	const scaledChance = Math.min(baseChance + pagesVisited * 0.005, 0.35);
	return Math.random() < scaledChance;
}

/**
 * Calculate the "catch rate" percentage for display. It's cosmetic but fun.
 */
export function getCatchRate(pagesVisited: number): number {
	return Math.round(Math.min(15 + pagesVisited * 0.5, 35));
}
