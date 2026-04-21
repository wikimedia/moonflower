import type { WikiArticle } from '../../src/lib/types';

/** Article plus measured thumbnail size for physics collider sizing. */
export type DropArticle = WikiArticle & {
	displayWidth: number;
	displayHeight: number;
};
