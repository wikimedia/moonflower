<script lang="ts">
	import { en } from '$lib/i18n/en';

	let { children } = $props();
</script>

<div class="flex min-h-dvh flex-col">
	<header class="flex items-center gap-4 border-b-2 border-base-content/20 px-4 py-3">
		<a href="/" class="text-xs font-bold uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity">
			{en.shared.back}
		</a>
		<span class="text-base-content/20">|</span>
		<h1 class="text-xs font-bold uppercase tracking-[0.3em]">{en.experiments.example.name}</h1>
	</header>

	<main class="flex-1 overflow-y-auto">
		{@render children()}
	</main>
</div>
