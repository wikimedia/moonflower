<script lang="ts">
	import { en } from '$lib/i18n/en';
	import { experiments } from '$lib/experiments';
	import ExperimentCard from '$lib/components/ExperimentCard.svelte';
</script>

<div class="flex min-h-[calc(100dvh-2rem)] flex-col items-center px-4 py-12">
	<header class="mb-16 text-center">
		<h1 class="text-4xl font-bold tracking-[0.3em] uppercase">{en.common.appName}</h1>
		<p class="mt-2 text-xs uppercase tracking-widest opacity-40">{en.common.tagline}</p>
	</header>

	<section class="w-full max-w-lg">
		<h2 class="mb-6 text-xs font-bold uppercase tracking-[0.3em] opacity-50">
			{en.hub.heading}
		</h2>

		{#if experiments.length === 0}
			<p class="text-sm uppercase tracking-widest opacity-30">{en.hub.empty}</p>
		{:else}
			<div class="space-y-4">
				{#each experiments as experiment, i (experiment.slug)}
					<ExperimentCard {experiment} index={i} />
				{/each}
			</div>
		{/if}
	</section>
</div>
