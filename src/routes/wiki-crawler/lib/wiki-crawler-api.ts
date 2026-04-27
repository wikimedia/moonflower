const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const WIKI_REST = 'https://en.wikipedia.org/api/rest_v1';

export interface WikiCrawlerArticle {
	pageId: number;
	title: string;
	htmlContent: string;
	canonicalUrl: string;
}

interface SummaryResponse {
	pageid?: number;
	title?: string;
}

function absolutizeMediaUrl(url: string): string {
	if (url.startsWith('//')) {
		return `https:${url}`;
	}

	return url;
}

function absolutizeSrcSet(srcSet: string): string {
	return srcSet
		.split(',')
		.map((entry) => entry.trim())
		.filter(Boolean)
		.map((entry) => {
			const [source, descriptor] = entry.split(/\s+/, 2);
			if (!source) return '';
			return [absolutizeMediaUrl(source), descriptor].filter(Boolean).join(' ');
		})
		.filter(Boolean)
		.join(', ');
}

function normalizeMobileArticleHtml(rawHtml: string): string {
	const parsed = new DOMParser().parseFromString(rawHtml, 'text/html');
	const root = parsed.body.querySelector('#pcs') ?? parsed.body;

	for (const node of root.querySelectorAll('script, meta, link')) {
		node.remove();
	}

	root.querySelector('header')?.remove();

	for (const editUi of root.querySelectorAll('.pcs-edit-section-link-container, .pcs-edit-section-link')) {
		editUi.remove();
	}

	for (const section of root.querySelectorAll<HTMLElement>('section[data-mw-section-id]')) {
		section.style.removeProperty('display');
		if (section.getAttribute('style')?.trim() === '') {
			section.removeAttribute('style');
		}
	}

	for (const collapsedContent of root.querySelectorAll<HTMLElement>('.pcs-collapse-table-content')) {
		collapsedContent.style.removeProperty('display');
		if (collapsedContent.getAttribute('style')?.trim() === '') {
			collapsedContent.removeAttribute('style');
		}
	}

	for (const collapsedUi of root.querySelectorAll('.pcs-collapse-table-collapsed-container, .pcs-collapse-table-collapsed-bottom, .pcs-collapse-table-aria')) {
		collapsedUi.remove();
	}

	for (const placeholder of root.querySelectorAll<HTMLElement>('.pcs-lazy-load-placeholder[data-src]')) {
		const src = placeholder.getAttribute('data-src');
		if (!src) continue;

		const image = parsed.createElement('img');
		image.src = absolutizeMediaUrl(src);
		image.alt = placeholder.getAttribute('alt') ?? '';
		const decoding = placeholder.getAttribute('data-decoding');
		if (decoding === 'sync' || decoding === 'auto') {
			image.decoding = decoding;
		} else {
			image.decoding = 'async';
		}

		const srcSet = placeholder.getAttribute('data-srcset');
		if (srcSet) {
			image.srcset = absolutizeSrcSet(srcSet);
		}

		const width = placeholder.getAttribute('data-width');
		if (width) {
			image.setAttribute('width', width);
		}

		const height = placeholder.getAttribute('data-height');
		if (height) {
			image.setAttribute('height', height);
		}

		const resource = placeholder.getAttribute('data-resource');
		if (resource) {
			image.setAttribute('resource', resource);
		}

		const className = placeholder.getAttribute('data-class');
		if (className) {
			image.className = className;
		}

		const inlineStyle = placeholder.getAttribute('style');
		if (inlineStyle) {
			image.setAttribute('style', inlineStyle);
		}

		placeholder.replaceWith(image);
	}

	return root.innerHTML.trim();
}

function resolvedTitleFromResponseUrl(url: string, fallbackTitle: string): string {
	const match = url.match(/\/page\/mobile-html\/([^?#]+)/);
	if (!match) return fallbackTitle;

	try {
		return normalizeWikiTitle(decodeURIComponent(match[1]));
	} catch {
		return fallbackTitle;
	}
}

export function normalizeWikiTitle(raw: string): string {
	return raw.replace(/_/g, ' ').trim();
}

export function titleToWikiPath(title: string): string {
	return `/wiki/${encodeURIComponent(normalizeWikiTitle(title).replace(/ /g, '_'))}`;
}

export function hrefToPlayableWikiTitle(href: string): string | null {
	if (href.startsWith('#')) return null;

	let parsedHref: URL;
	try {
		parsedHref = new URL(href, 'https://en.wikipedia.org/wiki/');
	} catch {
		return null;
	}

	if (!parsedHref.hostname.endsWith('wikipedia.org')) return null;
	if (!parsedHref.pathname.startsWith('/wiki/')) return null;
	if (parsedHref.hash) return null;

	const rawTitle = normalizeWikiTitle(decodeURIComponent(parsedHref.pathname.replace('/wiki/', '')));
	if (rawTitle.length === 0) return null;

	if (rawTitle.includes(':') && !rawTitle.startsWith('The ') && !rawTitle.startsWith('A ')) {
		return null;
	}

	return rawTitle;
}

export async function fetchRandomTitle(): Promise<string> {
	const params = new URLSearchParams({
		action: 'query',
		format: 'json',
		list: 'random',
		rnnamespace: '0',
		rnlimit: '1',
		origin: '*'
	});

	const res = await fetch(`${WIKI_API}?${params.toString()}`);
	if (!res.ok) {
		throw new Error(`Random API responded with ${res.status}`);
	}

	const data = await res.json();
	const title = (data.query?.random as Array<{ title?: string }> | undefined)?.[0]?.title;
	if (!title) {
		throw new Error('No random article returned');
	}

	return normalizeWikiTitle(title);
}

export async function fetchArticleByTitle(title: string): Promise<WikiCrawlerArticle> {
	const cleanTitle = normalizeWikiTitle(title);
	const encodedTitle = encodeURIComponent(cleanTitle);

	const [summaryRes, htmlRes] = await Promise.all([
		fetch(`${WIKI_REST}/page/summary/${encodedTitle}`),
		fetch(`${WIKI_REST}/page/mobile-html/${encodedTitle}`, {
			headers: {
				accept: 'text/html'
			}
		})
	]);

	if (!htmlRes.ok) {
		throw new Error(`Mobile HTML API responded with ${htmlRes.status}`);
	}

	const rawHtml = await htmlRes.text();
	const bodyHtml = normalizeMobileArticleHtml(rawHtml);
	if (!bodyHtml) {
		throw new Error('No rendered article body returned');
	}

	let pageId = 0;
	let resolvedTitle = resolvedTitleFromResponseUrl(htmlRes.url, cleanTitle);

	if (summaryRes.ok) {
		const summary = (await summaryRes.json()) as SummaryResponse;
		pageId = summary.pageid ?? 0;
		resolvedTitle = normalizeWikiTitle(summary.title ?? resolvedTitle);
	}

	return {
		pageId,
		title: resolvedTitle,
		htmlContent: bodyHtml,
		canonicalUrl: `https://en.wikipedia.org${titleToWikiPath(resolvedTitle)}`
	};
}