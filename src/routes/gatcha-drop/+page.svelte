<script lang="ts">
	import { en } from '$lib/i18n/en';
	import { toastStore } from '$lib/stores/toast.svelte';
	import type { WikiArticle } from '$lib/types';
	import type { DropArticle } from '../../../maryyann/gatcha-drop/types';
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

	const simulationsRunning = $derived(phase === 'playing' && outcome == null);
	const inputEnabled = $derived(phase === 'playing' && peekArticle == null && outcome == null);
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
		wikiArticles = [];
		dropArticles = [];
		collected = [];
		outcome = null;
		phase = 'pull';
		try {
			const res = await fetch('/api/pull?count=20&sentences=3');
			if (!res.ok) throw new Error();
			const data = (await res.json()) as WikiArticle[];
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

	function collectPeek() {
		if (!peekArticle) return;
		const id = peekArticle.pageId;
		if (collectedSet.has(id) || collected.length >= COLLECT_TARGET) return;
		collected = [...collected, id];
		peekArticle = null;
	}

	function newPull() {
		phase = 'pull';
		wikiArticles = [];
		dropArticles = [];
		collected = [];
		peekArticle = null;
		outcome = null;
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
</script>

<div class="relative flex min-h-0 flex-1 flex-col bg-base-200">
	{#if phase === 'pull' && !pulling && wikiArticles.length === 0}
		<div class="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-8">
			<p class="max-w-md text-center text-xs tracking-widest uppercase opacity-50">
				{t.pullPrompt}
			</p>
			<button
				type="button"
				class="btn border-2 border-base-content/20 text-lg tracking-[0.3em] btn-lg btn-primary"
				onclick={pull}
				disabled={pulling}
			>
				{en.shared.pullButton}
			</button>
		</div>
	{:else if pulling && wikiArticles.length === 0}
		<PullLoading message={t.pullLoadingMessage} />
	{:else}
		<div class="relative flex min-h-0 flex-1 flex-col">
			<p
				class="border-b-2 border-base-content/10 bg-base-200 px-3 py-2 text-xs font-bold tracking-widest uppercase"
			>
				{t.collectedProgress(collected.length)}
			</p>
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
		{#if phase === 'ended' && outcome === 'win'}
			<div
				class="absolute inset-0 z-40 flex items-center justify-center bg-neutral/85 p-4"
				role="dialog"
				aria-modal="true"
				aria-labelledby="gatcha-drop-result-title"
			>
				<div class="max-w-md border-2 border-base-content/20 bg-base-200 p-6 shadow-none">
					<h2
						id="gatcha-drop-result-title"
						class="mb-3 text-sm font-bold tracking-[0.3em] uppercase"
					>
						{t.winTitle}
					</h2>
					<p class="mb-6 text-sm leading-relaxed opacity-80">
						{t.winBody}
					</p>
					<button
						type="button"
						class="btn w-full border-2 border-base-content/20 font-bold tracking-widest uppercase btn-primary"
						onclick={newPull}
					>
						{t.newPullButton}
					</button>
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
	wikiLinkLabel={t.wikiLinkLabel}
	closeLabel={t.closeCardAriaLabel}
/>
