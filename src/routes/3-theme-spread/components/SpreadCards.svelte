<script lang="ts">
	import { en } from '$lib/i18n/en';
	import type { WikiArticle } from '$lib/types';
	import { wikiArticleUrl } from '../lib/wiki-url';

	interface Props {
		articles: WikiArticle[];
		lines: [string, string, string];
		labels: [string, string, string];
		revealed: [boolean, boolean, boolean];
		selectable: boolean;
		selectedPageId: number | null;
		cardBackLetter: string;
		keepButton: string;
		openArticleButton: string;
		onPick: (pageId: number) => void;
		onMobileFullyViewed?: () => void;
	}

	let {
		articles,
		lines,
		labels,
		revealed,
		selectable,
		selectedPageId,
		cardBackLetter,
		keepButton,
		openArticleButton,
		onPick,
		onMobileFullyViewed
	}: Props = $props();

	const t = en.experiments.threeThemeSpread;

	let isDesktop = $state(false);
	let activeIndex = $state(0);
	let desktopActiveIndex = $state(0);
	let mobileFaceUp = $state<[boolean, boolean, boolean]>([false, false, false]);
	let visited = $state<[boolean, boolean, boolean]>([false, false, false]);
	let mobileViewNotified = $state(false);
	let touchStartX = $state<number | null>(null);
	let hoverIndex = $state<number | null>(null);

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
		mobileFaceUp = [false, false, false];
		visited = [false, false, false];
		mobileViewNotified = false;
		if (typeof window === 'undefined') return;
		const desktop = window.matchMedia('(min-width: 768px)').matches;
		if (desktop || articles.length !== 3) return;
		const t0 = window.setTimeout(() => {
			mobileFaceUp = [true, false, false];
			visited = [true, false, false];
		}, 120);
		return () => window.clearTimeout(t0);
	});

	$effect(() => {
		if (isDesktop || !visited[0] || !visited[1] || !visited[2] || mobileViewNotified) return;
		mobileViewNotified = true;
		onMobileFullyViewed?.();
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

	function goToDesktopIndex(i: number) {
		if (i < 0 || i > 2 || i === desktopActiveIndex) return;
		desktopActiveIndex = i;
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
</script>

{#if isDesktop}
	<div class="mx-auto flex w-full max-w-5xl flex-col gap-4">
		<div class="flex flex-wrap justify-center gap-2">
			{#each [0, 1, 2] as i (i)}
				<button
					type="button"
					class="rounded-none border-2 px-3 py-2 text-center text-sm font-bold tracking-widest text-white uppercase transition-colors md:text-base {desktopActiveIndex ===
					i
						? 'border-white/50 bg-black'
						: 'border-white/30 bg-neutral/70'}"
					onclick={() => goToDesktopIndex(i)}
				>
					{labels[i]}
				</button>
			{/each}
		</div>

		<div
			class="mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 md:grid-cols-3 md:gap-4"
			onmouseleave={() => (hoverIndex = null)}
			role="presentation"
		>
			{#each articles as article, i (article.pageId)}
				{@const href = wikiArticleUrl(article)}
				{@const flipped = isMobileFlipped(i)}
				{@const canPick = canPickCard(i)}
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<article
					class="mx-auto w-full max-w-sm cursor-pointer"
					class:ring-2={desktopActiveIndex === i}
					class:ring-primary={desktopActiveIndex === i}
					class:ring-offset-2={desktopActiveIndex === i}
					class:ring-offset-[hsl(60deg_12.5%_96.86%)]={desktopActiveIndex === i}
					role="presentation"
					tabindex="0"
					onmouseenter={() => (hoverIndex = i)}
					onclick={onDesktopArticleClick}
					onkeydown={onDesktopArticleKeydown}
				>
					<div class="flip-scene">
						<div class="flip-inner" class:flip-inner--revealed={flipped}>
							<div
								class="flip-face flip-face--back card flex items-center justify-center border-2 border-base-content/20 bg-neutral text-neutral-content"
								aria-hidden="true"
							>
								<span class="text-7xl font-bold select-none">{cardBackLetter}</span>
							</div>
							<div
								class="flip-face flip-face--front card border-2 border-white/20 bg-neutral text-white"
							>
								{#if article.thumbnail}
									<figure class="relative h-40 overflow-hidden">
										<img
											src={article.thumbnail}
											alt=""
											class="h-full w-full object-cover"
											loading="lazy"
										/>
										<div class="absolute inset-0 bg-gradient-to-t from-neutral to-transparent"></div>
									</figure>
								{/if}
								<div class="card-body flex flex-col gap-2 p-4 pt-2">
									<span
										class="text-xs font-bold tracking-widest text-white uppercase md:text-sm"
										class:ring-2={hoverIndex === i}
										class:ring-white={hoverIndex === i}
										class:ring-offset-2={hoverIndex === i}
										class:ring-offset-neutral={hoverIndex === i}
									>
										{labels[i]}
									</span>
									<h2
										class="border-b-2 border-white/25 pb-2 text-sm font-bold tracking-widest text-white uppercase"
									>
										{article.title}
									</h2>
									<p class="text-[10px] font-bold tracking-widest text-white/90 uppercase">
										{t.funFactHeading}
									</p>
									<p class="text-xs leading-snug text-white">{lines[i]}</p>
									<div class="card-actions mt-2 flex flex-wrap gap-2">
										<a
											{href}
											target="_blank"
											rel="external noopener noreferrer"
											class="btn btn-ghost btn-xs text-white uppercase tracking-widest hover:bg-white/10"
											>{openArticleButton}</a
										>
										<button
											type="button"
											class="btn btn-primary btn-sm uppercase tracking-widest"
											disabled={!canPick}
											aria-pressed={selectedPageId === article.pageId}
											aria-label={`${keepButton} ${article.title}`}
											onclick={() => onPick(article.pageId)}
										>
											{keepButton}
										</button>
									</div>
								</div>
							</div>
						</div>
					</div>
					<div class="mt-3 border-t-2 border-base-content/15 px-1 pt-3">
						<p class="text-[10px] font-bold tracking-widest text-black uppercase">
							{t.descriptionHeading}
						</p>
						<p class="text-xs leading-relaxed text-black">{article.extract}</p>
					</div>
				</article>
			{/each}
		</div>
	</div>
{:else}
	<div class="mx-auto flex w-full max-w-lg flex-col gap-4 px-1">
		<div class="flex flex-wrap justify-center gap-2">
			{#each [0, 1, 2] as i (i)}
				<button
					type="button"
					class="rounded-none border-2 px-3 py-2 text-center text-sm font-bold tracking-widest text-white uppercase transition-colors md:text-base {activeIndex ===
					i
						? 'border-white/50 bg-black'
						: 'border-white/30 bg-neutral/70'}"
					onclick={() => goToMobileIndex(i)}
				>
					{labels[i]}
				</button>
			{/each}
		</div>

		<p class="text-center text-[10px] tracking-widest text-black uppercase">{t.mobileSwipeHint}</p>

		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div
			class="deck relative mx-auto mt-2 h-[min(72vh,30rem)] w-full max-w-sm touch-pan-y"
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
				{@const href = wikiArticleUrl(article)}
				{@const o = stackOffset(i)}
				{@const flipped = isMobileFlipped(i)}
				{@const canPick = canPickCard(i)}
				<div
					class="deck-card absolute top-6 left-1/2 w-[min(92vw,22rem)] transition-all duration-300 ease-out"
					style="transform: translate(calc(-50% + 0px), {o.y}px) scale({o.scale}); z-index: {o.z};"
				>
					<div class="flip-scene flip-scene--mobile">
						<div class="flip-inner" class:flip-inner--revealed={flipped}>
							<div
								class="flip-face flip-face--back card flex items-center justify-center border-2 border-base-content/20 bg-neutral text-neutral-content"
								aria-hidden="true"
							>
								<span class="text-7xl font-bold select-none">{cardBackLetter}</span>
							</div>
							<div
								class="flip-face flip-face--front card border-2 border-white/20 bg-neutral text-white"
							>
								{#if article.thumbnail}
									<figure class="relative h-36 overflow-hidden">
										<img
											src={article.thumbnail}
											alt=""
											class="h-full w-full object-cover"
											loading="lazy"
										/>
										<div
											class="absolute inset-0 bg-gradient-to-t from-neutral to-transparent"
										></div>
									</figure>
								{/if}
								<div class="card-body flex flex-col gap-2 p-3 pt-2">
									<h2
										class="border-b-2 border-white/25 pb-1 text-xs font-bold tracking-widest text-white uppercase"
									>
										{article.title}
									</h2>
									<p class="text-[10px] font-bold tracking-widest text-white/90 uppercase">
										{t.funFactHeading}
									</p>
									<p class="text-xs leading-snug text-white">{lines[i]}</p>
									<div class="card-actions mt-1 flex flex-wrap gap-2">
										<a
											{href}
											target="_blank"
											rel="external noopener noreferrer"
											class="btn btn-ghost btn-xs text-white uppercase tracking-widest hover:bg-white/10"
											>{openArticleButton}</a
										>
										<button
											type="button"
											class="btn btn-primary btn-xs uppercase tracking-widest"
											disabled={!canPick}
											aria-pressed={selectedPageId === article.pageId}
											aria-label={`${keepButton} ${article.title}`}
											onclick={() => onPick(article.pageId)}
										>
											{keepButton}
										</button>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<div class="mt-2 flex justify-center gap-2">
			<button
				type="button"
				class="btn btn-outline btn-sm uppercase tracking-widest"
				onclick={goPrev}>{t.prevCard}</button
			>
			<button
				type="button"
				class="btn btn-outline btn-sm uppercase tracking-widest"
				onclick={goNext}>{t.nextCard}</button
			>
		</div>

		<div class="border-t-2 border-base-content/15 px-1 py-4">
			<p class="text-[10px] font-bold tracking-widest text-black uppercase">
				{t.descriptionHeading}
			</p>
			<p class="text-sm leading-relaxed text-black">{articles[activeIndex]?.extract}</p>
		</div>
	</div>
{/if}

<style>
	.flip-scene {
		perspective: 1200px;
		aspect-ratio: 3 / 4;
		width: 100%;
	}

	.flip-scene--mobile {
		max-height: min(58vh, 22rem);
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
