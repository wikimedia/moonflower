<script lang="ts">
	import { en } from '$lib/i18n/en';

	interface Props {
		message: string;
	}

	let { message }: Props = $props();

	const t = en.experiments.gatchaDrop;
</script>

<div
	class="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12"
	aria-busy="true"
	aria-live="polite"
>
	<p class="text-center text-xs font-bold tracking-[0.35em] uppercase opacity-50">
		{message}
	</p>
	<div class="flex items-center gap-5" aria-hidden="true">
		<span class="pull-dot pull-dot-1 h-4 w-4 rounded-full bg-primary"></span>
		<span class="pull-dot pull-dot-2 h-4 w-4 rounded-full bg-primary"></span>
		<span class="pull-dot pull-dot-3 h-4 w-4 rounded-full bg-primary"></span>
	</div>
	<p class="text-center text-[10px] tracking-widest uppercase opacity-30">{t.pullLoadingHint}</p>
</div>

<style>
	.pull-dot {
		display: block;
		opacity: 0.25;
		transform: scale(0.85);
		animation: pull-dot-glow 1.2s ease-in-out infinite;
	}
	.pull-dot-2 {
		animation-delay: 0.4s;
	}
	.pull-dot-3 {
		animation-delay: 0.8s;
	}
	@keyframes pull-dot-glow {
		0%,
		100% {
			opacity: 0.25;
			transform: scale(0.85);
		}
		33% {
			opacity: 1;
			transform: scale(1.1);
		}
	}
</style>
