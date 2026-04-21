import type { WikiArticle } from '$lib/types';
import type { DealCard, FakeCard, RarityTier } from './types';

const rarityWeights: Array<{ tier: RarityTier; weight: number }> = [
	{ tier: 'common', weight: 65 },
	{ tier: 'rare', weight: 28 },
	{ tier: 'legendary', weight: 7 }
];

export function randomRarity(random = Math.random): RarityTier {
	const roll = random() * 100;
	let cursor = 0;
	for (const rarity of rarityWeights) {
		cursor += rarity.weight;
		if (roll <= cursor) {
			return rarity.tier;
		}
	}
	return 'common';
}

function uid(prefix: string): string {
	return `${prefix}-${crypto.randomUUID()}`;
}

function asArticle(fake: FakeCard): WikiArticle {
	return {
		pageId: -Math.abs(hash(fake.id)),
		title: fake.title,
		extract: fake.extract
	};
}

function hash(input: string): number {
	let out = 0;
	for (let i = 0; i < input.length; i++) {
		out = (out << 5) - out + input.charCodeAt(i);
		out |= 0;
	}
	return Math.abs(out);
}

function pickFake(available: FakeCard[], random = Math.random): FakeCard {
	if (available.length === 0) {
		throw new Error('No fake cards available');
	}
	const index = Math.floor(random() * available.length);
	return available[index];
}

function insertAt<T>(items: T[], index: number, value: T): T[] {
	const copy = [...items];
	copy.splice(index, 0, value);
	return copy;
}

export interface BuildHandResult {
	hand: DealCard[];
	fakeCardId: string;
}

export function buildHand(realArticles: WikiArticle[], fakePool: FakeCard[]): BuildHandResult {
	if (realArticles.length < 4) {
		throw new Error('Need at least 4 real articles to build a hand');
	}

	const fake = pickFake(fakePool);
	const fakeArticle = asArticle(fake);

	const realCards: DealCard[] = realArticles.slice(0, 4).map((article) => ({
		id: uid('real'),
		article,
		isFake: false,
		rarity: randomRarity(),
		taken: false
	}));

	const fakeCard: DealCard = {
		id: uid('fake'),
		article: fakeArticle,
		isFake: true,
		rarity: randomRarity(),
		taken: false
	};

	const fakeIndex = Math.floor(Math.random() * 5);
	const hand = insertAt(realCards, fakeIndex, fakeCard);

	return {
		hand,
		fakeCardId: fake.id
	};
}

export function rarityClass(rarity: RarityTier): string {
	switch (rarity) {
		case 'legendary':
			return 'fakeout-rarity-legendary';
		case 'rare':
			return 'fakeout-rarity-rare';
		default:
			return 'fakeout-rarity-common';
	}
}
