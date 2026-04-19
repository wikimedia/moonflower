<script lang="ts">
	import { resolve } from '$app/paths';
	import FakeoutCard from '../components/FakeoutCard.svelte';
	import { en } from '$lib/i18n/en';
	import { toastStore } from '$lib/stores/toast.svelte';
	import type { WikiArticle } from '$lib/types';
	import { buildHand, rarityClass } from '../game';
	import { fakeCards } from '../fake-cards';
	import { fakeoutState } from '../state.svelte';
	import type { DealCard } from '../types';

	const HAND_SIZE = 5;
	const MAX_DEALT = 20;

	let dealing = $state(false);
	let failed = $state(false);
	let countdownText = $state('');
	let countdownTimer: number | null = null;
	let autoDealt = $state(false);
	let showFakeWarning = $state(false);
	let showNoPickWarning = $state(false);

	const snapshot = $derived(fakeoutState.value);
	const isRunActive = $derived(snapshot.status === 'active');
	const canDeal = $derived(isRunActive && !dealing && snapshot.totalDealt < MAX_DEALT);
	const noRemainingDeals = $derived(snapshot.totalDealt >= MAX_DEALT);
	const runEnded = $derived(snapshot.status === 'ended');
	const statusText = $derived.by(() => {
		if (failed) return en.experiments.fakeout.statusFailed;
		if (snapshot.status === 'active') return en.experiments.fakeout.statusActive;
		if (snapshot.status === 'ended') return en.experiments.fakeout.statusEnded;
		return en.experiments.fakeout.statusReady;
	});

	function fmtRemaining(ms: number): string {
		const total = Math.max(0, Math.floor(ms / 1000));
		const minutes = Math.floor(total / 60);
		const seconds = total % 60;
		return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
	}

	function updateCountdown() {
		fakeoutState.refreshCooldownState();
		const ms = fakeoutState.cooldownRemainingMs;
		countdownText = ms > 0 ? fmtRemaining(ms) : '';
	}

	$effect(() => {
		updateCountdown();
		if (countdownTimer !== null) {
			clearInterval(countdownTimer);
		}
		countdownTimer = window.setInterval(updateCountdown, 1000);

		return () => {
			if (countdownTimer !== null) {
				clearInterval(countdownTimer);
			}
		};
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

	async function deal() {
		if (dealing || runEnded) return;

		const hasActiveUntouchedHand =
			snapshot.activeHand.length > 0 && !snapshot.activeHand.some((card) => card.taken);
		if (snapshot.totalDealt > 0 && hasActiveUntouchedHand && !snapshot.hasSeenNoPickWarning) {
			fakeoutState.markNoPickWarningSeen();
			showNoPickWarning = true;
			return;
		}

		if (snapshot.status !== 'active') {
			failed = false;
			if (!fakeoutState.startRun()) {
				toastStore.show(`${en.experiments.fakeout.cooldown} ${countdownText}`, 'info');
				return;
			}
		}

		const current = fakeoutState.value;
		if (current.totalDealt >= MAX_DEALT) return;

		dealing = true;
		try {
			const remaining = MAX_DEALT - current.totalDealt;
			const handSize = Math.min(HAND_SIZE, remaining);
			const realNeeded = Math.max(1, handSize - 1);
			const real = await fetchRealCards(realNeeded);
			const { hand } = buildHand(real, fakeCards);
			fakeoutState.setHand(hand.slice(0, handSize));
			toastStore.show(en.experiments.fakeout.handTitle, 'info');
		} catch {
			toastStore.show(en.errors.pullFailed, 'error');
		} finally {
			dealing = false;
		}
	}

	function take(card: DealCard) {
		if (!isRunActive || card.taken) return;

		if (card.isFake) {
			if (!snapshot.hasSeenFakeWarning) {
				fakeoutState.markFakeWarningSeen();
				showFakeWarning = true;
				return;
			}

			failed = true;
			fakeoutState.takeFake({
				cardId: card.id,
				article: card.article,
				rarity: card.rarity,
				fakeReason: fakeCards.find((f) => f.title === card.article.title)?.fakeReason ?? 'Unknown decoy',
				takenAt: Date.now()
			});
			toastStore.show(en.experiments.fakeout.failureBody, 'error');
			return;
		}

		fakeoutState.takeReal(card.id, card.rarity, card.article);

		const allTaken = fakeoutState.value.activeHand.every((c) => c.taken || c.id === card.id);
		if (allTaken) {
			fakeoutState.setHand([]);
		}
	}

	$effect(() => {
		if (snapshot.status !== 'active') return;
		if (snapshot.totalDealt >= MAX_DEALT && snapshot.activeHand.length === 0) {
			fakeoutState.endRun();
			toastStore.show(en.experiments.fakeout.statusMaxDealt, 'info');
		}
	});

	$effect(() => {
		if (autoDealt) return;
		if (dealing || runEnded) return;
		if (snapshot.totalDealt > 0 || snapshot.activeHand.length > 0) {
			autoDealt = true;
			return;
		}

		autoDealt = true;
		void deal();
	});

	function endDeal() {
		if (snapshot.status === 'active') {
			fakeoutState.endRun();
		}
	}
</script>

<svelte:options runes={true} />

<div class="relative min-h-[calc(100dvh-3.5rem)] overflow-hidden px-4 py-6 pb-24">
	<div class="fakeout-sky absolute inset-0 pointer-events-none"></div>
	<div class="fakeout-stars absolute inset-0 pointer-events-none"></div>

	<div class="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6">
		<div class="text-xs uppercase tracking-widest opacity-70">{statusText}</div>
		{#if countdownText}
			<div class="text-xs uppercase tracking-widest opacity-50">
				{en.experiments.fakeout.cooldown} {countdownText}
			</div>
		{/if}

		{#if failed}
			<section class="fakeout-failure border-2 border-error bg-error/20 p-5 text-error-content">
				<h2 class="text-lg font-bold uppercase tracking-[0.3em]">{en.experiments.fakeout.failureTitle}</h2>
				<p class="mt-2 text-sm uppercase tracking-widest">{en.experiments.fakeout.failureBody}</p>
			</section>
		{/if}

		{#if !runEnded}
			<section>
				<h2 class="mb-4 text-xs font-bold uppercase tracking-[0.3em] opacity-70">
					{en.experiments.fakeout.handTitle}
				</h2>
				{#if snapshot.activeHand.length === 0}
					<div class="border-2 border-dashed border-base-content/20 p-6 text-xs uppercase tracking-widest opacity-40">
						{en.experiments.fakeout.emptyHand}
					</div>
				{:else}
					<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
						{#each snapshot.activeHand as card, i (card.id)}
							<div class={`fakeout-drift ${rarityClass(card.rarity)} animate-stagger-in`} style={`animation-delay:${i * 70}ms`}>
								<div class="relative">
									<FakeoutCard
										article={card.article}
										linkable={false}
										onRevealClick={() => take(card)}
									/>
									{#if card.taken}
										<div class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
											<div class="rotate-[-13deg] border-4 border-success bg-base-100/85 px-6 py-2 text-xl font-bold uppercase tracking-[0.3em] text-success shadow-[0_0_0_2px_rgba(0,0,0,0.35)]">
												{en.experiments.fakeout.takenStamp}
											</div>
										</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>
		{/if}
	</div>

	<div class="fixed inset-x-0 bottom-0 z-30 border-t-2 border-base-content/20 bg-base-200/92 px-4 py-3 backdrop-blur-sm">
		<div class="mx-auto flex w-full max-w-6xl flex-col gap-3">
			{#if !runEnded}
				{#if noRemainingDeals}
					<a
						class="btn btn-primary tracking-[0.25em]"
						href={resolve('/fakeout')}
						onclick={endDeal}
					>
						{en.experiments.fakeout.endDealButton}
					</a>
				{:else}
					<button class="btn btn-primary tracking-[0.25em]" onclick={deal} disabled={dealing || (snapshot.status !== 'active' && !fakeoutState.canStartRun) || (snapshot.status === 'active' && !canDeal)}>
						{#if dealing}
							<span class="loading loading-dots loading-xs"></span>
							{en.experiments.fakeout.dealing}
						{:else if snapshot.totalDealt === 0}
							{en.experiments.fakeout.dealButton}
						{:else}
							{en.experiments.fakeout.dealAgainButton}
						{/if}
					</button>
				{/if}
			{/if}

			<div class="flex items-center justify-between text-xs uppercase tracking-[0.25em]">
				<div>{en.experiments.fakeout.cardsDealt}: {snapshot.totalDealt}/{MAX_DEALT}</div>
				<div>{en.experiments.fakeout.cardsTaken}: {snapshot.collection.length}</div>
			</div>
		</div>
	</div>

	{#if showFakeWarning}
		<div class="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
			<div class="w-full max-w-xl border-2 border-warning bg-base-100 p-5">
				<h2 class="text-lg font-bold uppercase tracking-[0.3em] text-warning">
					{en.experiments.fakeout.fakeWarningTitle}
				</h2>
				<p class="mt-4 text-sm uppercase tracking-widest opacity-80">
					{en.experiments.fakeout.fakeWarningBody}
				</p>
				<div class="mt-6 flex justify-end">
					<button class="btn btn-warning tracking-[0.2em]" onclick={() => (showFakeWarning = false)}>
						{en.experiments.fakeout.fakeWarningConfirm}
					</button>
				</div>
			</div>
		</div>
	{/if}

	{#if showNoPickWarning}
		<div class="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
			<div class="w-full max-w-xl border-2 border-warning bg-base-100 p-5">
				<h2 class="text-lg font-bold uppercase tracking-[0.3em] text-warning">
					{en.experiments.fakeout.noPickWarningTitle}
				</h2>
				<p class="mt-4 text-sm uppercase tracking-widest opacity-80">
					{en.experiments.fakeout.noPickWarningBody}
				</p>
				<div class="mt-6 flex justify-end">
					<button class="btn btn-warning tracking-[0.2em]" onclick={() => (showNoPickWarning = false)}>
						{en.experiments.fakeout.noPickWarningConfirm}
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
			radial-gradient(circle at 80% 35%, rgb(16 185 129 / 0.2), transparent 40%),
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

	.fakeout-drift {
		animation: fakeout-card-drift 5.5s ease-in-out infinite alternate;
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

	@keyframes fakeout-card-drift {
		from {
			transform: translate3d(0, 0, 0) rotate(-0.8deg);
		}
		to {
			transform: translate3d(0, -8px, 0) rotate(0.8deg);
		}
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
