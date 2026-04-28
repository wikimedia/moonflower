<script lang="ts">
	import DesignCardFace from '../../../maryyann/designCard/DesignCardFace.svelte';
	import { en } from '$lib/i18n/en';
	import { toastStore } from '$lib/stores/toast.svelte';
	import type { WikiArticle } from '$lib/types';
	import type { DropArticle } from '../../../maryyann/gatcha-drop/types';
	import { wikiArticleUrl } from '../../../maryyann/designCard/wiki-url';
	import { COLLECT_TARGET } from '../../../maryyann/gatcha-drop/physics-config';
	import { measureDropArticle } from '../../../maryyann/gatcha-drop/spawn';
	import ArticlePeekModal from './components/ArticlePeekModal.svelte';
	import PhysicsStage from './components/PhysicsStage.svelte';
	import PullLoading from './components/PullLoading.svelte';

	const t = en.experiments.gatchaDrop;

	type Phase = 'pull' | 'playing' | 'ended';

	let phase = $state<Phase>('pull');
	let pulling = $state(false);
	let wikiArticles = $state<WikiArticle[]>([]);
	let dropArticles = $state<DropArticle[]>([]);
	let collected = $state<number[]>([]);
	let peekArticle = $state<WikiArticle | null>(null);
	let outcome = $state<'win' | null>(null);
	let resultShownAt = $state<number | null>(null);
	let countdownNow = $state(Date.now());
	let collectionPopupOpen = $state(false);

	const simulationsRunning = $derived(
		phase === 'playing' && outcome == null && peekArticle == null && !collectionPopupOpen
	);
	const inputEnabled = $derived(
		phase === 'playing' && peekArticle == null && outcome == null && !collectionPopupOpen
	);
	const collectedSet = $derived(new Set(collected));

	function articleFor(pageId: number): WikiArticle | undefined {
		return wikiArticles.find((a) => a.pageId === pageId);
	}

	function startRound() {
		outcome = null;
		phase = 'playing';
	}

	$effect(() => {
		if (phase !== 'playing' || outcome != null) return;
		if (collected.length >= COLLECT_TARGET) {
			peekArticle = null;
			outcome = 'win';
			phase = 'ended';
		}
	});

	async function pull() {
		pulling = true;
		peekArticle = null;
		collectionPopupOpen = false;
		wikiArticles = [];
		dropArticles = [];
		collected = [];
		outcome = null;
		phase = 'pull';
		try {
			const res = await fetch('/api/pull?count=20&sentences=3&requireImages=true');
			if (!res.ok) throw new Error();
			const raw = (await res.json()) as WikiArticle[];
			const data = raw.filter((a) => typeof a.thumbnail === 'string' && a.thumbnail.length > 0);
			if (data.length === 0) {
				toastStore.show(en.shared.emptyPull, 'info');
				return;
			}
			wikiArticles = data;
			const measured = await Promise.all(data.map((a) => measureDropArticle(a)));
			dropArticles = measured;
			startRound();
		} catch {
			toastStore.show(en.errors.pullFailed, 'error');
		} finally {
			pulling = false;
		}
	}

	function onTapArticle(pageId: number) {
		const a = articleFor(pageId);
		if (!a) return;
		peekArticle = a;
		// The browser may synthesize a click right after pointerup; by then the modal is on top and
		// that click can hit the Wikipedia link or Collect. Swallow the next click in capture phase.
		queueMicrotask(() => {
			const swallowSpuriousClick = (e: MouseEvent) => {
				e.preventDefault();
				e.stopImmediatePropagation();
			};
			document.addEventListener('click', swallowSpuriousClick, { capture: true, once: true });
		});
	}

	function closePeek() {
		peekArticle = null;
	}

	function openCollectionPopup() {
		if (phase !== 'playing' && phase !== 'ended') return;
		collectionPopupOpen = true;
	}

	function closeCollectionPopup() {
		collectionPopupOpen = false;
	}

	function collectPeek() {
		if (!peekArticle) return;
		const id = peekArticle.pageId;
		if (collectedSet.has(id) || collected.length >= COLLECT_TARGET) return;
		collected = [...collected, id];
		peekArticle = null;
	}

	function newPull() {
		if (newPullLocked) return;
		void pull();
	}

	const collectDisabled = $derived(
		peekArticle == null ||
			collected.includes(peekArticle.pageId) ||
			collected.length >= COLLECT_TARGET
	);

	const collectLabel = $derived(
		peekArticle != null && collected.includes(peekArticle.pageId)
			? t.collectedAlready
			: peekArticle != null && collected.length >= COLLECT_TARGET
				? t.collectFull
				: t.collectButton
	);

	const keptArticles = $derived(
		collected
			.map((id) => articleFor(id))
			.filter((article): article is WikiArticle => article != null)
	);

	const resultVisible = $derived(phase === 'ended' && outcome === 'win');
	const NEW_PULL_COOLDOWN_MS = 60_000;
	const canPullAgain = $derived(collected.length >= COLLECT_TARGET);

	$effect(() => {
		if (resultVisible) {
			collectionPopupOpen = true;
		}
	});

	$effect(() => {
		if (!resultVisible) {
			resultShownAt = null;
			return;
		}
		if (resultShownAt == null) {
			resultShownAt = Date.now();
		}
		const id = window.setInterval(() => {
			countdownNow = Date.now();
		}, 250);
		return () => window.clearInterval(id);
	});

	const newPullRemainingMs = $derived(
		resultShownAt == null ? 0 : Math.max(0, NEW_PULL_COOLDOWN_MS - (countdownNow - resultShownAt))
	);
	const newPullLocked = $derived(newPullRemainingMs > 0);
	const newPullRemainingSeconds = $derived(Math.ceil(newPullRemainingMs / 1000));
	const newPullCountdownLabel = $derived(
		newPullLocked
			? `${Math.floor(newPullRemainingSeconds / 60)
					.toString()
					.padStart(2, '0')}:${(newPullRemainingSeconds % 60).toString().padStart(2, '0')}`
			: 'READY'
	);
	const pullAgainLabel = $derived(
		canPullAgain ? t.newPullButton : t.collectToPullAgainButton
	);
</script>

<div class="relative flex min-h-0 flex-1 flex-col bg-base-200">
	{#if phase === 'pull' && !pulling && wikiArticles.length === 0}
		<div class="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-8">
			<p class="max-w-md text-center text-xs tracking-widest uppercase opacity-50">
				{t.pullPrompt}
			</p>
			<button
				type="button"
				class="btn gatcha-drop-pull-btn border-2 border-base-content/20 text-lg tracking-[0.3em] btn-lg btn-primary"
				onclick={pull}
				disabled={pulling}
			>
				{t.pullButton}
			</button>
		</div>
	{:else if pulling && wikiArticles.length === 0}
		<PullLoading message={t.pullLoadingMessage} />
	{:else}
		<div class="relative flex min-h-0 flex-1 flex-col">
			<button
				type="button"
				class="gatcha-drop-stars w-full border-b-2 border-base-content/10 bg-base-200 px-3 py-2 text-center text-xs font-bold tracking-widest uppercase"
				onclick={openCollectionPopup}
			>
				<span class="gatcha-drop-stars-label">Cards collected</span>
				<span class="gatcha-drop-stars-row">
					{#each Array.from({ length: COLLECT_TARGET }, (_, i) => i) as i}
						<span class={i < collected.length ? 'gatcha-drop-star-filled' : 'gatcha-drop-star-empty'}>
							{i < collected.length ? '★' : '☆'}
						</span>
					{/each}
				</span>
			</button>
			<PhysicsStage
				{dropArticles}
				{simulationsRunning}
				{inputEnabled}
				collectedPageIds={collected}
				{onTapArticle}
			/>
			<p
				class="pointer-events-none absolute bottom-0 left-0 right-0 z-10 border-t-2 border-base-content/20 bg-base-200/95 px-3 py-2 text-center text-[10px] tracking-widest uppercase opacity-40 backdrop-blur-sm"
			>
				{t.footerWikiLine}
			</p>
		</div>
		{#if collectionPopupOpen}
			<div
				class="absolute inset-0 z-40 flex items-start justify-center overflow-y-auto bg-neutral/85 p-4 sm:items-center"
				role="presentation"
				onclick={closeCollectionPopup}
			>
				<div
					class="relative my-2 w-full max-w-3xl border-2 border-base-content/20 bg-base-200 p-6 shadow-none sm:my-0"
					role="dialog"
					aria-modal="true"
					aria-labelledby="gatcha-drop-result-title"
					onclick={(e) => e.stopPropagation()}
				>
					<button
						type="button"
						class="btn btn-circle btn-ghost btn-sm absolute right-3 top-3 min-h-8 min-w-8 text-lg leading-none"
						aria-label={t.closeCardAriaLabel}
						onclick={closeCollectionPopup}
					>
						×
					</button>
					<h2
						id="gatcha-drop-result-title"
						class="mb-3 text-sm font-bold tracking-[0.3em] uppercase"
					>
						{t.winTitle}
					</h2>
					<div class="gatcha-drop-result-grid mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
						{#each keptArticles as article (article.pageId)}
							<a class="hidden md:block" href={wikiArticleUrl(article)} target="_blank" rel="noreferrer noopener">
								<div class="gatcha-drop-result-card-desktop border-2 border-base-content/20">
									<DesignCardFace article={article} />
								</div>
							</a>
							<a
								class="gatcha-drop-result-card block overflow-hidden border-2 border-base-content/20 md:hidden"
								href={wikiArticleUrl(article)}
								target="_blank"
								rel="noreferrer noopener"
							>
								<div class="gatcha-drop-result-card-image-wrap">
									{#if article.thumbnail}
										<img src={article.thumbnail} alt="" class="gatcha-drop-result-card-image" loading="lazy" />
									{/if}
								</div>
								<div class="gatcha-drop-result-card-title">{article.title}</div>
							</a>
						{/each}
						<button
							type="button"
							class="gatcha-drop-next-pull-card border-2 border-base-content/20"
							onclick={newPull}
							disabled={!canPullAgain || newPullLocked}
						>
							<div class="gatcha-drop-next-pull-top">
								{#if canPullAgain}
									<span class="gatcha-drop-next-pull-timer">{newPullCountdownLabel}</span>
								{/if}
							</div>
							<div class="gatcha-drop-next-pull-title-wrap">
								<span class="gatcha-drop-next-pull-title">{pullAgainLabel}</span>
							</div>
						</button>
					</div>
				</div>
			</div>
		{/if}
	{/if}
</div>

<ArticlePeekModal
	article={peekArticle}
	onClose={closePeek}
	onCollect={collectPeek}
	{collectDisabled}
	{collectLabel}
	leaveLabel={t.leaveButton}
	closeLabel={t.closeCardAriaLabel}
/>
