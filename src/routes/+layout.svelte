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

<div class="flex min-h-dvh flex-col bg-base-100 font-mono text-base-content">
	<main class="flex-1 overflow-y-auto pb-16">
		{@render children()}
	</main>

	<!-- Bottom navigation -->
	<div class="btm-nav btm-nav-sm z-40 border-t-2 border-base-content/20 bg-base-200">
		<a
			href="/"
			class="font-bold tracking-widest {isActive('/') && !isActive('/inventory') && !isActive('/verify') ? 'active' : ''}"
		>
			<span class="text-sm">{en.nav.pull}</span>
		</a>
		<a
			href="/inventory"
			class="font-bold tracking-widest {isActive('/inventory') ? 'active' : ''}"
		>
			<span class="text-sm">{en.nav.inventory}</span>
		</a>
	</div>
</div>

<Toast />
