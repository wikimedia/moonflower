<script lang="ts">
	import { en } from '$lib/i18n/en';

	let { children } = $props();
</script>

<div class="flex min-h-dvh flex-col">
	<header class="border-b-2 border-base-content/20 px-4 py-3">
		<h1 class="text-xs font-bold uppercase tracking-[0.3em]">{en.experiments.testProbe.name}</h1>
	</header>

	<main class="flex-1 overflow-y-auto">
		{@render children()}
	</main>
</div>
