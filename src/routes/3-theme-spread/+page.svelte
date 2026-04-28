<script lang="ts">
	import { en } from '$lib/i18n/en';
	import type { ThemeI18n } from '../../../maryyann/3themeSpread/types';
	import { pickSlotLabels } from '../../../maryyann/3themeSpread/spread';
	import { toastStore } from '$lib/stores/toast.svelte';
	import type { WikiArticle } from '$lib/types';
	import SpreadCards from './components/SpreadCards.svelte';
	import { saveKeptIfNew } from './lib/collection';
	import { wikiArticleUrl } from './lib/wiki-url';

	type Phase = 'pull' | 'spread';
type ArticleKind = 'person' | 'location' | 'other';

	const t = en.experiments.threeThemeSpread;
	const spreadTheme = t.spreadTheme as unknown as ThemeI18n;

	const FLIP_STAGGER_MS = 420;
const PULL_BATCH = 20;
const MAX_PULL_ROUNDS = 5;

	let phase = $state<Phase>('pull');
	let pulling = $state(false);
	let articles = $state<WikiArticle[]>([]);
	let activeTheme = $state<ThemeI18n | null>(null);
	let slotLabels = $state<[string, string, string] | null>(null);
	let revealed = $state<[boolean, boolean, boolean]>([false, false, false]);
	let desktopFlipDone = $state(false);
	let mobilePickUnlocked = $state(false);
	let selectedPageId = $state<number | null>(null);
	let flipSeq = $state(0);
	let isDesktop = $state(false);
	let viewedIndex = $state(0);

function inferArticleKind(article: Pick<WikiArticle, 'title' | 'extract'>): ArticleKind {
	const title = article.title.toLowerCase();
	const extract = article.extract.toLowerCase();
	const text = `${title} ${extract}`;

	const personHints = [
		/\b(born|died|actor|actress|singer|musician|writer|poet|politician|scientist|philosopher|athlete|footballer|president|queen|king|bishop)\b/i,
		/\b(he|she|his|her)\b/i
	];
	if (personHints.some((re) => re.test(text)) || /\(\d{4}[–-]\d{0,4}\)/.test(article.title)) {
		return 'person';
	}

	const locationHints = [
		/\b(city|town|village|country|state|province|county|district|municipality|capital|island|river|lake|mountain|region|airport)\b/i,
		/\bis located in\b/i,
		/\bis a .* in\b/i
	];
	if (locationHints.some((re) => re.test(text))) {
		return 'location';
	}

	return 'other';
}

function pickMatchedTrio(pool: WikiArticle[]): [WikiArticle, WikiArticle, WikiArticle] | null {
	if (pool.length < 3) return null;
	const anchor = pool[0]!;
	const kind = inferArticleKind(anchor);
	const matches = pool.filter((a) => a.pageId !== anchor.pageId && inferArticleKind(a) === kind);
	if (matches.length < 2) return null;
	return [anchor, matches[0]!, matches[1]!];
}

	$effect(() => {
		if (typeof window === 'undefined') return;
		const mq = window.matchMedia('(min-width: 768px)');
		const sync = () => {
			isDesktop = mq.matches;
		};
		sync();
		mq.addEventListener('change', sync);
		return () => mq.removeEventListener('change', sync);
	});

	async function pull() {
		pulling = true;
		selectedPageId = null;
		desktopFlipDone = false;
		mobilePickUnlocked = false;
		try {
		const seen = new Set<number>();
		const pool: WikiArticle[] = [];
		let trio: [WikiArticle, WikiArticle, WikiArticle] | null = null;

		for (let round = 0; round < MAX_PULL_ROUNDS; round++) {
			const res = await fetch(`/api/pull?count=${PULL_BATCH}&sentences=3&requireImages=true`);
			if (!res.ok) throw new Error();
			const batch = (await res.json()) as WikiArticle[];
			for (const a of batch) {
				if (seen.has(a.pageId)) continue;
				seen.add(a.pageId);
				pool.push(a);
			}
			trio = pickMatchedTrio(pool);
			if (trio) break;
		}

		if (!trio) {
			toastStore.show(en.shared.emptyPull, 'info');
			return;
		}

		articles = trio;
			activeTheme = spreadTheme;
			slotLabels = pickSlotLabels(spreadTheme);
			phase = 'spread';
			flipSeq += 1;
		} catch {
			toastStore.show(en.errors.pullFailed, 'error');
		} finally {
			pulling = false;
		}
	}

	$effect(() => {
		const seq = flipSeq;
		if (phase !== 'spread' || !slotLabels || articles.length < 3) return;
		if (!isDesktop) {
			revealed = [false, false, false];
			desktopFlipDone = false;
			return;
		}

		/* First column shows the article face immediately; others stagger in. */
		revealed = [true, false, false];
		desktopFlipDone = false;

		const t1 = window.setTimeout(() => {
			if (seq !== flipSeq) return;
			revealed = [true, true, false];
		}, FLIP_STAGGER_MS);
		const t2 = window.setTimeout(() => {
			if (seq !== flipSeq) return;
			revealed = [true, true, true];
		}, FLIP_STAGGER_MS * 2);
		const t3 = window.setTimeout(() => {
			if (seq !== flipSeq) return;
			desktopFlipDone = true;
		}, FLIP_STAGGER_MS * 2 + 200);

		return () => {
			window.clearTimeout(t1);
			window.clearTimeout(t2);
			window.clearTimeout(t3);
		};
	});

	function resetPull() {
		phase = 'pull';
		articles = [];
		activeTheme = null;
		slotLabels = null;
		revealed = [false, false, false];
		desktopFlipDone = false;
		mobilePickUnlocked = false;
		selectedPageId = null;
	}

	function handleMobileFullyViewed() {
		mobilePickUnlocked = true;
	}

	function handleViewIndexChange(index: number) {
		viewedIndex = index;
	}

	function handlePick(pageId: number) {
		const canPick = isDesktop ? desktopFlipDone : mobilePickUnlocked;
		if (!canPick) return;
		const article = articles.find((a) => a.pageId === pageId);
		if (!article || !activeTheme || !slotLabels) return;
		selectedPageId = pageId;
		saveKeptIfNew(article);
		window.setTimeout(resetPull, 450);
	}

	async function shareSpread() {
		if (!activeTheme || !slotLabels || articles.length < 3) return;
		const labels = slotLabels;
		const body = [
			activeTheme.headline,
			'',
			...articles.map((a, i) => `${labels[i]}: ${a.title} (${wikiArticleUrl(a)})`),
			'',
			t.footerWikiLine
		].join('\n');

		const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
		try {
			if (typeof nav.share === 'function') {
				try {
					await nav.share({ title: t.name, text: body });
					toastStore.show(t.shareShared, 'info');
					return;
				} catch {
					/* cancelled or unsupported */
				}
			}
			await navigator.clipboard.writeText(body);
			toastStore.show(t.shareCopied, 'info');
		} catch {
			toastStore.show(t.shareFailed, 'error');
		}
	}

</script>

<div class="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-8">
	{#if phase === 'pull'}
		<div
			class="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center text-center"
		>
			<p class="mb-6 text-xs tracking-widest text-black uppercase">{t.pullPrompt}</p>
			<button
				type="button"
				onclick={pull}
				disabled={pulling}
				class="btn tracking-[0.3em] btn-lg btn-primary"
			>
				{#if pulling}
					<span class="loading loading-sm loading-dots"></span>
					{en.shared.pulling}
				{:else}
					{en.shared.pullButton}
				{/if}
			</button>
			<p class="mt-10 text-xs tracking-widest text-black uppercase">{en.shared.noPulls}</p>
		</div>
	{:else if activeTheme && slotLabels && articles.length === 3}
		<div class="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-6">
			<div class="w-full text-center">
				<p class="flex items-center justify-center gap-3 text-lg leading-tight font-bold tracking-widest text-black uppercase md:text-2xl md:leading-snug">
					<span class="relative inline-block" class:theme-word-active={viewedIndex === 0}>PAST</span>
					<span class="opacity-60">,</span>
					<span class="relative inline-block" class:theme-word-active={viewedIndex === 1}
						>PRESENT</span
					>
					<span class="opacity-60">,</span>
					<span class="relative inline-block" class:theme-word-active={viewedIndex === 2}
						>FUTURE</span
					>
				</p>
			</div>

			<div class="w-full">
				<SpreadCards
					{articles}
					{revealed}
					selectable={isDesktop ? desktopFlipDone : mobilePickUnlocked}
					{selectedPageId}
					cardBackLetter={t.cardBackLetter}
					keepButton={t.keepButton}
					onPick={handlePick}
					onMobileFullyViewed={handleMobileFullyViewed}
					onViewIndexChange={handleViewIndexChange}
				/>
			</div>

			<div class="mb-8 flex items-center gap-3">
				<button
					type="button"
					class="btn btn-primary btn-sm tracking-widest uppercase"
					onclick={shareSpread}>{t.shareButton}</button
				>
				<button
					type="button"
					class="btn btn-sm border-2 border-white/20 bg-black text-white tracking-widest uppercase hover:bg-black/90"
					onclick={resetPull}>{t.newPullButton}</button
				>
			</div>
		</div>
	{/if}

	<footer
		class="mt-auto border-t-2 border-base-content/10 pt-6 text-center text-[10px] tracking-widest text-black uppercase"
	>
		{t.attributionLead}
		<a
			href={t.wikipediaHomeUrl}
			class="link font-bold"
			target="_blank"
			rel="external noopener noreferrer"
		>
			{t.wikipediaLinkLabel}
		</a>
		{t.attributionTrail}
	</footer>
</div>

<style>
	.theme-word-active::after {
		content: '';
		position: absolute;
		left: -2px;
		right: -2px;
		bottom: -0.32em;
		height: 0.22em;
		background: #ffc500;
		border-radius: 9999px;
		transform: rotate(-1.8deg);
		opacity: 0.95;
	}
</style>
