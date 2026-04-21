<script lang="ts">
	import { en } from '$lib/i18n/en';

	let { children } = $props();
</script>

<div class="flex min-h-dvh flex-col bg-base-200">
	<header class="border-b-2 border-base-content/20 px-4 py-3">
		<h1 class="text-xs font-bold tracking-[0.3em] uppercase">{en.experiments.browse.name}</h1>
	</header>

	<main class="flex min-h-0 flex-1 flex-col overflow-hidden">
		{@render children()}
	</main>
</div>
