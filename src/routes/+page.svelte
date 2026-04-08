<script lang="ts">
	import { en } from '$lib/i18n/en';
	import { authState } from '$lib/firebase/auth.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import GachaCard from '$lib/components/GachaCard.svelte';
	import EmailModal from '$lib/components/EmailModal.svelte';
	import type { WikiCard } from '$lib/types';

	let cards = $state<WikiCard[]>([]);
	let pulling = $state(false);
	let showEmailModal = $state(false);
	let pendingCard = $state<WikiCard | null>(null);
	let claimingCards = $state<Set<number>>(new Set());
	let claimedCards = $state<Set<number>>(new Set());
	let hasPulled = $state(false);

	async function pull() {
		pulling = true;
		cards = [];
		claimedCards = new Set();
		hasPulled = true;
		try {
			const res = await fetch('/api/pull');
			if (!res.ok) throw new Error();
			cards = await res.json();
			if (cards.length === 0) {
				toastStore.show(en.gacha.emptyPull, 'info');
			}
		} catch {
			toastStore.show(en.errors.pullFailed, 'error');
		} finally {
			pulling = false;
		}
	}

	async function claimCard(card: WikiCard) {
		if (!authState.user) {
			pendingCard = card;
			localStorage.setItem('pendingClaim', JSON.stringify(card));
			showEmailModal = true;
			return;
		}

		claimingCards = new Set([...claimingCards, card.pageId]);
		try {
			const token = await authState.user.getIdToken();
			const res = await fetch('/api/claim', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					pageId: card.pageId,
					title: card.title,
					extract: card.extract
				})
			});

			if (res.status === 409) {
				toastStore.show(en.toast.tooSlow, 'error');
			} else if (res.ok) {
				claimedCards = new Set([...claimedCards, card.pageId]);
				toastStore.show(en.toast.claimed, 'info');
			} else {
				throw new Error();
			}
		} catch {
			toastStore.show(en.errors.claimFailed, 'error');
		} finally {
			const next = new Set(claimingCards);
			next.delete(card.pageId);
			claimingCards = next;
		}
	}
</script>

<div class="flex min-h-[calc(100dvh-4rem)] flex-col items-center px-4 py-8">
	<header class="mb-12 text-center">
		<h1 class="text-4xl font-bold tracking-[0.3em] uppercase">{en.common.appName}</h1>
		<p class="mt-2 text-xs uppercase tracking-widest opacity-40">{en.common.tagline}</p>
	</header>

	{#if !hasPulled || cards.length === 0}
		<div class="flex flex-1 flex-col items-center justify-center">
			<button
				onclick={pull}
				disabled={pulling}
				class="border-2 border-black bg-black px-16 py-5 text-lg font-bold tracking-[0.3em] text-white transition-colors hover:bg-white hover:text-black disabled:opacity-50"
			>
				{pulling ? en.gacha.pulling : en.gacha.pullButton}
			</button>

			{#if !hasPulled}
				<p class="mt-8 text-xs uppercase tracking-widest opacity-30">{en.gacha.noPulls}</p>
			{/if}
		</div>
	{:else}
		<div class="mb-8 w-full max-w-sm space-y-6">
			{#each cards as card, i (card.pageId)}
				<div class="card-stagger opacity-0 animate-stagger-in" style="animation-delay: {i * 80}ms">
					<GachaCard
						{card}
						onClaim={claimCard}
						claiming={claimingCards.has(card.pageId)}
						claimed={claimedCards.has(card.pageId)}
					/>
				</div>
			{/each}
		</div>

		<button
			onclick={pull}
			disabled={pulling}
			class="mb-20 border-2 border-black bg-black px-12 py-4 text-base font-bold tracking-[0.3em] text-white transition-colors hover:bg-white hover:text-black disabled:opacity-50"
		>
			{pulling ? en.gacha.pulling : en.gacha.pullButton}
		</button>
	{/if}
</div>

{#if showEmailModal}
	<EmailModal
		onClose={() => {
			showEmailModal = false;
			pendingCard = null;
		}}
	/>
{/if}
