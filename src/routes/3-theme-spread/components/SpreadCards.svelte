<script lang="ts">
	import { en } from '$lib/i18n/en';
	import type { WikiArticle } from '$lib/types';
	import DesignCardFace from '../../../../maryyann/designCard/DesignCardFace.svelte';

	interface Props {
		articles: WikiArticle[];
		revealed: [boolean, boolean, boolean];
		selectable: boolean;
		selectedPageId: number | null;
		cardBackLetter: string;
		keepButton: string;
		onPick: (pageId: number) => void;
		onMobileFullyViewed?: () => void;
		onViewIndexChange?: (index: number) => void;
	}

	let {
		articles,
		revealed,
		selectable,
		selectedPageId,
		cardBackLetter,
		keepButton,
		onPick,
		onMobileFullyViewed,
		onViewIndexChange
	}: Props = $props();

	const t = en.experiments.threeThemeSpread;
	type SlotKey = 'past' | 'present' | 'future';
	const slotByIndex: [SlotKey, SlotKey, SlotKey] = ['past', 'present', 'future'];

	let isDesktop = $state(false);
	let activeIndex = $state(0);
	let desktopActiveIndex = $state(0);
	let mobileFaceUp = $state<[boolean, boolean, boolean]>([false, false, false]);
	let visited = $state<[boolean, boolean, boolean]>([false, false, false]);
	let mobileViewNotified = $state(false);
	let touchStartX = $state<number | null>(null);

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

	const packKey = $derived(articles.map((a) => a.pageId).join(','));

	$effect(() => {
		void packKey;
		activeIndex = 0;
		desktopActiveIndex = 0;
		mobileViewNotified = false;
		if (typeof window === 'undefined') return;
		const desktop = window.matchMedia('(min-width: 768px)').matches;
		if (desktop || articles.length !== 3) {
			mobileFaceUp = [false, false, false];
			visited = [false, false, false];
			return;
		}
		/* First card shows the article face immediately (no tap to flip). */
		mobileFaceUp = [true, false, false];
		visited = [true, false, false];
	});

	$effect(() => {
		if (isDesktop || !visited[0] || !visited[1] || !visited[2] || mobileViewNotified) return;
		mobileViewNotified = true;
		onMobileFullyViewed?.();
	});

	$effect(() => {
		onViewIndexChange?.(isDesktop ? desktopActiveIndex : activeIndex);
	});


	function goToMobileIndex(next: number) {
		if (next < 0 || next > 2 || next === activeIndex) return;
		mobileFaceUp = [false, false, false];
		activeIndex = next;
		window.setTimeout(() => {
			mobileFaceUp = [next === 0, next === 1, next === 2];
			visited = visited.map((v, i) => (i === next ? true : v)) as [boolean, boolean, boolean];
		}, 120);
	}

	function cycleMobileIndex() {
		const next = (activeIndex + 1) % 3;
		mobileFaceUp = [false, false, false];
		activeIndex = next;
		window.setTimeout(() => {
			mobileFaceUp = [next === 0, next === 1, next === 2];
			visited = visited.map((v, i) => (i === next ? true : v)) as [boolean, boolean, boolean];
		}, 120);
	}

	function goNext() {
		goToMobileIndex(activeIndex >= 2 ? 0 : activeIndex + 1);
	}

	function goPrev() {
		goToMobileIndex(activeIndex <= 0 ? 2 : activeIndex - 1);
	}

	function cycleDesktopIndex() {
		desktopActiveIndex = (desktopActiveIndex + 1) % 3;
	}

	function onDeckClick(e: MouseEvent) {
		const el = e.target as HTMLElement;
		if (el.closest('a, button')) return;
		cycleMobileIndex();
	}

	function onDeckKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowRight' || e.key === ' ') {
			e.preventDefault();
			goNext();
		} else if (e.key === 'ArrowLeft') {
			e.preventDefault();
			goPrev();
		}
	}

	function onDesktopArticleClick(e: MouseEvent) {
		const el = e.target as HTMLElement;
		if (el.closest('a, button')) return;
		cycleDesktopIndex();
	}

	function onDesktopArticleKeydown(e: KeyboardEvent) {
		if (e.key === ' ' || e.key === 'Enter') {
			e.preventDefault();
			cycleDesktopIndex();
		}
	}

	function onTouchStart(e: TouchEvent) {
		touchStartX = e.changedTouches[0]?.clientX ?? null;
	}

	function onTouchEnd(e: TouchEvent) {
		if (touchStartX === null) return;
		const x = e.changedTouches[0]?.clientX ?? touchStartX;
		const dx = x - touchStartX;
		touchStartX = null;
		if (dx < -56) goNext();
		else if (dx > 56) goPrev();
	}

	function isMobileFlipped(i: number) {
		return isDesktop ? revealed[i] : i === activeIndex && mobileFaceUp[i];
	}

	function canPickCard(i: number) {
		if (isDesktop) return selectable && revealed[i];
		return selectable && i === activeIndex && mobileFaceUp[i];
	}

	function stackOffset(i: number) {
		const d = i - activeIndex;
		if (d === 0) return { y: 0, scale: 1, z: 40 };
		if (d < 0) return { y: -14 * d, scale: 1 - 0.04 * Math.abs(d), z: 10 + i };
		return { y: 16 * d, scale: 1 - 0.045 * d, z: 30 - i };
	}

	function fillTemplate(template: string, title: string, lede: string): string {
		return template.replaceAll('{title}', title).replaceAll('{lede}', lede);
	}

	function pickReading(slot: SlotKey): string {
		const pool = t.slotReading[slot];
		return pool[Math.floor(Math.random() * pool.length)] ?? pool[0]!;
	}

	function readingFor(slot: SlotKey, article: WikiArticle): string {
		return fillTemplate(pickReading(slot), article.title, '');
	}
</script>

{#if isDesktop}
	<div class="mx-auto flex w-full max-w-5xl flex-col gap-4">
		<div
			class="mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 xl:grid-cols-3 xl:gap-6"
			role="presentation"
		>
			{#each articles as article, i (article.pageId)}
				{@const flipped = isMobileFlipped(i)}
				{@const canPick = canPickCard(i)}
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<article
					class="mx-auto w-full max-w-xs cursor-pointer"
					class:ring-2={desktopActiveIndex === i}
					class:ring-primary={desktopActiveIndex === i}
					class:ring-offset-2={desktopActiveIndex === i}
					class:ring-offset-[hsl(60deg_12.5%_96.86%)]={desktopActiveIndex === i}
					role="presentation"
					tabindex="0"
					onclick={onDesktopArticleClick}
					onkeydown={onDesktopArticleKeydown}
				>
					<div class="flip-scene">
						<div class="flip-inner" class:flip-inner--revealed={flipped}>
							<div
								class="flip-face flip-face--back card flex items-center justify-center border-2 border-white/20 bg-black text-white"
								aria-hidden="true"
							>
								<span class="text-4xl font-bold select-none">{cardBackLetter}</span>
							</div>
							<div class="flip-face flip-face--front bg-transparent">
								<DesignCardFace {article} />
							</div>
						</div>
					</div>
					<div class="mt-3 border-t-2 border-base-content/15 px-4 pt-3">
						<p class="text-xs leading-relaxed text-black">
							{readingFor(slotByIndex[i]!, article)}
						</p>
					</div>
				</article>
			{/each}
		</div>
	</div>
{:else}
	<div class="mx-auto flex w-full max-w-[30rem] flex-col gap-0 px-4">
		<p class="text-center text-[10px] tracking-widest text-black uppercase">
			{t.mobileSwipeHint}
		</p>

		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div
			class="deck relative mx-auto mt-[8px] h-[min(88dvh,31rem)] w-full max-w-[30rem] touch-pan-y overflow-hidden"
			role="application"
			tabindex="0"
			aria-label={t.mobileSwipeHint}
			ontouchstart={onTouchStart}
			ontouchend={onTouchEnd}
			onclick={onDeckClick}
			onkeydown={onDeckKeydown}
		>
			{#each [0, 1, 2] as i (i)}
				{@const article = articles[i]!}
				{@const o = stackOffset(i)}
				{@const flipped = isMobileFlipped(i)}
				<div
					class="deck-card absolute top-0 left-1/2 w-full max-w-[30rem] transition-all duration-300 ease-out"
					style="transform: translate(calc(-50% + 0px), {o.y}px) scale({o.scale}); z-index: {o.z};"
				>
					<div class="flip-scene">
						<div class="flip-inner" class:flip-inner--revealed={flipped}>
							<div
								class="flip-face flip-face--back card flex items-center justify-center border-2 border-white/20 bg-black text-white"
								aria-hidden="true"
							>
								<span class="text-4xl font-bold select-none">{cardBackLetter}</span>
							</div>
							<div class="flip-face flip-face--front bg-transparent">
								<DesignCardFace {article} />
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<div class="mt-[-21px] flex justify-center gap-2">
			{#each [0, 1, 2] as i (i)}
				<span
					class="h-2 w-2 rounded-full border border-black/40 {activeIndex === i
						? 'bg-black'
						: 'bg-black/20'}"
					aria-hidden="true"
				></span>
			{/each}
		</div>

		<div class="mt-[18px] border-t-2 border-base-content/15 px-4 py-4">
			<p class="text-sm leading-relaxed text-black">
				{#if articles[activeIndex]}
					{readingFor(slotByIndex[activeIndex]!, articles[activeIndex]!)}
				{/if}
			</p>
		</div>
	</div>
{/if}

<style>
	.flip-scene {
		perspective: 1200px;
		aspect-ratio: 63 / 88;
		width: 100%;
	}

	.flip-inner {
		position: relative;
		width: 100%;
		height: 100%;
		transform-style: preserve-3d;
		transition: transform 0.65s ease;
	}

	.flip-inner--revealed {
		transform: rotateY(180deg);
	}

	.flip-face {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		border-radius: 20px !important;
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
		overflow: hidden;
	}

	.flip-face--back {
		transform: rotateY(0deg);
	}

	.flip-face--front {
		transform: rotateY(180deg);
	}
</style>
