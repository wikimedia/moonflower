<script lang="ts">
	import type { WikiArticle } from '$lib/types';
	import { en } from '$lib/i18n/en';
	import type { Snippet } from 'svelte';

	type ArticleLinkMode = 'wrapCard' | 'separate';

	interface Props {
		article: WikiArticle;
		flippable?: boolean;
		actions?: Snippet;
		/** When `separate`, the card is not wrapped in an anchor so `actions` can contain buttons; use the Wikipedia link below the card body. */
		articleLinkMode?: ArticleLinkMode;
		/** Label for the Wikipedia link when `articleLinkMode` is `separate`. */
		wikiLinkLabel?: string;
		/** Optional heading above the extract (e.g. “Interesting quote”). */
		extractLabel?: string;
		/** Tailwind height class for the thumbnail figure (default `h-44`). */
		figureClass?: string;
	}

	let {
		article,
		flippable = true,
		actions,
		articleLinkMode = 'wrapCard',
		wikiLinkLabel,
		extractLabel,
		figureClass = 'h-44'
	}: Props = $props();

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
				class="card-back card flex w-full cursor-pointer items-center justify-center border-2 border-base-content/20 bg-neutral text-neutral-content"
			>
				<span class="text-7xl font-bold select-none">{en.shared.revealHint}</span>
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
	{:else if articleLinkMode === 'wrapCard'}
		<!-- Revealed card — whole card links to Wikipedia article -->
		<a
			href={wikiUrl}
			target="_blank"
			rel="noopener noreferrer"
			class="hover-3d block animate-fade-in cursor-pointer"
		>
			<div class="card overflow-hidden border-2 border-base-content/20 bg-base-200">
				{#if article.thumbnail}
					<figure class="relative overflow-hidden {figureClass}">
						<img src={article.thumbnail} alt={article.title} class="h-full w-full object-cover" />
						<div class="absolute inset-0 bg-gradient-to-t from-base-200 to-transparent"></div>
					</figure>
				{/if}

				<div class="card-body p-5">
					<h2
						class="mb-1 card-title border-b-2 border-base-content/20 pb-2 text-base font-bold tracking-widest uppercase"
					>
						{article.title}
					</h2>

					{#if extractLabel}
						<p class="mb-1 text-[10px] font-bold tracking-[0.25em] uppercase opacity-50">
							{extractLabel}
						</p>
					{/if}
					<div class="prose prose-sm line-clamp-4 max-w-none">
						<p>{article.extract}</p>
					</div>

					<span class="mt-2 text-xs font-bold tracking-widest uppercase opacity-30">
						{en.shared.readMore}
					</span>

					{#if actions}
						<div class="mt-4 card-actions">
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
	{:else}
		<!-- Revealed card — no wrapping anchor (for action buttons); Wikipedia link is separate -->
		<div class="hover-3d block animate-fade-in">
			<div class="card overflow-hidden border-2 border-base-content/20 bg-base-200">
				{#if article.thumbnail}
					<figure class="relative overflow-hidden {figureClass}">
						<img src={article.thumbnail} alt={article.title} class="h-full w-full object-cover" />
						<div class="absolute inset-0 bg-gradient-to-t from-base-200 to-transparent"></div>
					</figure>
				{/if}

				<div class="card-body p-5">
					<h2
						class="mb-1 card-title border-b-2 border-base-content/20 pb-2 text-base font-bold tracking-widest uppercase"
					>
						{article.title}
					</h2>

					{#if extractLabel}
						<p class="mb-1 text-[10px] font-bold tracking-[0.25em] uppercase opacity-50">
							{extractLabel}
						</p>
					{/if}
					<div class="prose prose-sm line-clamp-4 max-w-none">
						<p>{article.extract}</p>
					</div>

					{#if actions}
						<div class="mt-4 card-actions">
							{@render actions()}
						</div>
					{/if}

					<button
						type="button"
						class="btn mt-4 w-full border-2 border-base-content/20 font-bold tracking-widest uppercase btn-outline btn-sm"
						onclick={() => window.open(wikiUrl, '_blank', 'noopener,noreferrer')}
					>
						{wikiLinkLabel ?? en.shared.readMore}
					</button>
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
		</div>
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
