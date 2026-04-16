<script lang="ts">
	import type { WikiArticle } from '$lib/types';
	import { en } from '$lib/i18n/en';
	import type { Snippet } from 'svelte';

	interface Props {
		article: WikiArticle;
		flippable?: boolean;
		actions?: Snippet;
	}

	let { article, flippable = true, actions }: Props = $props();

	let manualFlip = $state(false);
	let isFlipped = $derived(!flippable || manualFlip);

	function flip() {
		if (flippable && !manualFlip) {
			manualFlip = true;
		}
	}

	const wikiUrl = $derived(
		`https://en.wikipedia.org/wiki/${encodeURIComponent(article.title.replace(/ /g, '_'))}`
	);
</script>

<div class="gacha-card-container" class:is-flipped={isFlipped}>
	{#if !isFlipped}
		<!-- Face-down card with hover-3d effect -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="hover-3d" onclick={flip}>
			<div
				class="card card-back bg-neutral text-neutral-content flex w-full items-center justify-center border-2 border-base-content/20 cursor-pointer"
			>
				<span class="select-none text-7xl font-bold">{en.shared.revealHint}</span>
			</div>
			<!-- 8 empty divs needed for the hover-3d effect -->
			<div></div>
			<div></div>
			<div></div>
			<div></div>
			<div></div>
			<div></div>
			<div></div>
			<div></div>
		</div>
	{:else}
		<!-- Revealed card — whole card links to Wikipedia article -->
		<a href={wikiUrl} target="_blank" rel="noopener noreferrer" class="hover-3d animate-fade-in cursor-pointer block">
			<div class="card bg-base-200 border-2 border-base-content/20 overflow-hidden">
				{#if article.thumbnail}
					<figure class="relative h-44 overflow-hidden">
						<img
							src={article.thumbnail}
							alt={article.title}
							class="h-full w-full object-cover"
						/>
						<div class="absolute inset-0 bg-gradient-to-t from-base-200 to-transparent"></div>
					</figure>
				{/if}

				<div class="card-body p-5">
					<h2
						class="card-title mb-1 border-b-2 border-base-content/20 pb-2 text-base font-bold uppercase tracking-widest"
					>
						{article.title}
					</h2>

					<div class="prose prose-sm max-w-none line-clamp-4">
						<p>{article.extract}</p>
					</div>

					<span class="mt-2 text-xs font-bold uppercase tracking-widest opacity-30">
						{en.shared.readMore}
					</span>

					{#if actions}
						<div class="card-actions mt-4">
							{@render actions()}
						</div>
					{/if}
				</div>
			</div>
			<!-- 8 empty divs needed for the hover-3d effect -->
			<div></div>
			<div></div>
			<div></div>
			<div></div>
			<div></div>
			<div></div>
			<div></div>
			<div></div>
		</a>
	{/if}
</div>

<style>
	.card-back {
		aspect-ratio: 1;
		min-height: 20rem;
		appearance: none;
		padding: 0;
	}
</style>
