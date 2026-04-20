<script lang="ts">
	import { en } from '$lib/i18n/en';
	import type { WikiArticle } from '$lib/types';
	import type { Snippet } from 'svelte';

	interface Props {
		article: WikiArticle;
		flippable?: boolean;
		actions?: Snippet;
	}

	let { article, flippable = false, actions }: Props = $props();

	let manuallyFlipped = $state(false);
	const isRevealed = $derived(!flippable || manuallyFlipped);

	const wikiUrl = $derived(
		`https://en.wikipedia.org/wiki/${encodeURIComponent(article.title.replace(/ /g, '_'))}`
	);

	const placeholderSymbols = [
		'https://upload.wikimedia.org/wikipedia/commons/5/52/%EA%9E%8BAyl%C3%B3%EA%9E%8Cchaxnim_symbol_%28fixed_width%29.svg',
		'https://upload.wikimedia.org/wikipedia/commons/8/8b/%CA%BBI%CA%BBiwi_symbol_%28fixed_width%29.svg',
		'https://upload.wikimedia.org/wikipedia/commons/d/d7/Aether_symbol.svg',
		'https://upload.wikimedia.org/wikipedia/commons/0/0c/Alexandra_symbol_%28fixed_width%29.svg',
		'https://upload.wikimedia.org/wikipedia/commons/8/8a/Ammonite_symbol_%28fixed_width%29.svg',
		'https://upload.wikimedia.org/wikipedia/commons/6/6e/916_America_symbol_%28fixed_width%29.svg',
		'https://upload.wikimedia.org/wikipedia/commons/e/ee/Argo_Navis_symbol_%28fixed_width%29.svg',
		'https://upload.wikimedia.org/wikipedia/commons/9/91/Aslog_symbol_%28fixed_width%29.svg',
		'https://upload.wikimedia.org/wikipedia/commons/0/0e/Atropos_symbol_%28fixed_width%29.svg'
	] as const;

	const placeholderPalette = [
		{
			glow: '#58d5ff',
			filter:
				'invert(69%) sepia(76%) saturate(2413%) hue-rotate(160deg) brightness(103%) contrast(104%)'
		},
		{
			glow: '#5ff1b3',
			filter:
				'invert(72%) sepia(43%) saturate(1216%) hue-rotate(103deg) brightness(103%) contrast(98%)'
		},
		{
			glow: '#ff74d6',
			filter:
				'invert(64%) sepia(62%) saturate(1455%) hue-rotate(277deg) brightness(101%) contrast(102%)'
		},
		{
			glow: '#ffd867',
			filter:
				'invert(84%) sepia(62%) saturate(809%) hue-rotate(341deg) brightness(103%) contrast(102%)'
		},
		{
			glow: '#ff8d5f',
			filter:
				'invert(66%) sepia(75%) saturate(1666%) hue-rotate(328deg) brightness(104%) contrast(103%)'
		},
		{
			glow: '#ac8cff',
			filter:
				'invert(66%) sepia(27%) saturate(1744%) hue-rotate(220deg) brightness(102%) contrast(102%)'
		}
	] as const;

	function hashForIndex(input: string): number {
		let out = 0;
		for (let i = 0; i < input.length; i++) {
			out = (out << 5) - out + input.charCodeAt(i);
			out |= 0;
		}
		return Math.abs(out);
	}

	const placeholderImage = $derived(
		placeholderSymbols[hashForIndex(`${article.pageId}:${article.title}`) % placeholderSymbols.length]
	);

	const placeholderTone = $derived(
		placeholderPalette[hashForIndex(`${article.pageId}:${article.title}:color`) % placeholderPalette.length]
	);

	function reveal() {
		if (flippable && !manuallyFlipped) {
			manuallyFlipped = true;
		}
	}
</script>

<div class="gacha-card-container" class:is-revealed={isRevealed}>
	{#if !isRevealed}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="hover-3d" onclick={reveal}>
			<div class="card card-back bg-neutral text-neutral-content flex w-full items-center justify-center border-2 border-base-content/20 cursor-pointer">
				<span class="select-none text-7xl font-bold">{en.shared.revealHint}</span>
			</div>
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
		<a href={wikiUrl} target="_blank" rel="noopener noreferrer" class="hover-3d animate-fade-in cursor-pointer block">
			<div class="card bg-base-200 border-2 border-base-content/20 overflow-hidden card-shell">
				{#if article.thumbnail}
					<figure class="relative h-44 overflow-hidden">
						<img src={article.thumbnail} alt={article.title} class="h-full w-full object-cover" />
						<div class="absolute inset-0 bg-gradient-to-t from-base-200 to-transparent"></div>
					</figure>
				{:else}
					<figure class="relative h-44 overflow-hidden bg-neutral/30">
						<div
							class="placeholder-symbol"
							style={`--placeholder-glow: ${placeholderTone.glow}; --placeholder-filter: ${placeholderTone.filter};`}
							aria-hidden="true"
						>
							<img src={placeholderImage} alt="" class="placeholder-image" />
						</div>
						<div class="absolute inset-0 bg-gradient-to-t from-base-200 to-transparent"></div>
					</figure>
				{/if}

				<div class="card-body p-5">
					<h2 class="card-title mb-1 border-b-2 border-base-content/20 pb-2 text-base font-bold uppercase tracking-widest">
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
	.gacha-card-container {
		width: 100%;
	}

	.card-shell {
		min-height: 100%;
	}

	.card-back {
		aspect-ratio: 1;
		min-height: 20rem;
		appearance: none;
		padding: 0;
	}

	.placeholder-symbol {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
	}

	.placeholder-image {
		width: 62%;
		height: 62%;
		opacity: 0.95;
		object-fit: contain;
		mix-blend-mode: screen;
		filter:
			var(--placeholder-filter)
			drop-shadow(0 0 0.4rem var(--placeholder-glow))
			drop-shadow(0 0 0.85rem var(--placeholder-glow));
	}
</style>
