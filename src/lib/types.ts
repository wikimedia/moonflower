/** Base article fetched from the Wikimedia API. */
export interface WikiArticle {
	pageId: number;
	title: string;
	extract: string;
	thumbnail?: string;
}

/** Descriptor for an experiment shown on the hub page. */
export interface Experiment {
	slug: string;
	name: string;
	description: string;
	color: string;
}
