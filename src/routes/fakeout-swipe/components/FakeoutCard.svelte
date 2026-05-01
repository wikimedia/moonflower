<script lang="ts">
	import type { WikiArticle } from '$lib/types';
	import { en } from '$lib/i18n/en';
	import type { Snippet } from 'svelte';

	interface Props {
		article: WikiArticle;
		flippable?: boolean;
		linkable?: boolean;
		onRevealClick?: () => void;
		actions?: Snippet;
	}

	let { article, flippable = true, linkable = true, onRevealClick, actions }: Props = $props();

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
	];

	const placeholderPalette = ['#22d3ee', '#10b981', '#facc15', '#f97316', '#f43f5e', '#a78bfa'];

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

	const placeholderColor = $derived(
		placeholderPalette[hashForIndex(`${article.pageId}:${article.title}:color`) % placeholderPalette.length]
	);

	function handleRevealClick(event: MouseEvent) {
		if (onRevealClick) {
			if (linkable) {
				event.preventDefault();
			}
			onRevealClick();
			return;
		}

		if (linkable) {
			window.open(wikiUrl, '_blank', 'noopener,noreferrer');
		}
	}
</script>

<div class="gacha-card-container" class:is-flipped={isFlipped}>
	{#if !isFlipped}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="hover-3d" onclick={flip}>
			<div
				class="card gacha-card-shell card-back bg-neutral text-neutral-content flex w-full cursor-pointer items-center justify-center border-2 border-base-content/20"
			>
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
		{#if linkable}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				onclick={handleRevealClick}
				class={`hover-3d animate-fade-in block ${onRevealClick || linkable ? 'cursor-pointer' : ''}`}
			>
				<div class="card gacha-card-shell bg-base-200 border-2 border-base-content/20 overflow-hidden">
					{#if article.thumbnail}
						<figure class="relative h-44 overflow-hidden">
							<img src={article.thumbnail} alt={article.title} class="h-full w-full object-cover" />
							<div class="absolute inset-0 bg-gradient-to-t from-base-200 to-transparent"></div>
						</figure>
					{:else}
						<figure class="relative h-44 overflow-hidden bg-neutral/30">
							<div
								class="placeholder-symbol"
								style={`--placeholder-url: url('${placeholderImage}'); --placeholder-color: ${placeholderColor};`}
								aria-hidden="true"
							></div>
							<div class="absolute inset-0 bg-gradient-to-t from-base-200 to-transparent"></div>
						</figure>
					{/if}

					<div class="card-body gacha-card-body p-5">
						<h2
							class="card-title mb-1 border-b-2 border-base-content/20 pb-2 text-base font-bold uppercase tracking-widest"
						>
							{article.title}
						</h2>

						<div class="prose prose-sm max-w-none line-clamp-8">
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
			</div>
		{:else}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div onclick={handleRevealClick} class={`hover-3d animate-fade-in block ${onRevealClick ? 'cursor-pointer' : ''}`}>
				<div class="card gacha-card-shell bg-base-200 border-2 border-base-content/20 overflow-hidden">
					{#if article.thumbnail}
						<figure class="relative h-44 overflow-hidden">
							<img src={article.thumbnail} alt={article.title} class="h-full w-full object-cover" />
							<div class="absolute inset-0 bg-gradient-to-t from-base-200 to-transparent"></div>
						</figure>
					{:else}
						<figure class="relative h-44 overflow-hidden bg-neutral/30">
							<div
								class="placeholder-symbol"
								style={`--placeholder-url: url('${placeholderImage}'); --placeholder-color: ${placeholderColor};`}
								aria-hidden="true"
							></div>
							<div class="absolute inset-0 bg-gradient-to-t from-base-200 to-transparent"></div>
						</figure>
					{/if}

					<div class="card-body gacha-card-body p-5">
						<h2
							class="card-title mb-1 border-b-2 border-base-content/20 pb-2 text-base font-bold uppercase tracking-widest"
						>
							{article.title}
						</h2>

						<div class="prose prose-sm max-w-none line-clamp-8">
							<p>{article.extract}</p>
						</div>

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
			</div>
		{/if}
	{/if}
</div>

<style>
	.gacha-card-container {
		width: 100%;
		height: 34rem;
	}

	.gacha-card-container :global(.hover-3d) {
		width: 100%;
		height: 100%;
	}

	.gacha-card-shell {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.gacha-card-body {
		flex: 1;
		overflow: hidden;
	}

	.card-back {
		height: 100%;
		appearance: none;
		padding: 0;
	}

	.placeholder-symbol {
		position: absolute;
		inset: 0;
		margin: auto;
		width: 62%;
		height: 62%;
		background-color: var(--placeholder-color);
		opacity: 0.88;
		mask-image: var(--placeholder-url);
		mask-repeat: no-repeat;
		mask-position: center;
		mask-size: contain;
		-webkit-mask-image: var(--placeholder-url);
		-webkit-mask-repeat: no-repeat;
		-webkit-mask-position: center;
		-webkit-mask-size: contain;
	}
</style>