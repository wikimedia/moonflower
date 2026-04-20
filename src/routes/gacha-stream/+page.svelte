<script lang="ts">
	import { browser } from '$app/environment';
	import { onDestroy, onMount } from 'svelte';
	import GachaCard from './components/GachaCard.svelte';
	import { en } from '$lib/i18n/en';
	import type { WikiArticle } from '$lib/types';

	type StreamConnectionStatus = 'connecting' | 'live' | 'reconnecting' | 'disconnected';
	type GameMode = 'stream' | 'collection';
	type RewardPhase = 'center' | 'slide';
	type TokenVariant = 'normal' | 'burst';
	type CardRarity = 'common' | 'rare' | 'epic' | 'legendary';

	interface StreamToken {
		id: string;
		title: string;
		editor: string;
		changeType: string;
		pageId: number;
		createdAt: number;
		y: number;
		durationMs: number;
		variant: TokenVariant;
		hue: number;
	}

	interface StoredCard extends WikiArticle {
		captureId: string;
		capturedAt: number;
		editor: string;
		changeType: string;
		rarity: CardRarity;
	}

	interface PersistedStateV1 {
		version: 1;
		mode: GameMode;
		collection: StoredCard[];
		totalCaptured: number;
		burstReadyAt: number;
	}

	interface RecentChangeEvent {
		title?: string;
		server_name?: string;
		meta?: { domain?: string };
		user?: string;
		type?: string;
		page_id?: number;
		namespace?: number;
	}

	const STREAM_URL = 'https://stream.wikimedia.org/v2/stream/recentchange';
	const STORAGE_KEY = 'moonflower:gacha-stream:v1';
	const MAX_ACTIVE_TOKENS = 35;
	const LANE_MIN_Y = 3;
	const LANE_MAX_Y = 93;
	const LANE_CANDIDATE_COUNT = 22;
	const LANE_TRY_COUNT = 24;
	const VELOCITY_WINDOW_MS = 10_000;
	const MAX_SPEED_FACTOR = 8;
	const TARGET_CARDS_PER_SECOND = 0.1;
	const CARD_BUCKET_CAPACITY = 2;
	const REWARD_CENTER_MS = 1500;
	const REWARD_TOTAL_MS = 5500;
	const BURST_COOLDOWN_MS = 5 * 60 * 1000;
	const BURST_TOTAL_CARDS = 50;
	const BURST_PULL_LIMIT = 20;
	const BURST_DROP_DURATION_MS = 20_000;
	const BURST_INSERT_INTERVAL_MS = Math.round(BURST_DROP_DURATION_MS / BURST_TOTAL_CARDS);
	const ARTICLE_ENRICH_SENTENCES = 3;
	const DEFAULT_EDITOR = en.experiments.gachaStream.unknownEditor;
	const DEFAULT_CHANGE_TYPE = en.experiments.gachaStream.unknownType;

	let mode = $state<GameMode>('stream');
	let connectionStatus = $state<StreamConnectionStatus>('connecting');
	let streamTokens = $state<StreamToken[]>([]);
	let collection = $state<StoredCard[]>([]);
	let totalCaptured = $state(0);

	let rewardCard = $state<StoredCard | null>(null);
	let rewardPhase = $state<RewardPhase | null>(null);
	let rewardQueue = $state<StoredCard[]>([]);
	let burstLoading = $state(false);
	let burstReadyAt = $state(0);
	let clockMs = $state(Date.now());

	let eventSource: EventSource | null = null;
	let rewardCenterTimer: ReturnType<typeof setTimeout> | null = null;
	let rewardCleanupTimer: ReturnType<typeof setTimeout> | null = null;
	let clockTimer: ReturnType<typeof setInterval> | null = null;
	let burstDispatchTimer: ReturnType<typeof setTimeout> | null = null;
	let burstDispatchQueue = $state<WikiArticle[]>([]);
	let acceptedEventTimes: number[] = [];
	let rewardRunning = false;
	let cardBudget = 1;
	let lastBudgetUpdateMs = Date.now();
	let burstDispatchActive = false;
	const articleCache = new Map<string, WikiArticle>();

	const burstRemainingMs = $derived(Math.max(0, burstReadyAt - clockMs));
	const burstReady = $derived(burstRemainingMs === 0);
	const burstChargeProgress = $derived(
		Math.min(1, Math.max(0, 1 - burstRemainingMs / BURST_COOLDOWN_MS))
	);
	const burstButtonLabel = $derived.by(() => {
		if (burstLoading) return en.experiments.gachaStream.burstLoading;
		if (burstReady) return en.experiments.gachaStream.burstReady;
		return `${en.experiments.gachaStream.burstCooldown} ${formatRemaining(burstRemainingMs)}`;
	});

	const persisted = $derived.by<PersistedStateV1>(() => ({
		version: 1,
		mode,
		collection,
		totalCaptured,
		burstReadyAt
	}));

	$effect(() => {
		if (!browser) return;
		localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
	});

	onMount(() => {
		lastBudgetUpdateMs = Date.now();
		hydrateFromStorage();
		clockTimer = setInterval(() => {
			clockMs = Date.now();
		}, 250);
		connectStream();
	});

	onDestroy(() => {
		if (rewardCenterTimer) clearTimeout(rewardCenterTimer);
		if (rewardCleanupTimer) clearTimeout(rewardCleanupTimer);
		if (clockTimer) clearInterval(clockTimer);
		if (burstDispatchTimer) clearTimeout(burstDispatchTimer);
		disconnectStream('disconnected');
	});

	function hydrateFromStorage() {
		if (!browser) return;

		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return;

		try {
			const parsed = JSON.parse(raw) as Partial<PersistedStateV1>;
			if (parsed.version !== 1) return;
			if (parsed.mode === 'stream' || parsed.mode === 'collection') {
				mode = parsed.mode;
			}
			if (Array.isArray(parsed.collection)) {
				collection = parsed.collection
					.filter((item): item is StoredCard => {
						return (
							typeof item?.captureId === 'string' &&
							typeof item?.title === 'string' &&
							typeof item?.extract === 'string' &&
							typeof item?.pageId === 'number' &&
							typeof item?.capturedAt === 'number' &&
							typeof item?.editor === 'string' &&
							typeof item?.changeType === 'string'
						);
					})
					.map((item) => ({
						...item,
						rarity: isRarity(item.rarity) ? item.rarity : rollRarity()
					}))
					.slice(0, 1000);
			}
			if (typeof parsed.totalCaptured === 'number') {
				totalCaptured = Math.max(parsed.totalCaptured, collection.length);
			}
			if (typeof parsed.burstReadyAt === 'number') {
				burstReadyAt = parsed.burstReadyAt;
			}
		} catch {
			localStorage.removeItem(STORAGE_KEY);
		}
	}

	function connectStream() {
		if (!browser) return;

		disconnectStream('connecting');
		eventSource = new EventSource(STREAM_URL);

		eventSource.onopen = () => {
			connectionStatus = 'live';
		};

		eventSource.onerror = () => {
			if (eventSource) {
				connectionStatus = 'reconnecting';
			}
		};

		eventSource.onmessage = (event) => {
			if (connectionStatus !== 'live') {
				connectionStatus = 'live';
			}

			let change: RecentChangeEvent;
			try {
				change = JSON.parse(event.data) as RecentChangeEvent;
			} catch {
				return;
			}

			if (change.meta?.domain === 'canary') return;
			if (change.server_name !== 'en.wikipedia.org') return;
			if (change.namespace !== 0) return;
			if (!change.title || typeof change.title !== 'string') return;

			spawnToken(change, 'normal');
		};
	}

	function disconnectStream(nextStatus: StreamConnectionStatus) {
		if (eventSource) {
			eventSource.close();
			eventSource = null;
		}
		connectionStatus = nextStatus;
	}

	function spawnToken(change: RecentChangeEvent, variant: TokenVariant) {
		const now = Date.now();
		const title = change.title ?? '';
		const pageId = typeof change.page_id === 'number' ? change.page_id : hashFromString(title);
		const seedBase = `${title}:${now}:${Math.random()}:${variant}`;
		const seed = hashFromString(seedBase);
		noteAcceptedEdit(now);
		const editsPerSecond = getRecentVelocity(now);
		const durationMs = deriveDurationMs(editsPerSecond, seed);
		const y = pickLane(now, seed);

		const token: StreamToken = {
			id: `${now}-${seed}`,
			title,
			editor: sanitizeEventField(change.user, DEFAULT_EDITOR),
			changeType: sanitizeEventField(change.type, DEFAULT_CHANGE_TYPE),
			pageId,
			createdAt: now,
			y,
			durationMs,
			variant,
			hue: seed % 360
		};

		streamTokens = appendTokenWithoutBurstCulling(streamTokens, token);
	}

	function appendTokenWithoutBurstCulling(existing: StreamToken[], next: StreamToken) {
		const combined = [...existing, next];
		const normalTokens = combined.filter((token) => token.variant === 'normal');
		if (normalTokens.length <= MAX_ACTIVE_TOKENS) return combined;

		const removeCount = normalTokens.length - MAX_ACTIVE_TOKENS;
		let removed = 0;

		return combined.filter((token) => {
			if (token.variant !== 'normal') return true;
			if (removed < removeCount) {
				removed += 1;
				return false;
			}
			return true;
		});
	}

	function sanitizeEventField(value: string | undefined, fallback: string) {
		if (!value) return fallback;
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : fallback;
	}

	function hashFromString(input: string) {
		let hash = 0;
		for (let i = 0; i < input.length; i++) {
			hash = (hash << 5) - hash + input.charCodeAt(i);
			hash |= 0;
		}
		return Math.abs(hash);
	}

	function noteAcceptedEdit(now: number) {
		acceptedEventTimes = [...acceptedEventTimes, now].filter((time) => now - time <= VELOCITY_WINDOW_MS);
	}

	function getRecentVelocity(now: number) {
		acceptedEventTimes = acceptedEventTimes.filter((time) => now - time <= VELOCITY_WINDOW_MS);
		return acceptedEventTimes.length / (VELOCITY_WINDOW_MS / 1000);
	}

	function deriveDurationMs(editsPerSecond: number, seed: number) {
		const normalizedSpeed = Math.min(Math.max(editsPerSecond, 0), MAX_SPEED_FACTOR);
		const baseDuration = 12_500 - normalizedSpeed * 780;
		const jitter = (seed % 1400) - 700;
		return Math.max(6_500, Math.min(15_000, Math.round(baseDuration + jitter)));
	}

	function pickLane(now: number, seed: number) {
		const span = LANE_MAX_Y - LANE_MIN_Y;
		let bestY = LANE_MIN_Y + (seed % (span + 1));
		let bestScore = Number.POSITIVE_INFINITY;

		for (let attempt = 0; attempt < LANE_TRY_COUNT; attempt++) {
			const candidateSeed = (seed * 17 + attempt * 131) % (LANE_CANDIDATE_COUNT * 1000);
			const normalized = (candidateSeed % LANE_CANDIDATE_COUNT) / (LANE_CANDIDATE_COUNT - 1);
			const lane = LANE_MIN_Y + normalized * span;
			const laneScore = scoreLaneCollision(now, lane);

			if (laneScore < bestScore) {
				bestScore = laneScore;
				bestY = lane;
			}

			if (laneScore <= 0.03) {
				break;
			}
		}

		return Math.round(bestY * 10) / 10;
	}

	function scoreLaneCollision(now: number, lane: number) {
		let score = 0;

		for (const token of streamTokens) {
			const age = now - token.createdAt;
			if (age > token.durationMs * 0.92) continue;

			const yDistance = Math.abs(token.y - lane);
			if (yDistance > 10) continue;

			const verticalPressure = 1 - yDistance / 10;
			const timePressure = Math.max(0, 1 - age / 2800);
			const variantWeight = token.variant === 'burst' ? 1.25 : 1;
			score += verticalPressure * (0.35 + timePressure * 1.8) * variantWeight;
		}

		return score;
	}

	async function handleTokenExit(tokenId: string) {
		const token = streamTokens.find((entry) => entry.id === tokenId);
		if (!token) return;

		streamTokens = streamTokens.filter((entry) => entry.id !== tokenId);

		if (!shouldAwardCard(Date.now())) {
			return;
		}

		const enriched = await fetchArticleByTitle(token.title);
		const card = toCard(token, enriched);
		collection = [card, ...collection];
		totalCaptured += 1;
		enqueueReward(card);
	}

	function toCard(token: StreamToken, enriched: WikiArticle | null): StoredCard {
		const captureId = `${token.id}:${totalCaptured + 1}`;
		const metadataExtract = `${en.experiments.gachaStream.editorPrefix}: ${token.editor}. ${en.experiments.gachaStream.typePrefix}: ${token.changeType}.`;
		const extract = enriched?.extract?.trim().length
			? enriched.extract
			: `${en.experiments.gachaStream.noSummary} ${metadataExtract}`;
		const rarity = rollRarity();
		return {
			captureId,
			capturedAt: Date.now(),
			editor: token.editor,
			changeType: token.changeType,
			pageId: enriched?.pageId ?? token.pageId,
			title: enriched?.title ?? token.title,
			extract,
			thumbnail: enriched?.thumbnail,
			rarity
		};
	}

	function normalizeTitle(title: string) {
		return title.trim().replace(/_/g, ' ').toLowerCase();
	}

	async function fetchArticleByTitle(title: string) {
		const cacheKey = normalizeTitle(title);
		const cached = articleCache.get(cacheKey);
		if (cached) return cached;

		try {
			const response = await fetch(
				`/api/pull?titles=${encodeURIComponent(title)}&sentences=${ARTICLE_ENRICH_SENTENCES}`
			);
			if (!response.ok) return null;

			const articles = (await response.json()) as WikiArticle[];
			const enriched = articles.find(
				(article) =>
					typeof article?.title === 'string' &&
					typeof article?.extract === 'string' &&
					typeof article?.pageId === 'number'
			);

			if (!enriched) return null;
			articleCache.set(cacheKey, enriched);
			return enriched;
		} catch {
			return null;
		}
	}

	function isRarity(value: unknown): value is CardRarity {
		return value === 'common' || value === 'rare' || value === 'epic' || value === 'legendary';
	}

	function rollRarity(): CardRarity {
		const roll = Math.random();
		if (roll < 0.03) return 'legendary';
		if (roll < 0.12) return 'epic';
		if (roll < 0.34) return 'rare';
		return 'common';
	}

	function rarityLabel(rarity: CardRarity) {
		if (rarity === 'legendary') return en.experiments.gachaStream.rarities.legendary;
		if (rarity === 'epic') return en.experiments.gachaStream.rarities.epic;
		if (rarity === 'rare') return en.experiments.gachaStream.rarities.rare;
		return en.experiments.gachaStream.rarities.common;
	}

	function shouldAwardCard(now: number) {
		const elapsedMs = Math.max(0, now - lastBudgetUpdateMs);
		lastBudgetUpdateMs = now;
		cardBudget = Math.min(
			CARD_BUCKET_CAPACITY,
			cardBudget + (elapsedMs / 1000) * TARGET_CARDS_PER_SECOND
		);

		if (cardBudget >= 1) {
			cardBudget -= 1;
			return true;
		}

		return false;
	}

	function enqueueReward(card: StoredCard) {
		rewardQueue = [...rewardQueue, card];
		processRewardQueue();
	}

	function processRewardQueue() {
		if (rewardRunning || rewardQueue.length === 0) return;
		rewardRunning = true;

		const next = rewardQueue[0];
		rewardQueue = rewardQueue.slice(1);
		rewardCard = next;
		rewardPhase = 'center';

		rewardCenterTimer = setTimeout(() => {
			rewardPhase = 'slide';
		}, REWARD_CENTER_MS);

		rewardCleanupTimer = setTimeout(() => {
			rewardCard = null;
			rewardPhase = null;
			rewardRunning = false;
			processRewardQueue();
		}, REWARD_TOTAL_MS);
	}

	function toggleMode() {
		mode = mode === 'stream' ? 'collection' : 'stream';
	}

	async function triggerBurstDrop() {
		if (burstLoading || !burstReady) return;

		burstLoading = true;
		burstReadyAt = Date.now() + BURST_COOLDOWN_MS;

		try {
			await fetchAndQueueBurstArticles(BURST_TOTAL_CARDS);
		} catch {
			burstReadyAt = Date.now();
		} finally {
			burstLoading = false;
		}
	}

	async function fetchAndQueueBurstArticles(targetCount: number) {
		const chunks: number[] = [];
		let remaining = targetCount;

		while (remaining > 0) {
			const chunk = Math.min(remaining, BURST_PULL_LIMIT);
			chunks.push(chunk);
			remaining -= chunk;
		}

		let queuedCount = 0;
		const requests = chunks.map(async (count) => {
			try {
				const response = await fetch(`/api/pull?count=${count}&sentences=2`);
				if (!response.ok) return;

				const batch = (await response.json()) as WikiArticle[];
				const valid = batch.filter(
					(article): article is WikiArticle =>
						typeof article?.title === 'string' &&
						typeof article?.extract === 'string' &&
						typeof article?.pageId === 'number'
				);

				if (valid.length === 0) return;

				const room = Math.max(0, targetCount - queuedCount);
				if (room === 0) return;

				const append = valid.slice(0, room);
				queuedCount += append.length;
				burstDispatchQueue = [...burstDispatchQueue, ...append];
				startBurstDispatch();
			} catch {
				return;
			}
		});

		await Promise.all(requests);
	}

	function startBurstDispatch() {
		if (burstDispatchActive || burstDispatchQueue.length === 0) return;
		burstDispatchActive = true;
		dispatchNextBurstArticle();
	}

	function dispatchNextBurstArticle() {
		if (burstDispatchQueue.length === 0) {
			burstDispatchTimer = null;
			burstDispatchActive = false;
			return;
		}

		const [article, ...rest] = burstDispatchQueue;
		burstDispatchQueue = rest;

		if (article) {
			articleCache.set(normalizeTitle(article.title), article);
			spawnToken(
				{
					title: article.title,
					page_id: article.pageId,
					user: en.experiments.gachaStream.burstSource,
					type: en.experiments.gachaStream.burstType,
					namespace: 0,
					server_name: 'en.wikipedia.org',
					meta: { domain: 'en.wikipedia.org' }
				},
				'burst'
			);
		}

		burstDispatchTimer = setTimeout(() => {
			dispatchNextBurstArticle();
		}, BURST_INSERT_INTERVAL_MS);
	}

	function formatRemaining(ms: number) {
		const totalSeconds = Math.ceil(ms / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
	}

</script>

<div class="relative flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden">

	{#if mode === 'stream'}
		<div class="relative flex-1 overflow-hidden bg-base-100">
			{#each streamTokens as token (token.id)}
				<div
					class="stream-token"
					class:stream-token-burst={token.variant === 'burst'}
					style={`--token-y:${token.y}%; --token-duration:${token.durationMs}ms; --spark-hue:${token.hue};`}
					onanimationend={() => handleTokenExit(token.id)}
				>
					<span class="token-text">{token.title}</span>
				</div>
			{/each}
		</div>
	{:else}
		<div class="flex-1 overflow-y-auto px-3 py-3 pb-20">
			<p class="mb-3 text-[10px] uppercase tracking-widest opacity-40">
				{en.experiments.gachaStream.collectionHint}
			</p>

			{#if collection.length === 0}
				<div class="card border-2 border-base-content/20 bg-base-200">
					<div class="card-body py-6">
						<p class="text-xs uppercase tracking-widest opacity-70">
							{en.experiments.gachaStream.emptyCollection}
						</p>
					</div>
				</div>
			{:else}
				<div class="grid grid-cols-1 gap-3 pb-12 sm:grid-cols-2">
					{#each collection as card (card.captureId)}
						<div
							class="relative border-2 bg-base-200 p-2 rarity-shell"
							class:rarity-common={card.rarity === 'common'}
							class:rarity-rare={card.rarity === 'rare'}
							class:rarity-epic={card.rarity === 'epic'}
							class:rarity-legendary={card.rarity === 'legendary'}
						>
							<span class="rarity-badge">{en.experiments.gachaStream.rarityLabel}: {rarityLabel(card.rarity)}</span>
							<GachaCard article={card} flippable={false} />
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<div class="relative z-20 border-t-2 border-base-content/20 bg-base-100/90 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur space-y-2">
		<div class="space-y-1">
			<div class="flex items-center justify-between text-[10px] uppercase tracking-widest opacity-60">
				<span>{en.experiments.gachaStream.burstProgress}</span>
				<span>{Math.round(burstChargeProgress * 100)}%</span>
			</div>
			<progress class="progress progress-primary w-full" value={burstChargeProgress * 100} max="100"></progress>
		</div>

		<button
			onclick={triggerBurstDrop}
			disabled={!burstReady || burstLoading}
			class="btn btn-secondary w-full uppercase tracking-[0.2em]"
		>
			{burstButtonLabel}
		</button>

		<button onclick={toggleMode} class="btn btn-primary w-full uppercase tracking-[0.2em]">
			{mode === 'stream'
				? en.experiments.gachaStream.viewCollection
				: en.experiments.gachaStream.backToStream}
		</button>
	</div>

	{#if rewardCard}
		<div class="pointer-events-none absolute inset-0 z-30 grid place-items-center px-3">
			<div
				class="reward-frame rarity-shell"
				class:rarity-common={rewardCard.rarity === 'common'}
				class:rarity-rare={rewardCard.rarity === 'rare'}
				class:rarity-epic={rewardCard.rarity === 'epic'}
				class:rarity-legendary={rewardCard.rarity === 'legendary'}
				class:reward-center={rewardPhase === 'center'}
				class:reward-slide={rewardPhase === 'slide'}
			>
				<div class="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.3em] opacity-70">
					{en.experiments.gachaStream.rewardPrefix}
				</div>
				<div class="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.24em] opacity-85">
					{en.experiments.gachaStream.rarityLabel}: {rarityLabel(rewardCard.rarity)}
				</div>
				<GachaCard article={rewardCard} flippable={false} />
			</div>
		</div>
	{/if}
</div>

<style>
	.stream-token {
		position: absolute;
		top: var(--token-y);
		left: -90vw;
		border: 2px solid hsl(var(--bc) / 0.24);
		background: hsl(var(--b2) / 0.93);
		padding: 0.4rem 0.7rem;
		text-align: left;
		animation: token-drift var(--token-duration) linear forwards;
		will-change: transform;
		z-index: 10;
	}

	.stream-token-burst {
		border-color: transparent;
		background:
			linear-gradient(hsl(var(--b2) / 0.96), hsl(var(--b2) / 0.96)) padding-box,
			linear-gradient(
				120deg,
				hsl(calc(var(--spark-hue) * 1deg) 90% 58%),
				hsl(calc((var(--spark-hue) + 110) * 1deg) 85% 62%),
				hsl(calc((var(--spark-hue) + 220) * 1deg) 90% 57%)
			)
			border-box;
		box-shadow:
			0 0 0.6rem hsl(calc(var(--spark-hue) * 1deg) 90% 58% / 0.45),
			0 0 1.1rem hsl(calc((var(--spark-hue) + 170) * 1deg) 85% 58% / 0.34);
		z-index: 24;
		animation:
			token-drift var(--token-duration) linear forwards,
			burst-shimmer 0.9s linear infinite;
	}

	.token-text {
		display: block;
		max-width: 72vw;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
	}

	.reward-frame {
		width: min(24rem, calc(100vw - 1.5rem));
		opacity: 0;
		transform: translateY(22dvh);
		padding: 0.35rem;
		background: hsl(var(--b2) / 0.7);
	}

	.rarity-shell {
		border-color: hsl(var(--bc) / 0.24);
	}

	.rarity-badge {
		position: absolute;
		top: 0.45rem;
		right: 0.45rem;
		z-index: 2;
		border: 1px solid currentColor;
		padding: 0.2rem 0.45rem;
		font-size: 0.56rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		background: hsl(var(--b1) / 0.85);
	}

	.rarity-common {
		border-color: hsl(var(--bc) / 0.28);
	}

	.rarity-rare {
		border-color: rgb(71 186 255 / 0.8);
		box-shadow: 0 0 0.9rem rgb(71 186 255 / 0.2);
	}

	.rarity-epic {
		border-color: rgb(216 124 255 / 0.85);
		box-shadow: 0 0 1.1rem rgb(216 124 255 / 0.28);
	}

	.rarity-legendary {
		border-color: rgb(255 193 59 / 0.92);
		box-shadow:
			0 0 1.2rem rgb(255 193 59 / 0.34),
			0 0 0.5rem rgb(255 110 45 / 0.3);
	}

	.reward-center {
		opacity: 1;
		animation: reward-center 0.32s ease-out forwards;
	}

	.reward-slide {
		opacity: 1;
		animation: reward-slide 0.9s cubic-bezier(0.23, 1, 0.32, 1) forwards;
	}

	@keyframes token-drift {
		0% {
			transform: translateX(0) scale(0.62);
			opacity: 0;
		}
		8% {
			opacity: 1;
		}
		100% {
			transform: translateX(245vw) scale(1.18);
			opacity: 0.08;
		}
	}

	@keyframes burst-shimmer {
		0% {
			filter: saturate(1) brightness(1);
		}
		50% {
			filter: saturate(1.3) brightness(1.22);
		}
		100% {
			filter: saturate(1) brightness(1);
		}
	}

	@keyframes reward-center {
		0% {
			transform: translateY(18dvh) scale(0.92);
			opacity: 0;
		}
		100% {
			transform: translateY(0) scale(1);
			opacity: 1;
		}
	}

	@keyframes reward-slide {
		0% {
			transform: translateY(0) scale(1);
			opacity: 1;
		}
		100% {
			transform: translateX(105vw) translateY(-5dvh) scale(0.94);
			opacity: 0;
		}
	}
</style>
