<script lang="ts">
	import { resolve } from '$app/paths';
	import FakeoutCard from '../components/FakeoutCard.svelte';
	import { en } from '$lib/i18n/en';
	import { fakeoutSwipeState } from '../state.svelte';

	const state = $derived(fakeoutSwipeState.value);

	function fmtDate(value: number): string {
		return new Date(value).toLocaleString();
	}

	function fmtRemaining(ms: number): string {
		const total = Math.max(0, Math.floor(ms / 1000));
		const minutes = Math.floor(total / 60);
		const seconds = total % 60;
		return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
	}

	const cooldown = $derived.by(() => {
		const remaining = fakeoutSwipeState.cooldownRemainingMs;
		return remaining > 0 ? fmtRemaining(remaining) : null;
	});
</script>

<div class="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-6xl flex-col gap-6 px-4 py-6">
	<section class="flex flex-wrap items-center justify-between gap-2 border-2 border-base-content/20 bg-base-200/70 p-4">
		<div>
			<h2 class="text-sm font-bold uppercase tracking-[0.3em]">{en.experiments.fakeoutSwipe.collectionTitle}</h2>
			<div class="mt-2 text-xs uppercase tracking-widest opacity-60">
				{en.experiments.fakeoutSwipe.cardsKept}: {state.collection.length}
				· {en.experiments.fakeoutSwipe.fakesFellFor}: {state.fakeFalls.length}
			</div>
			{#if cooldown}
				<div class="mt-1 text-xs uppercase tracking-widest opacity-50">
					{en.experiments.fakeoutSwipe.cooldown} {cooldown}
				</div>
			{/if}
		</div>

		<a class="btn btn-neutral tracking-[0.2em]" href={resolve('/fakeout-swipe/deal')}>
			{en.experiments.fakeoutSwipe.backToDealButton}
		</a>
	</section>

	<section>
		<h3 class="mb-3 text-xs font-bold uppercase tracking-[0.3em] opacity-70">
			{en.experiments.fakeoutSwipe.collectionTitle}
		</h3>
		{#if state.collection.length === 0}
			<div class="border-2 border-dashed border-base-content/20 p-6 text-xs uppercase tracking-widest opacity-40">
				{en.experiments.fakeoutSwipe.collectionEmpty}
			</div>
		{:else}
			<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				{#each state.collection as entry (entry.cardId)}
					<div class="animate-fade-in space-y-3">
						<FakeoutCard article={entry.article} flippable={false} linkable={false} />
						<div class="border-2 border-base-content/20 bg-base-200/70 px-3 py-2 text-xs uppercase tracking-widest opacity-70">
							{fmtDate(entry.takenAt)}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<section>
		<h3 class="mb-3 text-xs font-bold uppercase tracking-[0.3em] opacity-70">
			{en.experiments.fakeoutSwipe.fakesTitle}
		</h3>
		{#if state.fakeFalls.length === 0}
			<div class="border-2 border-dashed border-base-content/20 p-6 text-xs uppercase tracking-widest opacity-40">
				{en.experiments.fakeoutSwipe.fakesEmpty}
			</div>
		{:else}
			<div class="grid gap-4 md:grid-cols-2">
				{#each state.fakeFalls as entry (entry.cardId)}
					<div class="animate-fade-in space-y-3">
						<FakeoutCard article={entry.article} flippable={false} linkable={false} />
						<div class="border-2 border-error bg-error/15 px-3 py-2 text-xs uppercase tracking-widest">
							{entry.fakeReason}
						</div>
						<div class="border-2 border-base-content/20 bg-base-200/70 px-3 py-2 text-xs uppercase tracking-widest opacity-70">
							{fmtDate(entry.takenAt)}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>
</div>