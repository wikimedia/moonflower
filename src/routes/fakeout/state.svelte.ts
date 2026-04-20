import type { WikiArticle } from '$lib/types';
import type { DealCard, FakeFallRecord, FakeoutState } from './types';

const STORAGE_KEY = 'moonflower.fakeout.state.v1';
export const RUN_COOLDOWN_MS = 60 * 60 * 1000;

const initialState: FakeoutState = {
	status: 'ready',
	runStartedAt: null,
	runEndedAt: null,
	cooldownUntil: null,
	hasSeenFakeWarning: false,
	hasSeenNoPickWarning: false,
	totalDealt: 0,
	activeHand: [],
	collection: [],
	fakeFalls: []
};

let state = $state<FakeoutState>(loadState());

function canUseStorage(): boolean {
	return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function loadState(): FakeoutState {
	if (!canUseStorage()) {
		return { ...initialState };
	}

	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { ...initialState };
		const parsed = JSON.parse(raw) as FakeoutState;
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

function persist(next: FakeoutState) {
	if (!canUseStorage()) return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function setState(next: FakeoutState) {
	state = next;
	persist(state);
}

function patch(updater: (current: FakeoutState) => FakeoutState) {
	setState(updater(state));
}

function nowMs(): number {
	return Date.now();
}

function cooldownFrom(timestampMs: number): number {
	return timestampMs + RUN_COOLDOWN_MS;
}

export const fakeoutState = {
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
	takeReal(cardId: string, rarity: DealCard['rarity'], article: WikiArticle) {
		const takenAt = nowMs();
		patch((current) => ({
			...current,
			collection: [
				...current.collection,
				{ cardId, rarity, article, takenAt }
			],
			activeHand: current.activeHand.map((card) =>
				card.id === cardId ? { ...card, taken: true } : card
			)
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
	markFakeWarningSeen() {
		if (state.hasSeenFakeWarning) return;
		patch((current) => ({
			...current,
			hasSeenFakeWarning: true
		}));
	},
	markNoPickWarningSeen() {
		if (state.hasSeenNoPickWarning) return;
		patch((current) => ({
			...current,
			hasSeenNoPickWarning: true
		}));
	}
};
