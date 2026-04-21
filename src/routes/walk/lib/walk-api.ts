const WIKI_API = 'https://en.wikipedia.org/w/api.php';

interface PrefixSearchItem {
	title?: string;
}

interface PrefixSearchResponse {
	query?: {
		prefixsearch?: PrefixSearchItem[];
	};
}

interface LinkItem {
	title?: string;
	ns?: number;
}

interface LinksPage {
	title?: string;
	links?: LinkItem[];
	missing?: boolean;
}

interface LinksResponse {
	query?: {
		pages?: LinksPage[];
	};
	continue?: {
		plcontinue?: string;
	};
}

export interface NeighborResult {
	resolvedTitle: string;
	neighbors: string[];
}

function normalizeTitle(raw: string): string {
	return raw.replace(/_/g, ' ').trim();
}

export async function fetchTitleSuggestions(query: string, limit: number): Promise<string[]> {
	const input = query.trim();
	if (input.length < 2) return [];

	const params = new URLSearchParams({
		action: 'query',
		format: 'json',
		formatversion: '2',
		list: 'prefixsearch',
		pssearch: input,
		psnamespace: '0',
		pslimit: String(Math.min(Math.max(limit, 1), 20)),
		origin: '*'
	});

	const res = await fetch(`${WIKI_API}?${params.toString()}`);
	if (!res.ok) {
		throw new Error(`Suggestion request failed with ${res.status}`);
	}

	const data = (await res.json()) as PrefixSearchResponse;
	const seen = new Set<string>();
	const suggestions: string[] = [];

	for (const item of data.query?.prefixsearch ?? []) {
		if (!item.title) continue;
		const title = normalizeTitle(item.title);
		if (title.length === 0 || seen.has(title)) continue;
		seen.add(title);
		suggestions.push(title);
	}

	return suggestions;
}

export async function fetchArticleNeighbors(
	title: string,
	maxNeighbors: number,
	maxContinuations: number
): Promise<NeighborResult> {
	const cleanTitle = normalizeTitle(title);
	const neighbors = new Set<string>();
	let resolvedTitle = cleanTitle;
	let plcontinue: string | null = null;
	let rounds = 0;

	while (neighbors.size < maxNeighbors && rounds <= maxContinuations) {
		const params = new URLSearchParams({
			action: 'query',
			format: 'json',
			formatversion: '2',
			titles: cleanTitle,
			redirects: '1',
			prop: 'links',
			plnamespace: '0',
			pllimit: 'max',
			origin: '*'
		});

		if (plcontinue) {
			params.set('plcontinue', plcontinue);
		}

		const res = await fetch(`${WIKI_API}?${params.toString()}`);
		if (!res.ok) {
			throw new Error(`Neighbor request failed with ${res.status}`);
		}

		const data = (await res.json()) as LinksResponse;
		const page = data.query?.pages?.[0];
		if (!page || page.missing) {
			return { resolvedTitle: cleanTitle, neighbors: [] };
		}

		if (page.title) {
			resolvedTitle = normalizeTitle(page.title);
		}

		for (const link of page.links ?? []) {
			if (link.ns !== 0 || !link.title) continue;
			const neighbor = normalizeTitle(link.title);
			if (neighbor.length === 0 || neighbor === resolvedTitle) continue;
			neighbors.add(neighbor);
			if (neighbors.size >= maxNeighbors) break;
		}

		plcontinue = data.continue?.plcontinue ?? null;
		if (!plcontinue) break;
		rounds += 1;
	}

	return {
		resolvedTitle,
		neighbors: Array.from(neighbors)
	};
}

export function pickRandomSubset(items: string[], count: number): string[] {
	if (count >= items.length) {
		return [...items];
	}

	const pool = [...items];
	for (let i = pool.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[pool[i], pool[j]] = [pool[j], pool[i]];
	}
	return pool.slice(0, count);
}
