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
			class="card-inner card-back flex w-full items-center justify-center border-2 border-white bg-black"
			onclick={flip}
			aria-label={en.gacha.revealHint}
		>
			<span class="select-none text-7xl font-bold text-white">{en.gacha.revealHint}</span>
		</button>
	{:else}
		<!-- Face-up: static content, no wrapping button -->
		<div class="card-front border-2 border-black bg-white p-5 animate-fade-in">
			<h2
				class="mb-3 border-b-2 border-black pb-2 text-base font-bold uppercase tracking-widest"
			>
				{card.title}
			</h2>

			<div class="prose prose-sm max-w-none text-black" class:line-clamp-6={!expanded}>
				<p>{card.extract}</p>
			</div>

			{#if card.extract && card.extract.length > 200}
				<button
					class="mt-2 text-xs font-bold uppercase tracking-widest opacity-50 hover:opacity-100"
					onclick={toggleExpand}
				>
					{expanded ? en.gacha.collapse : en.gacha.readMore}
				</button>
			{/if}

			{#if mode === 'pull' && !claimed}
				<button
					class="mt-4 w-full border-2 border-black bg-black py-3 font-bold tracking-[0.3em] text-white transition-colors hover:bg-white hover:text-black disabled:opacity-50"
					onclick={handleClaim}
					disabled={claiming}
				>
					{claiming ? en.common.loading : en.gacha.claimButton}
				</button>
			{:else if mode === 'pull' && claimed}
				<div
					class="mt-4 w-full border-2 border-black bg-white py-3 text-center font-bold tracking-[0.3em] text-black opacity-40"
				>
					{en.common.claimed}
				</div>
			{/if}

			{#if mode === 'inventory'}
				<button
					class="mt-4 w-full border-2 border-black bg-white py-3 font-bold tracking-[0.3em] text-black transition-colors hover:bg-black hover:text-white disabled:opacity-50"
					onclick={handleRelease}
					disabled={releasing}
				>
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
