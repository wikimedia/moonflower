<script lang="ts">
	import { en } from '../../src/lib/i18n/en';
	import type { WikiArticle } from '../../src/lib/types';
	import {
		DESIGN_CARD_ASPECT_HEIGHT,
		DESIGN_CARD_ASPECT_WIDTH,
		DESIGN_CARD_BACKGROUND
	} from './constants';
	import { firstIntroSentence } from './sentence';
	import { wikiArticleUrl } from './wiki-url';

	interface Props {
		article: WikiArticle;
	}

	let { article }: Props = $props();

	const t = en.experiments.designCard;
	const factLine = $derived(firstIntroSentence(article.extract));
	const thumb = $derived(typeof article.thumbnail === 'string' ? article.thumbnail : '');
</script>

<div
	class="design-card-face relative w-full overflow-hidden text-black"
	style:background-color={DESIGN_CARD_BACKGROUND}
	style:aspect-ratio={`${DESIGN_CARD_ASPECT_WIDTH} / ${DESIGN_CARD_ASPECT_HEIGHT}`}
>
	<div class="flex h-full min-h-0 flex-col">
		<div class="relative min-h-0 flex-[7] overflow-hidden">
			{#if thumb}
				<img
					src={thumb}
					alt=""
					class="absolute inset-0 h-full w-full object-cover object-center"
					loading="lazy"
				/>
			{/if}
		</div>
		<div
			class="design-card-face-text flex min-h-0 flex-[3] flex-col justify-center gap-1 overflow-hidden"
		>
			<h2 class="line-clamp-2 shrink-0 text-xs font-bold uppercase tracking-wide">
				{article.title}
			</h2>
			<p class="min-h-0 flex-1 overflow-y-auto text-[10px] leading-snug tracking-wide opacity-90">
				{factLine}
			</p>
			<p
				class="flex shrink-0 flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[7px] leading-tight tracking-wide opacity-60"
			>
				<a
					class="link link-hover font-bold opacity-90"
					href={wikiArticleUrl(article)}
					target="_blank"
					rel="noreferrer noopener">{t.openArticleButton}</a
				>
				<span>{t.licenseNote}</span>
			</p>
		</div>
	</div>
	<div class="design-card-face-frame" aria-hidden="true"></div>
</div>
