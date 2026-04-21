<script lang="ts">
	import GachaCard from '$lib/components/GachaCard.svelte';
	import { en } from '$lib/i18n/en';
	import type { WikiArticle } from '$lib/types';
	import { trimArticleQuote } from '../../../../maryyann/gatcha-drop/quote';

	const t = en.experiments.gatchaDrop;

	interface Props {
		article: WikiArticle | null;
		onClose: () => void;
		onCollect: () => void;
		collectDisabled: boolean;
		collectLabel: string;
		wikiLinkLabel: string;
		closeLabel: string;
	}

	let {
		article,
		onClose,
		onCollect,
		collectDisabled,
		collectLabel,
		wikiLinkLabel,
		closeLabel
	}: Props = $props();

	const cardArticle = $derived(
		article ? { ...article, extract: trimArticleQuote(article.extract) } : null
	);
</script>

{#if article && cardArticle}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-neutral/80 p-4"
		onclick={onClose}
		role="presentation"
	>
		<div
			class="relative max-h-[90dvh] w-full max-w-md overflow-y-auto border-0"
			onclick={(e) => e.stopPropagation()}
			role="presentation"
		>
			<button
				type="button"
				class="btn btn-circle btn-ghost btn-sm absolute top-2 right-2 z-10 min-h-8 min-w-8 border-2 border-base-content/20 text-lg leading-none"
				aria-label={closeLabel}
				onclick={onClose}
			>
				×
			</button>
			<GachaCard
				article={cardArticle}
				flippable={false}
				articleLinkMode="separate"
				{wikiLinkLabel}
				extractLabel={t.articleQuoteHeading}
				figureClass="h-56 min-h-[14rem] sm:h-64 sm:min-h-[16rem]"
			>
				{#snippet actions()}
					<button
						type="button"
						class="btn w-full border-2 border-base-content/20 font-bold tracking-widest uppercase btn-primary"
						disabled={collectDisabled}
						onclick={onCollect}
					>
						{collectLabel}
					</button>
				{/snippet}
			</GachaCard>
		</div>
	</div>
{/if}
