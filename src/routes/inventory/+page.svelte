<script lang="ts">
	import { en } from '$lib/i18n/en';
	import { authState } from '$lib/firebase/auth.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
	import { db } from '$lib/firebase/client';
	import GachaCard from '$lib/components/GachaCard.svelte';
	import type { WikiCard } from '$lib/types';
	import { goto } from '$app/navigation';

	let cards = $state<WikiCard[]>([]);
	let loading = $state(true);
	let releasingCards = $state<Set<number>>(new Set());

	$effect(() => {
		if (!authState.loading && !authState.user) {
			goto('/');
		}
		if (authState.user) {
			loadInventory();
		}
	});

	async function loadInventory() {
		loading = true;
		try {
			const q = query(collection(db, 'claimed_cards'), where('ownerId', '==', authState.user!.uid));
			const snapshot = await getDocs(q);
			cards = snapshot.docs.map((d) => ({
				pageId: Number(d.id),
				title: d.data().title,
				extract: d.data().extract
			}));
		} catch {
			toastStore.show(en.errors.pullFailed, 'error');
		} finally {
			loading = false;
		}
	}

	async function releaseCard(card: WikiCard) {
		if (!confirm(en.inventory.releaseConfirm)) return;
		releasingCards = new Set([...releasingCards, card.pageId]);
		try {
			await deleteDoc(doc(db, 'claimed_cards', String(card.pageId)));
			cards = cards.filter((c) => c.pageId !== card.pageId);
			toastStore.show(en.toast.released, 'info');
		} catch {
			toastStore.show(en.errors.claimFailed, 'error');
		} finally {
			const next = new Set(releasingCards);
			next.delete(card.pageId);
			releasingCards = next;
		}
	}
</script>

<div class="flex min-h-[calc(100dvh-4rem)] flex-col items-center px-4 py-8">
	<header class="mb-8 w-full max-w-sm">
		<div class="flex items-baseline justify-between">
			<h1 class="text-2xl font-bold uppercase tracking-[0.3em]">{en.inventory.title}</h1>
			{#if !loading}
				<span class="text-xs uppercase tracking-widest opacity-40">
					{en.inventory.cardCount(cards.length)}
				</span>
			{/if}
		</div>

		{#if authState.user}
			<button
				onclick={() => authState.signOut()}
				class="mt-2 text-xs font-bold uppercase tracking-widest opacity-40 transition-opacity hover:opacity-100"
			>
				{en.auth.signOut}
			</button>
		{/if}
	</header>

	{#if loading}
		<div class="flex flex-1 items-center justify-center">
			<div class="h-0.5 w-16 animate-pulse bg-black"></div>
		</div>
	{:else if cards.length === 0}
		<div class="flex flex-1 flex-col items-center justify-center">
			<p class="text-sm uppercase tracking-widest opacity-40">{en.inventory.empty}</p>
		</div>
	{:else}
		<div class="mb-20 w-full max-w-sm space-y-6">
			{#each cards as card (card.pageId)}
				<GachaCard
					{card}
					mode="inventory"
					onRelease={releaseCard}
					releasing={releasingCards.has(card.pageId)}
				/>
			{/each}
		</div>
	{/if}
</div>
