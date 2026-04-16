<script lang="ts">
	import type { Experiment } from '$lib/types';
	import { en } from '$lib/i18n/en';

	interface Props {
		experiment: Experiment;
		index?: number;
	}

	let { experiment, index = 0 }: Props = $props();
</script>

<a
	href="/{experiment.slug}"
	class="experiment-card group card bg-base-200 border-2 border-base-content/20 p-6 transition-all duration-300 hover:border-base-content/50 hover:translate-y-[-2px] hover:shadow-lg opacity-0 animate-stagger-in"
	style="animation-delay: {index * 80}ms; --accent: {experiment.color}"
>
	<div class="flex items-start gap-4">
		<div
			class="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-current text-xl font-bold transition-colors duration-300"
			style="color: {experiment.color}"
		>
			{experiment.name.charAt(0)}
		</div>
		<div class="flex-1">
			<h2 class="text-base font-bold uppercase tracking-widest group-hover:opacity-100 transition-opacity duration-300">
				{experiment.name}
			</h2>
			<p class="mt-1 text-xs uppercase tracking-widest opacity-40 group-hover:opacity-60 transition-opacity duration-300">
				{experiment.description}
			</p>
		</div>
		<span class="text-base-content/30 group-hover:text-base-content/70 transition-colors duration-300 text-lg font-bold">
			{en.shared.arrow}
		</span>
	</div>
</a>
