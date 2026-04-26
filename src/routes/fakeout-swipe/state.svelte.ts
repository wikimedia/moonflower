import type { WikiArticle } from '$lib/types';
import type { DealCard, FakeFallRecord, FakeoutSwipeState } from './types';

const STORAGE_KEY = 'moonflower.fakeout-swipe.state.v1';
export const RUN_COOLDOWN_MS = 5 * 60 * 1000;

const initialState: FakeoutSwipeState = {
	status: 'ready',
	runStartedAt: null,
	runEndedAt: null,
	cooldownUntil: null,
	hasSeenDealIntro: false,
	totalDealt: 0,
	activeHand: [],
	collection: [],
	fakeFalls: []
};

let state = $state<FakeoutSwipeState>(loadState());

function canUseStorage(): boolean {
	return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function loadState(): FakeoutSwipeState {
	if (!canUseStorage()) {
		return { ...initialState };
	}

	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { ...initialState };
		const parsed = JSON.parse(raw) as FakeoutSwipeState;
		return {
			...initialState,
			...parsed,
			activeHand: parsed.activeHand ?? [],
			collection: parsed.collection ?? [],
			fakeFalls: parsed.fakeFalls ?? []
		};
	} catch {
		return { ...initialState };
	}
}

function persist(next: FakeoutSwipeState) {
	if (!canUseStorage()) return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function setState(next: FakeoutSwipeState) {
	state = next;
	persist(state);
}

function patch(updater: (current: FakeoutSwipeState) => FakeoutSwipeState) {
	setState(updater(state));
}

function nowMs(): number {
	return Date.now();
}

function cooldownFrom(timestampMs: number): number {
	return timestampMs + RUN_COOLDOWN_MS;
}

export const fakeoutSwipeState = {
	get value() {
		return state;
	},
	get cooldownRemainingMs() {
		if (!state.cooldownUntil) return 0;
		return Math.max(0, state.cooldownUntil - Date.now());
	},
	get canStartRun() {
		if (state.status === 'active') return false;
		if (!state.cooldownUntil) return true;
		return state.cooldownUntil <= Date.now();
	},
	startRun() {
		if (!this.canStartRun) return false;
		const startAt = nowMs();
		setState({
			...state,
			status: 'active',
			runStartedAt: startAt,
			runEndedAt: null,
			totalDealt: 0,
			activeHand: []
		});
		return true;
	},
	setHand(hand: DealCard[]) {
		patch((current) => ({
			...current,
			activeHand: hand,
			totalDealt: current.totalDealt + hand.length
		}));
	},
	keepReal(cardId: string, rarity: DealCard['rarity'], article: WikiArticle) {
		const takenAt = nowMs();
		patch((current) => ({
			...current,
			collection: [...current.collection, { cardId, rarity, article, takenAt }],
			activeHand: current.activeHand.filter((card) => card.id !== cardId)
		}));
	},
	rejectCard(cardId: string) {
		patch((current) => ({
			...current,
			activeHand: current.activeHand.filter((card) => card.id !== cardId)
		}));
	},
	takeFake(entry: FakeFallRecord) {
		const endedAt = nowMs();
		patch((current) => ({
			...current,
			status: 'ended',
			runEndedAt: endedAt,
			cooldownUntil: cooldownFrom(endedAt),
			fakeFalls: [...current.fakeFalls, entry],
			activeHand: []
		}));
	},
	endRun() {
		const endedAt = nowMs();
		patch((current) => ({
			...current,
			status: 'ended',
			runEndedAt: endedAt,
			cooldownUntil: cooldownFrom(endedAt),
			activeHand: []
		}));
	},
	refreshCooldownState() {
		if (state.status === 'active') return;
		if (!state.cooldownUntil) return;
		if (state.cooldownUntil > Date.now()) return;

		patch((current) => ({
			...current,
			status: 'ready',
			cooldownUntil: null,
			runStartedAt: null,
			runEndedAt: null,
			totalDealt: 0,
			activeHand: []
		}));
	},
	markDealIntroSeen() {
		if (state.hasSeenDealIntro) return;
		patch((current) => ({
			...current,
			hasSeenDealIntro: true
		}));
	}
};