import type { WikiArticle } from '../../src/lib/types';

/** Canonical desktop URL for the English Wikipedia article. */
export function wikiArticleUrl(article: Pick<WikiArticle, 'title'>): string {
	return `https://en.wikipedia.org/wiki/${encodeURIComponent(article.title.replace(/ /g, '_'))}`;
}
