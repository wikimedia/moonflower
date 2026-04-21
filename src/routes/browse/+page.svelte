<script lang="ts">
	import { onMount } from 'svelte';
	import { en } from '$lib/i18n/en';
	import type { WikiArticle } from '$lib/types';
	import GachaCard from '$lib/components/GachaCard.svelte';
	import {
		fetchArticleByTitle,
		fetchRandomTitle,
		shouldTriggerEncounter,
		getCatchRate,
		type BrowseArticle
	} from './lib/browse-api';

	const t = en.experiments.browse;

	type View = 'browsing' | 'inventory';

	let view = $state<View>('browsing');
	let loading = $state(true);
	let errorMsg = $state('');
	let currentArticle = $state<BrowseArticle | null>(null);
	let pagesVisited = $state(0);
	let articleHistory = $state<string[]>([]);

	// Encounter state
	let encounterActive = $state(false);
	let encounterArticle = $state<WikiArticle | null>(null);
	let encounterPhase = $state<'rustling' | 'reveal' | 'caught' | 'duplicate'>('rustling');
	let catchRate = $derived(getCatchRate(pagesVisited));

	// Inventory
	let inventory = $state<WikiArticle[]>([]);
	let viewingCapturedCard = $state<WikiArticle | null>(null);

	let articleContainer = $state<HTMLDivElement | null>(null);

	function articleToWiki(article: BrowseArticle): WikiArticle {
		return {
			pageId: article.pageId,
			title: article.title,
			extract: article.extract,
			thumbnail: article.thumbnail
		};
	}

	function wikiUrl(title: string): string {
		return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
	}

	async function loadArticle(title: string): Promise<void> {
		loading = true;
		errorMsg = '';
		encounterActive = false;
		viewingCapturedCard = null;

		try {
			const article = await fetchArticleByTitle(title);
			currentArticle = article;
			pagesVisited += 1;
			articleHistory = [...articleHistory, article.title];

			// Scroll to top
			if (articleContainer) {
				articleContainer.scrollTop = 0;
			}

			// Check for encounter after navigating (not on the very first load)
			if (pagesVisited > 1 && shouldTriggerEncounter(pagesVisited)) {
				triggerEncounter(article);
			}
		} catch {
			errorMsg = t.errorFetch;
			currentArticle = null;
		} finally {
			loading = false;
		}
	}

	async function loadRandom(): Promise<void> {
		loading = true;
		errorMsg = '';
		try {
			const title = await fetchRandomTitle();
			await loadArticle(title);
		} catch {
			errorMsg = t.errorFetch;
			loading = false;
		}
	}

	function triggerEncounter(article: BrowseArticle): void {
		const wikiArticle = articleToWiki(article);
		encounterArticle = wikiArticle;

		const isDuplicate = inventory.some((inv) => inv.pageId === wikiArticle.pageId);
		encounterPhase = 'rustling';
		encounterActive = true;

		// Show rustling animation, then reveal
		setTimeout(() => {
			if (isDuplicate) {
				encounterPhase = 'duplicate';
			} else {
				encounterPhase = 'reveal';
			}
		}, 1200);
	}

	function catchArticle(): void {
		if (!encounterArticle) return;
		if (!inventory.some((inv) => inv.pageId === encounterArticle!.pageId)) {
			inventory = [...inventory, encounterArticle];
		}
		encounterPhase = 'caught';
	}

	function dismissEncounter(): void {
		encounterActive = false;
		encounterArticle = null;
	}

	function handleArticleClick(event: MouseEvent): void {
		const target = event.target as HTMLElement;
		const anchor = target.closest('a');
		if (!anchor) return;

		const href = anchor.getAttribute('href');
		if (!href) return;

		// Only intercept internal wiki links
		if (href.startsWith('/wiki/')) {
			event.preventDefault();
			event.stopPropagation();

			const rawTitle = decodeURIComponent(href.replace('/wiki/', '')).replace(/_/g, ' ');

			// Skip special pages, files, categories, etc.
			if (
				rawTitle.includes(':') &&
				!rawTitle.startsWith('The ') &&
				!rawTitle.startsWith('A ')
			) {
				window.open(`https://en.wikipedia.org${href}`, '_blank', 'noopener,noreferrer');
				return;
			}

			void loadArticle(rawTitle);
		} else if (href.startsWith('#')) {
			// Allow anchor jumps within the page
			return;
		} else if (href.startsWith('http')) {
			// External links open in a new tab
			event.preventDefault();
			window.open(href, '_blank', 'noopener,noreferrer');
		}
	}

	onMount(() => {
		void loadRandom();
	});
</script>

<!-- Encounter overlay -->
{#if encounterActive && encounterArticle}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="encounter-overlay" onclick={dismissEncounter}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="encounter-modal" onclick={(e) => { if (encounterPhase === 'rustling' || encounterPhase === 'reveal') e.stopPropagation(); }}>
			{#if encounterPhase === 'rustling'}
				<div class="rustling-container">
					<div class="grass-icon">🌿</div>
					<p class="rustling-text">{t.grassRustling}</p>
				</div>
			{:else if encounterPhase === 'duplicate'}
				<div class="flex flex-col items-center gap-4">
					<p class="text-sm font-bold tracking-widest uppercase">{t.duplicateEncounter}</p>
					<p class="text-xs tracking-wide opacity-60">{t.alreadyCaptured}</p>
					<button
						type="button"
						class="btn w-full border-2 border-base-content/20 tracking-widest uppercase btn-outline btn-sm"
						onclick={dismissEncounter}
					>
						{t.captureDismiss}
					</button>
				</div>
			{:else if encounterPhase === 'reveal'}
				<div class="flex flex-col items-center gap-4">
					<div class="encounter-header">
						<p class="encounter-title">
							{t.encounterFlavorPrefix}
							<span class="encounter-article-name">{encounterArticle.title}</span>
							{t.encounterFlavorSuffix}
						</p>
					</div>
					<div class="encounter-card-preview">
						{#if encounterArticle.thumbnail}
							<img
								src={encounterArticle.thumbnail}
								alt={encounterArticle.title}
								class="encounter-thumbnail"
							/>
						{/if}
						<div class="encounter-info">
							<h3 class="text-sm font-bold tracking-widest uppercase">
								{encounterArticle.title}
							</h3>
							<p class="mt-1 line-clamp-3 text-xs opacity-70">
								{encounterArticle.extract}
							</p>
						</div>
					</div>
					<div class="flex items-center gap-2 text-[10px] tracking-widest uppercase opacity-50">
						<span>{t.captureChance}:</span>
						<span class="font-bold">{catchRate}%</span>
					</div>
					<div class="flex w-full flex-col gap-2 sm:flex-row">
						<button
							type="button"
							class="btn flex-1 border-2 border-green-500/40 font-bold tracking-widest uppercase text-green-400 btn-outline btn-sm hover:bg-green-500/20"
							onclick={catchArticle}
						>
							{t.captureKeep}
						</button>
						<button
							type="button"
							class="btn flex-1 border-2 border-base-content/20 tracking-widest uppercase btn-outline btn-sm"
							onclick={dismissEncounter}
						>
							{t.captureDismiss}
						</button>
					</div>
				</div>
			{:else if encounterPhase === 'caught'}
				<div class="flex flex-col items-center gap-4">
					<div class="catch-success-flash">
						<p class="text-lg font-bold tracking-widest uppercase text-green-400">
							{t.catchSuccess}
						</p>
					</div>
					<div class="w-full max-w-xs">
						<GachaCard
							article={encounterArticle}
							flippable={false}
							articleLinkMode="separate"
							figureClass="h-28"
						/>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- Viewing a captured card from inventory -->
{#if viewingCapturedCard}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="encounter-overlay" onclick={() => (viewingCapturedCard = null)}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="encounter-modal" onclick={(e) => e.stopPropagation()}>
			<div class="w-full max-w-xs">
				<GachaCard
					article={viewingCapturedCard}
					flippable={false}
					articleLinkMode="separate"
					figureClass="h-28"
				/>
			</div>
			<button
				type="button"
				class="btn mt-4 w-full border-2 border-base-content/20 tracking-widest uppercase btn-outline btn-sm"
				onclick={() => (viewingCapturedCard = null)}
			>
				{t.inventoryClose}
			</button>
		</div>
	</div>
{/if}

<div class="flex min-h-0 flex-1 flex-col overflow-hidden">
	<!-- Top bar with stats and inventory toggle -->
	<div class="flex items-center justify-between border-b-2 border-base-content/20 bg-base-100 px-4 py-2">
		<div class="flex items-center gap-4">
			<span class="text-[10px] font-bold tracking-widest uppercase opacity-50">
				{t.pagesVisited}: {pagesVisited}
			</span>
			<span class="text-[10px] font-bold tracking-widest uppercase opacity-50">
				{t.captureChance}: {catchRate}%
			</span>
		</div>
		<button
			type="button"
			class="btn border-2 border-base-content/20 tracking-widest uppercase btn-outline btn-xs"
			onclick={() => (view = view === 'inventory' ? 'browsing' : 'inventory')}
		>
			{#if view === 'inventory'}
				{t.inventoryClose}
			{:else}
				{t.inventoryButton} ({t.inventoryCount(inventory.length)})
			{/if}
		</button>
	</div>

	{#if view === 'inventory'}
		<!-- Inventory view -->
		<div class="flex-1 overflow-y-auto bg-base-200 p-4">
			<div class="mx-auto max-w-4xl">
				<h2 class="mb-4 text-sm font-bold tracking-widest uppercase">{t.inventoryTitle}</h2>
				{#if inventory.length === 0}
					<div class="border-2 border-base-content/20 bg-base-100 p-6 text-center">
						<p class="text-xs tracking-wide opacity-60">{t.inventoryEmpty}</p>
					</div>
				{:else}
					<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{#each inventory as item (item.pageId)}
							<div class="inventory-card animate-fade-in">
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div
									class="card cursor-pointer overflow-hidden border-2 border-base-content/20 bg-base-100 transition-all hover:border-green-500/40"
									onclick={() => (viewingCapturedCard = item)}
								>
									{#if item.thumbnail}
										<figure class="relative h-32 overflow-hidden">
											<img
												src={item.thumbnail}
												alt={item.title}
												class="h-full w-full object-cover"
											/>
											<div
												class="absolute inset-0 bg-gradient-to-t from-base-100 to-transparent"
											></div>
										</figure>
									{/if}
									<div class="card-body p-3">
										<h3
											class="card-title border-b-2 border-base-content/20 pb-1 text-xs font-bold tracking-widest uppercase"
										>
											{item.title}
										</h3>
										<p class="line-clamp-2 text-[11px] opacity-60">{item.extract}</p>
										<div class="mt-2 flex items-center justify-between">
											<span
												class="badge border-green-500/30 bg-green-500/10 text-[9px] font-bold tracking-widest uppercase text-green-400"
											>
												{t.capturedStamp}
											</span>
											<span class="text-[10px] tracking-widest uppercase opacity-40">
												{t.viewCaptured}
											</span>
										</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<!-- Browsing view -->
		<div
			class="wiki-reader flex-1 overflow-y-auto"
			bind:this={articleContainer}
		>
			{#if loading}
				<div class="flex h-full items-center justify-center p-8">
					<p class="animate-pulse text-sm font-bold tracking-widest uppercase opacity-60">
						{t.loading}
					</p>
				</div>
			{:else if errorMsg}
				<div class="flex flex-col items-center justify-center gap-4 p-8">
					<p class="text-sm tracking-wide text-error">{errorMsg}</p>
					<button
						type="button"
						class="btn border-2 border-base-content/20 tracking-widest uppercase btn-outline btn-sm"
						onclick={() => void loadRandom()}
					>
						{t.retryButton}
					</button>
				</div>
			{:else if currentArticle}
				<div class="wiki-article-wrapper">
					<div class="wiki-article-header">
						<h2 class="wiki-article-title">{currentArticle.title}</h2>
					</div>
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="wiki-article-body" onclick={handleArticleClick}>
						{@html currentArticle.htmlContent}
					</div>
					<div class="wiki-article-footer">
						<p class="text-[10px] tracking-widest uppercase opacity-30">
							{t.footerWikiLine}
						</p>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	/* Wikipedia article reader styles — dark brutalist theme */
	.wiki-reader {
		background: #0d0d0d;
	}

	.wiki-article-wrapper {
		max-width: 48rem;
		margin: 0 auto;
		padding: 0 1.25rem 3rem;
	}

	.wiki-article-header {
		padding: 1.5rem 0;
		border-bottom: 2px solid rgba(255, 255, 255, 0.1);
		margin-bottom: 1.5rem;
	}


	.wiki-article-title {
		font-size: 1.5rem;
		font-weight: 700;
		letter-spacing: 0.15em;
		text-transform: uppercase;
		color: #e0f7e0;
		line-height: 1.3;
	}

	.wiki-article-meta {
		margin-top: 0.5rem;
	}

	.wiki-article-body {
		color: #c8d6c8;
		font-size: 0.875rem;
		line-height: 1.75;
	}

	/* Style all Wikipedia content links */
	.wiki-article-body :global(a) {
		color: #4ade80;
		text-decoration: none;
		border-bottom: 1px solid rgba(74, 222, 128, 0.2);
		transition: border-color 0.15s ease, color 0.15s ease;
	}

	.wiki-article-body :global(a:hover) {
		color: #86efac;
		border-bottom-color: rgba(74, 222, 128, 0.6);
	}

	.wiki-article-body :global(h2) {
		font-size: 1.1rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #d4edda;
		margin: 2rem 0 0.75rem;
		padding-bottom: 0.5rem;
		border-bottom: 2px solid rgba(255, 255, 255, 0.1);
	}

	.wiki-article-body :global(h3) {
		font-size: 0.95rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #c8e6c8;
		margin: 1.5rem 0 0.5rem;
	}

	.wiki-article-body :global(h4),
	.wiki-article-body :global(h5),
	.wiki-article-body :global(h6) {
		font-size: 0.85rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		color: #a8cca8;
		margin: 1.25rem 0 0.4rem;
	}

	.wiki-article-body :global(p) {
		margin: 0.75rem 0;
	}

	.wiki-article-body :global(ul),
	.wiki-article-body :global(ol) {
		margin: 0.5rem 0;
		padding-left: 1.5rem;
	}

	.wiki-article-body :global(li) {
		margin: 0.25rem 0;
	}

	.wiki-article-body :global(blockquote) {
		border-left: 3px solid #4ade80;
		padding-left: 1rem;
		margin: 1rem 0;
		opacity: 0.85;
		font-style: italic;
	}

	.wiki-article-body :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin: 1rem 0;
		font-size: 0.8rem;
	}

	.wiki-article-body :global(th),
	.wiki-article-body :global(td) {
		border: 1px solid rgba(255, 255, 255, 0.1);
		padding: 0.4rem 0.6rem;
		text-align: left;
	}

	.wiki-article-body :global(th) {
		background: rgba(255, 255, 255, 0.05);
		font-weight: 700;
		font-size: 0.75rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #a8cca8;
	}

	.wiki-article-body :global(img) {
		max-width: 100%;
		height: auto;
		margin: 0.5rem 0;
		border: 2px solid rgba(255, 255, 255, 0.1);
	}

	.wiki-article-body :global(.thumb),
	.wiki-article-body :global(.tmulti) {
		margin: 1rem 0;
		max-width: 100%;
	}

	.wiki-article-body :global(.thumbinner) {
		max-width: 100% !important;
	}

	.wiki-article-body :global(.thumbcaption),
	.wiki-article-body :global(.gallerytext) {
		font-size: 0.75rem;
		opacity: 0.5;
		padding: 0.25rem 0;
		letter-spacing: 0.04em;
	}

	/* Hide Wikipedia chrome elements */
	.wiki-article-body :global(.mw-editsection),
	.wiki-article-body :global(.reference),
	.wiki-article-body :global(.reflist),
	.wiki-article-body :global(.navbox),
	.wiki-article-body :global(.sistersitebox),
	.wiki-article-body :global(.side-box),
	.wiki-article-body :global(.metadata),
	.wiki-article-body :global(.noprint),
	.wiki-article-body :global(.catlinks),
	.wiki-article-body :global(.mw-authority-control),
	.wiki-article-body :global(.external),
	.wiki-article-body :global(.mw-references-wrap) {
		display: none !important;
	}

	/* Infobox styling */
	.wiki-article-body :global(.infobox),
	.wiki-article-body :global(.sidebar) {
		width: 100% !important;
		float: none !important;
		margin: 1rem 0 !important;
		background: rgba(255, 255, 255, 0.03);
		border: 2px solid rgba(255, 255, 255, 0.1);
		font-size: 0.8rem;
	}

	.wiki-article-footer {
		margin-top: 3rem;
		padding-top: 1rem;
		border-top: 2px solid rgba(255, 255, 255, 0.1);
	}

	/* Encounter overlay */
	.encounter-overlay {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: flex;
		align-items: safe center;
		justify-content: center;
		overflow-y: auto;
		background: rgba(0, 0, 0, 0.85);
		backdrop-filter: blur(4px);
		animation: overlay-in 0.3s ease-out;
		padding: 1rem;
	}

	.encounter-modal {
		width: 100%;
		max-width: 24rem;
		max-height: 90dvh;
		overflow-y: auto;
		border: 2px solid rgba(255, 255, 255, 0.15);
		background: #111;
		padding: 1.5rem;
		animation: modal-in 0.4s ease-out;
		flex-shrink: 0;
	}

	/* Hide the Wikipedia link button inside modal cards — we're already browsing Wikipedia */
	.encounter-modal :global(.card-body > button:last-child) {
		display: none;
	}

	.rustling-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 2rem 0;
	}

	.grass-icon {
		font-size: 3rem;
		animation: grass-shake 0.3s ease-in-out infinite alternate;
	}

	.rustling-text {
		font-size: 0.875rem;
		font-weight: 700;
		letter-spacing: 0.15em;
		text-transform: uppercase;
		animation: text-pulse 0.8s ease-in-out infinite;
		color: #4ade80;
	}

	.encounter-header {
		text-align: center;
		padding-bottom: 0.75rem;
		border-bottom: 2px solid rgba(255, 255, 255, 0.1);
		margin-bottom: 0.75rem;
	}

	.encounter-title {
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.15em;
		text-transform: uppercase;
		color: #86efac;
	}

	.encounter-article-name {
		color: #fff;
		display: block;
		font-size: 1rem;
		margin: 0.25rem 0;
	}

	.encounter-card-preview {
		width: 100%;
		border: 2px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.03);
		overflow: hidden;
	}

	.encounter-thumbnail {
		width: 100%;
		height: 8rem;
		object-fit: cover;
	}

	.encounter-info {
		padding: 0.75rem;
	}

	.catch-success-flash {
		text-align: center;
		animation: catch-flash 0.6s ease-out;
	}

	@keyframes overlay-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes modal-in {
		from {
			opacity: 0;
			transform: scale(0.9) translateY(20px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	@keyframes grass-shake {
		from {
			transform: rotate(-8deg) scale(1);
		}
		to {
			transform: rotate(8deg) scale(1.1);
		}
	}

	@keyframes text-pulse {
		0%,
		100% {
			opacity: 0.4;
		}
		50% {
			opacity: 1;
		}
	}

	@keyframes catch-flash {
		0% {
			opacity: 0;
			transform: scale(1.5);
		}
		50% {
			opacity: 1;
			transform: scale(0.95);
		}
		100% {
			transform: scale(1);
		}
	}
</style>
