import type { WikiArticle } from '$lib/types';

export type RarityTier = 'common' | 'rare' | 'legendary';

export interface FakeCard {
	id: string;
	title: string;
	extract: string;
	thumbnail: string;
	rarityPool?: RarityTier[];
	fakeReason: string;
}

export interface DealCard {
	id: string;
	article: WikiArticle;
	isFake: boolean;
	rarity: RarityTier;
	taken: boolean;
}

export interface CollectionEntry {
	cardId: string;
	article: WikiArticle;
	rarity: RarityTier;
	takenAt: number;
}

export interface FakeFallRecord {
	cardId: string;
	article: WikiArticle;
	rarity: RarityTier;
	fakeReason: string;
	takenAt: number;
}

export type RunStatus = 'ready' | 'active' | 'ended';

export interface FakeoutSwipeState {
	status: RunStatus;
	runStartedAt: number | null;
	runEndedAt: number | null;
	cooldownUntil: number | null;
	hasSeenDealIntro: boolean;
	totalDealt: number;
	activeHand: DealCard[];
	collection: CollectionEntry[];
	fakeFalls: FakeFallRecord[];
}