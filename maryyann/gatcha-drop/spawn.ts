import Matter from 'matter-js';
import type { WikiArticle } from '../../src/lib/types';
import {
	CHAMFER_RADIUS,
	DENSITY,
	DROP_TARGET_WIDTH,
	FRICTION,
	FRICTION_AIR,
	RESTITUTION
} from './physics-config';
import type { DropArticle } from './types';

export type ArticleBodyPlugin = {
	pageId: number;
	displayWidth: number;
	displayHeight: number;
};

export function createArticleBody(
	x: number,
	y: number,
	width: number,
	height: number,
	pageId: number
): Matter.Body {
	const body = Matter.Bodies.rectangle(x, y, width, height, {
		chamfer: { radius: CHAMFER_RADIUS },
		restitution: RESTITUTION,
		friction: FRICTION,
		frictionAir: FRICTION_AIR,
		density: DENSITY,
		label: `article-${pageId}`
	});
	body.plugin = { pageId, displayWidth: width, displayHeight: height } satisfies ArticleBodyPlugin;
	return body;
}

export function randomSpawnX(worldWidth: number, chipWidth: number): number {
	const margin = chipWidth * 0.6 + 24;
	const lo = margin;
	const hi = Math.max(lo + 8, worldWidth - margin);
	return lo + Math.random() * (hi - lo);
}

export function initialAngularVelocity(): number {
	return (Math.random() - 0.5) * 0.14;
}

export function initialDownwardVelocity(): number {
	return 0.8 + Math.random() * 1.6;
}

/** Load thumbnail natural size and derive display dimensions for colliders. */
export function measureDropArticle(article: WikiArticle): Promise<DropArticle> {
	const tw = DROP_TARGET_WIDTH;
	const thumb = article.thumbnail;
	if (!thumb) {
		return Promise.resolve({ ...article, displayWidth: tw, displayHeight: tw });
	}

	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () => {
			const nw = img.naturalWidth || tw;
			const nh = img.naturalHeight || tw;
			const displayHeight = (nh / nw) * tw;
			resolve({ ...article, displayWidth: tw, displayHeight });
		};
		img.onerror = () => resolve({ ...article, displayWidth: tw, displayHeight: tw });
		img.src = thumb;
	});
}

export function getArticlePlugin(body: Matter.Body): ArticleBodyPlugin | null {
	const p = body.plugin as Partial<ArticleBodyPlugin> | undefined;
	if (typeof p?.pageId !== 'number') return null;
	return {
		pageId: p.pageId,
		displayWidth: p.displayWidth ?? DROP_TARGET_WIDTH,
		displayHeight: p.displayHeight ?? DROP_TARGET_WIDTH
	};
}
