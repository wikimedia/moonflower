<script lang="ts">
	import DesignCardFace from '../../../../maryyann/designCard/DesignCardFace.svelte';
	import { en } from '$lib/i18n/en';
	import type { WikiArticle } from '$lib/types';
	import { trimArticleQuote } from '../../../../maryyann/gatcha-drop/quote';

	interface Props {
		article: WikiArticle | null;
		onClose: () => void;
		onCollect: () => void;
		collectDisabled: boolean;
		collectLabel: string;
		leaveLabel: string;
		closeLabel: string;
	}

	let {
		article,
		onClose,
		onCollect,
		collectDisabled,
		collectLabel,
		leaveLabel,
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
			class="max-h-[90dvh] w-full max-w-md overflow-y-auto border-0"
			onclick={(e) => e.stopPropagation()}
			role="presentation"
		>
			<div class="mb-2 flex justify-end">
				<button
					type="button"
					class="btn btn-circle btn-ghost btn-sm min-h-8 min-w-8 text-lg leading-none"
					aria-label={closeLabel}
					onclick={onClose}
				>
					×
				</button>
			</div>
			<div class="border-2 border-base-content/20 p-3">
				<DesignCardFace article={cardArticle} />
			</div>
			<div class="mt-3">
				<button
					type="button"
					class="btn gatcha-drop-collect-btn w-full border-2 border-base-content/20 font-bold tracking-widest uppercase"
					disabled={collectDisabled}
					onclick={onCollect}
				>
					{collectLabel}
				</button>
			</div>
			<div class="mt-2">
				<button
					type="button"
					class="btn gatcha-drop-leave-btn w-full border-2 border-base-content/20 font-bold tracking-widest uppercase"
					onclick={onClose}
				>
					{leaveLabel}
				</button>
			</div>
		</div>
	</div>
{/if}
