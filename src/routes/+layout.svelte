<script lang="ts">
	import './layout.css';
	import { en } from '$lib/i18n/en';
	import Toast from '$lib/components/Toast.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<title>{en.common.appName}</title>
	<meta name="description" content={en.common.tagline} />
</svelte:head>

<div class="flex min-h-dvh flex-col bg-base-100 font-mono text-base-content">
	<main class="flex-1 overflow-y-auto">
		{@render children()}
	</main>
</div>

<Toast />
