<script lang="ts">
	import { en } from '$lib/i18n/en';

	let { children } = $props();
</script>

<div class="three-theme-spread-canvas flex min-h-dvh flex-col">
	<header class="border-b-2 border-base-content/20 px-4 py-3">
		<h1 class="text-xs font-bold tracking-[0.3em] text-black uppercase">
			{en.experiments.threeThemeSpread.name}
		</h1>
	</header>

	<main class="flex min-h-0 flex-1 flex-col overflow-hidden">
		{@render children()}
	</main>
</div>

<style>
	.three-theme-spread-canvas {
		background-color: hsl(60deg 12.5% 96.86%);
	}
</style>
