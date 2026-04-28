<script lang="ts">
	import { en } from '$lib/i18n/en';
	import { toastStore } from '$lib/stores/toast.svelte';
	import type { WikiArticle } from '$lib/types';
	import DesignCardFace from '../../../maryyann/designCard/DesignCardFace.svelte';

	const t = en.experiments.designCard;

	let article = $state<WikiArticle | null>(null);
	let pulling = $state(false);
	let hasPulled = $state(false);

	async function pull() {
		pulling = true;
		article = null;
		hasPulled = true;
		try {
			const res = await fetch(
				`/api/pull?count=1&sentences=1&requireImages=true`
			);
			if (!res.ok) throw new Error();
			const raw = (await res.json()) as WikiArticle[];
			const next = raw.find(
				(a) => typeof a.thumbnail === 'string' && a.thumbnail.length > 0
			);
			if (!next) {
				toastStore.show(en.shared.emptyPull, 'info');
				return;
			}
			article = next;
		} catch {
			toastStore.show(en.errors.pullFailed, 'error');
		} finally {
			pulling = false;
		}
	}
</script>

<div class="flex min-h-[calc(100dvh-3.5rem)] flex-col items-center px-4 py-8">
	{#if !hasPulled || !article}
		<div class="flex flex-1 flex-col items-center justify-center">
			<p class="mb-6 max-w-sm text-center text-xs uppercase tracking-widest opacity-40">
				{t.pullPrompt}
			</p>
			<button
				onclick={pull}
				disabled={pulling}
				class="btn btn-primary btn-lg text-lg tracking-[0.3em]"
			>
				{#if pulling}
					<span class="loading loading-dots loading-sm"></span>
					{t.pullingLabel}
				{:else}
					{t.pullButton}
				{/if}
			</button>

			{#if !hasPulled}
				<p class="mt-8 text-xs uppercase tracking-widest opacity-30">{t.idleHint}</p>
			{/if}
		</div>
	{:else}
		<div class="flex w-full max-w-xs flex-col items-center gap-8">
			<DesignCardFace {article} />

			<button
				onclick={pull}
				disabled={pulling}
				class="btn btn-neutral text-xs font-bold uppercase tracking-[0.25em]"
			>
				{#if pulling}
					<span class="loading loading-dots loading-sm"></span>
					{t.pullingLabel}
				{:else}
					{t.newCardButton}
				{/if}
			</button>
		</div>
	{/if}
</div>
