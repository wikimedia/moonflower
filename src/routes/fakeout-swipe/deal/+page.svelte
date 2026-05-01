<script lang="ts">
	import { resolve } from '$app/paths';
	import FakeoutCard from '../components/FakeoutCard.svelte';
	import { en } from '$lib/i18n/en';
	import { toastStore } from '$lib/stores/toast.svelte';
	import type { WikiArticle } from '$lib/types';
	import { buildHand, rarityClass } from '../game';
	import { fakeCards } from '../fake-cards';
	import { fakeoutSwipeState } from '../state.svelte';
	import type { DealCard } from '../types';

	const HAND_SIZE = 5;
	const MAX_DEALT = 20;
	const SWIPE_THRESHOLD_PX = 96;
	const SWIPE_THROW_MS = 190;

	let dealing = $state(false);
	let failed = $state(false);
	let countdownText = $state('');
	let countdownTimer: number | null = null;
	let introPrimed = $state(false);
	let showIntro = $state(true);
	let showMistakeModal = $state(false);
	let viewportWidth = $state(430);
	let dragPointerId: number | null = null;
	let dragStartX = $state(0);
	let dragStartY = $state(0);
	let dragOffsetX = $state(0);
	let dragOffsetY = $state(0);
	let dragActive = $state(false);
	let throwDirection = $state<'left' | 'right' | null>(null);
	let throwingCard = $state<DealCard | null>(null);
	let swipeTimer: number | null = null;

	const snapshot = $derived(fakeoutSwipeState.value);
	const currentCard = $derived(snapshot.activeHand[0] ?? null);
	const previewCard = $derived.by(() => {
		if (!throwingCard) {
			return snapshot.activeHand[1] ?? null;
		}

		const frontCard = snapshot.activeHand[0] ?? null;
		if (frontCard?.id === throwingCard.id) {
			return snapshot.activeHand[1] ?? null;
		}

		return frontCard;
	});
	const displayCard = $derived(throwingCard ?? currentCard);
	const isRunActive = $derived(snapshot.status === 'active');
	const runEnded = $derived(snapshot.status === 'ended');
	const stackCount = $derived(Math.max(0, snapshot.activeHand.length - 1));
	const swipeProgress = $derived.by(() => Math.min(1, Math.abs(dragOffsetX) / 140));
	const keepProgress = $derived.by(() => {
		if (throwDirection === 'right') return 1;
		if (dragOffsetX <= 0) return 0;
		return swipeProgress;
	});
	const rejectProgress = $derived.by(() => {
		if (throwDirection === 'left') return 1;
		if (dragOffsetX >= 0) return 0;
		return swipeProgress;
	});
	const statusText = $derived.by(() => {
		if (failed) return en.experiments.fakeoutSwipe.statusFailed;
		if (snapshot.status === 'active') return en.experiments.fakeoutSwipe.statusActive;
		if (snapshot.status === 'ended') return en.experiments.fakeoutSwipe.statusEnded;
		return en.experiments.fakeoutSwipe.statusReady;
	});
	const cooldownExpired = $derived(runEnded && fakeoutSwipeState.canStartRun);
	const cardTransform = $derived.by(() => {
		const rotate = throwDirection === 'left'
			? -18
			: throwDirection === 'right'
				? 18
				: dragOffsetX / 18;
		const lift = dragActive ? Math.min(12, Math.max(-12, dragOffsetY * 0.08)) : 0;
		const scale = dragActive ? 1.015 : 1;
		return `translate3d(${dragOffsetX}px, ${lift}px, 0) rotate(${rotate}deg) scale(${scale})`;
	});
	const cardTransition = $derived(
		dragActive
			? 'none'
			: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease, box-shadow 180ms ease'
	);

	function fmtRemaining(ms: number): string {
		const total = Math.max(0, Math.floor(ms / 1000));
		const minutes = Math.floor(total / 60);
		const seconds = total % 60;
		return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
	}

	function updateCountdown() {
		fakeoutSwipeState.refreshCooldownState();
		const ms = fakeoutSwipeState.cooldownRemainingMs;
		countdownText = ms > 0 ? fmtRemaining(ms) : '';
	}

	$effect(() => {
		if (typeof window === 'undefined') return;

		const syncViewport = () => {
			viewportWidth = window.innerWidth;
		};

		syncViewport();
		updateCountdown();
		window.addEventListener('resize', syncViewport);

		if (countdownTimer !== null) {
			clearInterval(countdownTimer);
		}
		countdownTimer = window.setInterval(updateCountdown, 1000);

		return () => {
			window.removeEventListener('resize', syncViewport);
			if (countdownTimer !== null) {
				clearInterval(countdownTimer);
			}
			if (swipeTimer !== null) {
				clearTimeout(swipeTimer);
			}
		};
	});

	$effect(() => {
		if (introPrimed) return;
		introPrimed = true;
		showIntro = !snapshot.hasSeenDealIntro;
	});

	async function fetchRealCards(count: number): Promise<WikiArticle[]> {
		const res = await fetch(`/api/pull?count=${count}&sentences=3&requireImages=false`);
		if (!res.ok) throw new Error('pull failed');
		const cards = (await res.json()) as WikiArticle[];
		if (cards.length < count) {
			throw new Error('not enough cards from api');
		}
		return cards;
	}

	async function fillQueue() {
		if (dealing || runEnded || showIntro) return;

		const current = fakeoutSwipeState.value;
		if (current.activeHand.length > 0 || current.totalDealt >= MAX_DEALT) {
			return;
		}

		dealing = true;
		try {
			const remaining = MAX_DEALT - current.totalDealt;
			const handSize = Math.min(HAND_SIZE, remaining);
			const realNeeded = Math.max(1, handSize - 1);
			const real = await fetchRealCards(realNeeded);
			const { hand } = buildHand(real, fakeCards);
			fakeoutSwipeState.setHand(hand.slice(0, handSize));
		} catch {
			toastStore.show(en.errors.pullFailed, 'error');
		} finally {
			dealing = false;
		}
	}

	function resetGesture() {
		dragPointerId = null;
		dragActive = false;
		dragOffsetX = 0;
		dragOffsetY = 0;
		throwDirection = null;
		throwingCard = null;
	}

	function keepCard(card: DealCard) {
		if (card.isFake) {
			if (!snapshot.hasSeenFakeMistake) {
				showMistakeModal = true;
				fakeoutSwipeState.markFakeMistakeSeen();
				fakeoutSwipeState.rejectCard(card.id);
				return;
			}
			failed = true;
			fakeoutSwipeState.takeFake({
				cardId: card.id,
				article: card.article,
				rarity: card.rarity,
				fakeReason: fakeCards.find((entry) => entry.title === card.article.title)?.fakeReason ?? 'Unknown decoy',
				takenAt: Date.now()
			});
			toastStore.show(en.experiments.fakeoutSwipe.failureBody, 'error');
			return;
		}

		fakeoutSwipeState.keepReal(card.id, card.rarity, card.article);
	}

	function rejectCard(card: DealCard) {
		fakeoutSwipeState.rejectCard(card.id);
	}

	function commitSwipe(direction: 'left' | 'right') {
		const swiped = currentCard;
		if (!swiped || throwDirection || dealing || showIntro || runEnded) return;

		throwingCard = swiped;
		throwDirection = direction;
		dragActive = false;
		dragPointerId = null;
		dragOffsetX = direction === 'right' ? viewportWidth * 1.1 : -viewportWidth * 1.1;
		dragOffsetY = 8;

		swipeTimer = window.setTimeout(() => {
			swipeTimer = null;
			if (direction === 'right') {
				keepCard(swiped);
			} else {
				rejectCard(swiped);
			}
			resetGesture();
		}, SWIPE_THROW_MS);
	}

	function beginRun() {
		failed = false;
		if (snapshot.status !== 'active') {
			if (!fakeoutSwipeState.startRun()) {
				toastStore.show(`${en.experiments.fakeoutSwipe.cooldown} ${countdownText}`, 'info');
				return;
			}
		}
		void fillQueue();
	}

	function acknowledgeIntro() {
		showIntro = false;
		fakeoutSwipeState.markDealIntroSeen();
		beginRun();
	}

	$effect(() => {
		if (showIntro || dealing || runEnded) return;
		if (snapshot.status === 'active' && snapshot.activeHand.length === 0 && snapshot.totalDealt < MAX_DEALT) {
			void fillQueue();
		}
	});

	$effect(() => {
		if (snapshot.status !== 'active') return;
		if (snapshot.totalDealt >= MAX_DEALT && snapshot.activeHand.length === 0) {
			fakeoutSwipeState.endRun();
			toastStore.show(en.experiments.fakeoutSwipe.statusMaxDealt, 'info');
		}
	});

	function handlePointerDown(event: PointerEvent) {
		if (!currentCard || dealing || showIntro || runEnded || throwDirection) return;
		dragPointerId = event.pointerId;
		dragStartX = event.clientX;
		dragStartY = event.clientY;
		dragOffsetX = 0;
		dragOffsetY = 0;
		dragActive = true;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function handlePointerMove(event: PointerEvent) {
		if (!dragActive || event.pointerId !== dragPointerId) return;
		dragOffsetX = event.clientX - dragStartX;
		dragOffsetY = event.clientY - dragStartY;
	}

	function handlePointerUp(event: PointerEvent) {
		if (!dragActive || event.pointerId !== dragPointerId) return;

		const target = event.currentTarget as HTMLElement;
		if (target.hasPointerCapture(event.pointerId)) {
			target.releasePointerCapture(event.pointerId);
		}

		dragActive = false;
		dragPointerId = null;

		const absX = Math.abs(dragOffsetX);
		const absY = Math.abs(dragOffsetY);
		if (absX >= SWIPE_THRESHOLD_PX && absX > absY * 1.1) {
			commitSwipe(dragOffsetX > 0 ? 'right' : 'left');
			return;
		}

		dragOffsetX = 0;
		dragOffsetY = 0;
	}

	function handlePointerCancel(event: PointerEvent) {
		if (event.pointerId !== dragPointerId) return;
		resetGesture();
	}

	function endRun() {
		if (snapshot.status === 'active') {
			fakeoutSwipeState.endRun();
		}
	}
</script>

<svelte:options runes={true} />

<div class="relative min-h-[calc(100dvh-3.5rem)] overflow-hidden px-4 py-6 pb-32">
	<div class="fakeout-sky absolute inset-0 pointer-events-none"></div>
	<div class="fakeout-stars absolute inset-0 pointer-events-none"></div>

	<div class="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-6">
		<div class="flex items-start justify-between gap-4">
			<div>
				<div class="text-xs uppercase tracking-widest opacity-70">{statusText}</div>
				{#if countdownText}
					<div class="mt-2 text-xs uppercase tracking-widest opacity-50">
						{en.experiments.fakeoutSwipe.cooldown} {countdownText}
					</div>
				{/if}
			</div>
			<a class="btn btn-neutral btn-sm tracking-[0.2em]" href={resolve('/fakeout-swipe/collection')}>
				{en.experiments.fakeoutSwipe.collectionButton}
			</a>
		</div>

		{#if failed}
			<section class="fakeout-failure border-2 border-error bg-error/20 p-5 text-error-content">
				<h2 class="text-lg font-bold uppercase tracking-[0.3em]">{en.experiments.fakeoutSwipe.failureTitle}</h2>
				<p class="mt-2 text-sm uppercase tracking-widest">{en.experiments.fakeoutSwipe.failureBody}</p>
			</section>
		{/if}

		<section class="space-y-4">
			<div class="flex items-center justify-between text-xs font-bold uppercase tracking-[0.3em] opacity-70">
				<h2>{en.experiments.fakeoutSwipe.currentCardTitle}</h2>
				<div>{en.experiments.fakeoutSwipe.stackLabel}: {stackCount}</div>
			</div>

			{#if displayCard}
				<div class="relative h-[36rem] w-full overflow-hidden rounded-none">
					{#if previewCard}
						{#key previewCard.id}
							<div class={`pointer-events-none absolute inset-x-4 top-5 z-0 opacity-40 ${rarityClass(previewCard.rarity)}`}>
								<div class="scale-[0.94] blur-[0.4px]">
									<FakeoutCard article={previewCard.article} flippable={false} linkable={false} />
								</div>
							</div>
						{/key}
					{/if}

					<div class="pointer-events-none absolute inset-0 z-20 grid grid-cols-2 gap-4 px-1 pb-10 pt-2">
						<div
							class="flex items-start justify-start"
							style={`opacity:${rejectProgress}; transform: translate3d(${-dragOffsetX * 0.08}px, 0, 0);`}
						>
							<div class="border-2 border-error bg-error/15 px-4 py-2 text-sm font-bold uppercase tracking-[0.3em] text-error">
								{en.experiments.fakeoutSwipe.rejectLabel}
							</div>
						</div>
						<div
							class="flex items-start justify-end"
							style={`opacity:${keepProgress}; transform: translate3d(${dragOffsetX * 0.08}px, 0, 0);`}
						>
							<div class="border-2 border-success bg-success/15 px-4 py-2 text-sm font-bold uppercase tracking-[0.3em] text-success">
								{en.experiments.fakeoutSwipe.keepLabel}
							</div>
						</div>
					</div>

					{#key displayCard.id}
						<div
							class={`absolute inset-x-0 top-0 z-10 ${rarityClass(displayCard.rarity)}`}
							role="group"
							aria-label={en.experiments.fakeoutSwipe.currentCardTitle}
							onpointerdown={handlePointerDown}
							onpointermove={handlePointerMove}
							onpointerup={handlePointerUp}
							onpointercancel={handlePointerCancel}
							style={`transform:${cardTransform}; transition:${cardTransition}; touch-action: pan-y;`}
						>
							<FakeoutCard article={displayCard.article} flippable={false} linkable={false} />
						</div>
					{/key}
				</div>

				<div class="text-center text-xs uppercase tracking-[0.25em] opacity-55">
					{en.experiments.fakeoutSwipe.swipeHint}
				</div>
			{:else if dealing}
				<div class="flex h-[36rem] items-center justify-center border-2 border-base-content/20 bg-base-200/55 p-6 text-center">
					<div class="space-y-3">
						<div class="loading loading-spinner loading-lg"></div>
						<div class="text-sm font-bold uppercase tracking-[0.3em]">{en.experiments.fakeoutSwipe.dealing}</div>
					</div>
				</div>
			{:else}
				{#if !runEnded}
					<div class="flex h-[36rem] items-center justify-center border-2 border-dashed border-base-content/20 bg-base-200/40 p-6 text-center">
						<div class="max-w-sm space-y-4">
							<h3 class="text-lg font-bold uppercase tracking-[0.3em]">{en.experiments.fakeoutSwipe.readyTitle}</h3>
							<p class="text-sm uppercase tracking-widest opacity-70">{en.experiments.fakeoutSwipe.readyBody}</p>
							<button class="btn btn-primary tracking-[0.25em]" onclick={beginRun} disabled={!fakeoutSwipeState.canStartRun}>
								{en.experiments.fakeoutSwipe.dealButton}
							</button>
						</div>
					</div>
				{/if}
			{/if}
		</section>
	</div>

	<div class="fixed inset-x-0 bottom-0 z-30 border-t-2 border-base-content/20 bg-base-200/92 px-4 py-3 backdrop-blur-sm">
		<div class="mx-auto flex w-full max-w-3xl flex-col gap-3">
			{#if currentCard && isRunActive}
				<div class="grid grid-cols-2 gap-3">
					<button class="btn btn-outline btn-error tracking-[0.25em]" onclick={() => commitSwipe('left')} disabled={throwDirection !== null}>
						{en.experiments.fakeoutSwipe.rejectButton}
					</button>
					<button class="btn btn-success tracking-[0.25em]" onclick={() => commitSwipe('right')} disabled={throwDirection !== null}>
						{en.experiments.fakeoutSwipe.keepButton}
					</button>
				</div>
			{:else if runEnded}
				{#if cooldownExpired}
					<button class="btn btn-primary tracking-[0.25em]" onclick={beginRun}>
						{en.experiments.fakeoutSwipe.dealButton}
					</button>
				{:else if countdownText}
					<div class="border-2 border-base-content/20 bg-base-100/75 px-4 py-3 text-center">
						<div class="text-[11px] font-bold uppercase tracking-[0.3em] opacity-60">
							{en.experiments.fakeoutSwipe.cooldown}
						</div>
						<div class="mt-2 text-lg font-bold uppercase tracking-[0.3em]">{countdownText}</div>
					</div>
				{/if}
				<a class="btn btn-primary tracking-[0.25em]" href={resolve('/fakeout-swipe')} onclick={endRun}>
					{en.experiments.fakeoutSwipe.menuButton}
				</a>
			{/if}

			<div class="flex items-center justify-between text-xs uppercase tracking-[0.25em]">
				<div>{en.experiments.fakeoutSwipe.cardsDealt}: {snapshot.totalDealt}/{MAX_DEALT}</div>
				<div>{en.experiments.fakeoutSwipe.cardsKept}: {snapshot.collection.length}</div>
			</div>
		</div>
	</div>

	{#if showMistakeModal}
		<div class="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
			<div class="w-full max-w-xl border-2 border-warning bg-base-100 p-5">
				<h2 class="text-lg font-bold uppercase tracking-[0.3em] text-warning">
					{en.experiments.fakeoutSwipe.mistakeTitle}
				</h2>
				<p class="mt-4 text-sm uppercase tracking-widest opacity-80">
					{en.experiments.fakeoutSwipe.mistakeBody}
				</p>
				<div class="mt-6 flex justify-end">
					<button class="btn btn-warning tracking-[0.2em]" onclick={() => { showMistakeModal = false; }}>
						{en.experiments.fakeoutSwipe.mistakeConfirm}
					</button>
				</div>
			</div>
		</div>
	{/if}

	{#if showIntro}
		<div class="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
			<div class="w-full max-w-xl border-2 border-info bg-base-100 p-5">
				<h2 class="text-lg font-bold uppercase tracking-[0.3em] text-info">
					{en.experiments.fakeoutSwipe.introTitle}
				</h2>
				<p class="mt-4 text-sm uppercase tracking-widest opacity-80">
					{en.experiments.fakeoutSwipe.introBody}
				</p>
				<div class="mt-6 flex justify-end">
					<button class="btn btn-info tracking-[0.2em]" onclick={acknowledgeIntro}>
						{en.experiments.fakeoutSwipe.introConfirm}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.fakeout-sky {
		background:
			radial-gradient(circle at 20% 20%, rgb(34 211 238 / 0.25), transparent 45%),
			radial-gradient(circle at 80% 35%, rgb(14 165 233 / 0.22), transparent 40%),
			linear-gradient(160deg, rgb(8 10 19) 0%, rgb(11 19 30) 60%, rgb(6 9 15) 100%);
	}

	.fakeout-stars {
		background-image:
			radial-gradient(circle at 10% 15%, rgb(255 255 255 / 0.7) 0.08rem, transparent 0.09rem),
			radial-gradient(circle at 77% 25%, rgb(255 255 255 / 0.6) 0.07rem, transparent 0.08rem),
			radial-gradient(circle at 40% 70%, rgb(255 255 255 / 0.5) 0.06rem, transparent 0.07rem),
			radial-gradient(circle at 88% 82%, rgb(255 255 255 / 0.4) 0.07rem, transparent 0.08rem);
		animation: fakeout-sky-drift 18s linear infinite;
	}

	.fakeout-rarity-common :global(.card) {
		border-color: rgb(115 115 115 / 0.4);
	}

	.fakeout-rarity-rare :global(.card) {
		border-color: rgb(34 211 238 / 0.8);
		box-shadow: 0 0 24px rgb(34 211 238 / 0.28);
	}

	.fakeout-rarity-legendary :global(.card) {
		border-color: rgb(250 204 21 / 0.95);
		box-shadow: 0 0 28px rgb(250 204 21 / 0.35), inset 0 0 14px rgb(250 204 21 / 0.2);
	}

	.fakeout-failure {
		animation: fakeout-failure-impact 520ms ease-out;
	}

	@keyframes fakeout-sky-drift {
		from {
			transform: translateX(0);
		}
		to {
			transform: translateX(-2%);
		}
	}

	@keyframes fakeout-failure-impact {
		0% {
			opacity: 0;
			transform: scale(0.98) translateY(12px);
		}
		40% {
			opacity: 1;
			transform: scale(1.01) translateY(0);
		}
		100% {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>