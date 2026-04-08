<script lang="ts">
	import './layout.css';
	import { en } from '$lib/i18n/en';
	import Toast from '$lib/components/Toast.svelte';
	import { page } from '$app/state';

	let { children } = $props();

	const isActive = (path: string) => page.url.pathname === path || page.url.pathname.startsWith(path + '/');
</script>

<svelte:head>
	<title>{en.common.appName}</title>
</svelte:head>

<div class="flex min-h-dvh flex-col bg-white font-mono text-black">
	<main class="flex-1 overflow-y-auto pb-16">
		{@render children()}
	</main>

	<!-- Bottom navigation -->
	<nav class="fixed bottom-0 left-0 right-0 z-40 flex border-t-2 border-white bg-black text-white">
		<a
			href="/"
			class="flex-1 py-4 text-center text-sm font-bold tracking-widest transition-colors {isActive('/') && !isActive('/inventory') && !isActive('/verify') ? 'bg-white text-black' : 'hover:bg-white/10'}"
		>
			{en.nav.pull}
		</a>
		<div class="w-0.5 bg-white/30"></div>
		<a
			href="/inventory"
			class="flex-1 py-4 text-center text-sm font-bold tracking-widest transition-colors {isActive('/inventory') ? 'bg-white text-black' : 'hover:bg-white/10'}"
		>
			{en.nav.inventory}
		</a>
	</nav>
</div>

<Toast />
