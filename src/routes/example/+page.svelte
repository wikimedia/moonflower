<script lang="ts">
	import { en } from '$lib/i18n/en';
	import { toastStore } from '$lib/stores/toast.svelte';
	import GachaCard from '$lib/components/GachaCard.svelte';
	import type { WikiArticle } from '$lib/types';

	let articles = $state<WikiArticle[]>([]);
	let pulling = $state(false);
	let hasPulled = $state(false);

	async function pull() {
		pulling = true;
		articles = [];
		hasPulled = true;
		try {
			const res = await fetch('/api/pull?count=5&sentences=3');
			if (!res.ok) throw new Error();
			articles = await res.json();
			if (articles.length === 0) {
				toastStore.show(en.shared.emptyPull, 'info');
			}
		} catch {
			toastStore.show(en.errors.pullFailed, 'error');
		} finally {
			pulling = false;
		}
	}
</script>

<div class="flex min-h-[calc(100dvh-3.5rem)] flex-col items-center px-4 py-8">
	{#if !hasPulled || articles.length === 0}
		<div class="flex flex-1 flex-col items-center justify-center">
			<p class="mb-6 text-xs uppercase tracking-widest opacity-30">
				{en.experiments.example.pullPrompt}
			</p>
			<button
				onclick={pull}
				disabled={pulling}
				class="btn btn-primary btn-lg text-lg tracking-[0.3em]"
			>
				{#if pulling}
					<span class="loading loading-dots loading-sm"></span>
					{en.shared.pulling}
				{:else}
					{en.shared.pullButton}
				{/if}
			</button>

			{#if !hasPulled}
				<p class="mt-8 text-xs uppercase tracking-widest opacity-30">{en.shared.noPulls}</p>
			{/if}
		</div>
	{:else}
		<div class="mb-8 w-full max-w-sm mx-auto space-y-6">
			{#each articles as article, i (article.pageId)}
				<div
					class="card-stagger opacity-0 animate-stagger-in"
					style="animation-delay: {i * 80}ms"
				>
					<GachaCard {article} />
				</div>
			{/each}
		</div>

		<button
			onclick={pull}
			disabled={pulling}
			class="btn btn-primary mb-20 tracking-[0.3em]"
		>
			{#if pulling}
				<span class="loading loading-dots loading-sm"></span>
				{en.shared.pulling}
			{:else}
				{en.shared.pullButton}
			{/if}
		</button>
	{/if}
</div>
