<script lang="ts">
	import { en } from '$lib/i18n/en';
	import type { ThemeI18n } from '../../../maryyann/3themeSpread/types';
	import { pickSlotLabels, buildSlotLines } from '../../../maryyann/3themeSpread/spread';
	import { toastStore } from '$lib/stores/toast.svelte';
	import type { WikiArticle } from '$lib/types';
	import SpreadCards from './components/SpreadCards.svelte';
	import { saveKeptIfNew } from './lib/collection';
	import { wikiArticleUrl } from './lib/wiki-url';

	type Phase = 'pull' | 'spread';

	const t = en.experiments.threeThemeSpread;
	const spreadTheme = t.spreadTheme as unknown as ThemeI18n;

	const FLIP_STAGGER_MS = 420;
	const INITIAL_FLIP_DELAY_MS = 120;

	let phase = $state<Phase>('pull');
	let pulling = $state(false);
	let articles = $state<WikiArticle[]>([]);
	let activeTheme = $state<ThemeI18n | null>(null);
	let slotLabels = $state<[string, string, string] | null>(null);
	let slotLines = $state<[string, string, string] | null>(null);
	let revealed = $state<[boolean, boolean, boolean]>([false, false, false]);
	let desktopFlipDone = $state(false);
	let mobilePickUnlocked = $state(false);
	let selectedPageId = $state<number | null>(null);
	let flipSeq = $state(0);
	let isDesktop = $state(false);

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
			const res = await fetch('/api/pull?count=3&sentences=3');
			if (!res.ok) throw new Error();
			const data = (await res.json()) as WikiArticle[];
			if (data.length < 3) {
				toastStore.show(en.shared.emptyPull, 'info');
				return;
			}
			articles = data.slice(0, 3);
			activeTheme = spreadTheme;
			slotLabels = pickSlotLabels(spreadTheme);
			slotLines = buildSlotLines(spreadTheme, articles);
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
		if (phase !== 'spread' || !slotLines || !slotLabels || articles.length < 3) return;
		if (!isDesktop) {
			revealed = [false, false, false];
			desktopFlipDone = false;
			return;
		}

		revealed = [false, false, false];
		desktopFlipDone = false;

		const t0 = window.setTimeout(() => {
			if (seq !== flipSeq) return;
			revealed = [true, false, false];
		}, INITIAL_FLIP_DELAY_MS);
		const t1 = window.setTimeout(() => {
			if (seq !== flipSeq) return;
			revealed = [true, true, false];
		}, INITIAL_FLIP_DELAY_MS + FLIP_STAGGER_MS);
		const t2 = window.setTimeout(
			() => {
				if (seq !== flipSeq) return;
				revealed = [true, true, true];
			},
			INITIAL_FLIP_DELAY_MS + FLIP_STAGGER_MS * 2
		);
		const t3 = window.setTimeout(
			() => {
				if (seq !== flipSeq) return;
				desktopFlipDone = true;
			},
			INITIAL_FLIP_DELAY_MS + FLIP_STAGGER_MS * 2 + 200
		);

		return () => {
			window.clearTimeout(t0);
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
		slotLines = null;
		revealed = [false, false, false];
		desktopFlipDone = false;
		mobilePickUnlocked = false;
		selectedPageId = null;
	}

	function handleMobileFullyViewed() {
		mobilePickUnlocked = true;
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

	const pickHint = $derived(
		isDesktop
			? desktopFlipDone
				? t.spreadSelect
				: t.spreadWaiting
			: mobilePickUnlocked
				? t.spreadSelect
				: t.mobileSwipeHint
	);
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
	{:else if activeTheme && slotLabels && slotLines && articles.length === 3}
		<div class="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-6">
			<div class="w-full text-center">
				<p
					class="text-lg leading-tight font-bold tracking-widest text-black uppercase md:text-2xl md:leading-snug"
				>
					{activeTheme.headline}
				</p>
				<p class="mt-3 text-xs tracking-widest text-black uppercase">
					{pickHint}
				</p>
				<button
					type="button"
					class="btn mt-4 tracking-widest uppercase btn-ghost btn-sm"
					onclick={shareSpread}>{t.shareButton}</button
				>
			</div>

			<SpreadCards
				{articles}
				lines={slotLines}
				labels={slotLabels}
				{revealed}
				selectable={isDesktop ? desktopFlipDone : mobilePickUnlocked}
				{selectedPageId}
				cardBackLetter={t.cardBackLetter}
				keepButton={t.keepButton}
				openArticleButton={t.openArticleButton}
				onPick={handlePick}
				onMobileFullyViewed={handleMobileFullyViewed}
			/>

			<button
				type="button"
				class="btn mb-8 tracking-widest uppercase btn-outline btn-sm"
				onclick={resetPull}>{t.newPullButton}</button
			>
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
