import type { WikiArticle } from '$lib/types';

export function wikiArticleUrl(article: Pick<WikiArticle, 'title'>): string {
	return `https://en.wikipedia.org/wiki/${encodeURIComponent(article.title.replace(/ /g, '_'))}`;
}
