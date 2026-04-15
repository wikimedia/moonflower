<script lang="ts">
	import type { WikiCard } from '$lib/types';
	import { en } from '$lib/i18n/en';

	interface Props {
		card: WikiCard;
		mode?: 'pull' | 'inventory';
		onClaim?: (card: WikiCard) => void;
		onRelease?: (card: WikiCard) => void;
		claiming?: boolean;
		claimed?: boolean;
		releasing?: boolean;
	}

	let {
		card,
		mode = 'pull',
		onClaim,
		onRelease,
		claiming = false,
		claimed = false,
		releasing = false
	}: Props = $props();

	let isFlipped = $state(false);
	let expanded = $state(false);

	$effect(() => {
		if (mode === 'inventory') {
			isFlipped = true;
		}
	});

	function flip() {
		if (mode === 'pull' && !isFlipped) {
			isFlipped = true;
		}
	}

	function handleClaim(e: MouseEvent) {
		e.stopPropagation();
		onClaim?.(card);
	}

	function handleRelease(e: MouseEvent) {
		e.stopPropagation();
		onRelease?.(card);
	}

	function toggleExpand(e: MouseEvent) {
		e.stopPropagation();
		expanded = !expanded;
	}
</script>

<div class="card-container" class:is-flipped={isFlipped}>
	<!-- Face-down: clickable to flip -->
	{#if !isFlipped}
		<button
			class="card card-back bg-neutral text-neutral-content flex w-full items-center justify-center border-2 border-base-content/20"
			onclick={flip}
			aria-label={en.gacha.revealHint}
		>
			<span class="select-none text-7xl font-bold">{en.gacha.revealHint}</span>
		</button>
	{:else}
		<!-- Face-up: static content -->
		<div class="card bg-base-200 border-2 border-base-content/20 p-5 animate-fade-in">
			<h2
				class="mb-3 border-b-2 border-base-content/20 pb-2 text-base font-bold uppercase tracking-widest"
			>
				{card.title}
			</h2>

			<div class="prose prose-sm max-w-none" class:line-clamp-6={!expanded}>
				<p>{card.extract}</p>
			</div>

			{#if card.extract && card.extract.length > 200}
				<button
					class="link link-hover mt-2 text-xs font-bold uppercase tracking-widest opacity-50"
					onclick={toggleExpand}
				>
					{expanded ? en.gacha.collapse : en.gacha.readMore}
				</button>
			{/if}

			{#if mode === 'pull' && !claimed}
				<button
					class="btn btn-primary btn-block mt-4 tracking-[0.3em]"
					onclick={handleClaim}
					disabled={claiming}
				>
					{#if claiming}
						<span class="loading loading-spinner loading-sm"></span>
					{/if}
					{claiming ? en.common.loading : en.gacha.claimButton}
				</button>
			{:else if mode === 'pull' && claimed}
				<div
					class="btn btn-disabled btn-block mt-4 tracking-[0.3em]"
				>
					{en.common.claimed}
				</div>
			{/if}

			{#if mode === 'inventory'}
				<button
					class="btn btn-outline btn-block mt-4 tracking-[0.3em]"
					onclick={handleRelease}
					disabled={releasing}
				>
					{#if releasing}
						<span class="loading loading-spinner loading-sm"></span>
					{/if}
					{releasing ? en.common.loading : en.inventory.releaseButton}
				</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.card-back {
		min-height: 16rem;
		appearance: none;
		padding: 0;
		cursor: pointer;
	}
</style>
