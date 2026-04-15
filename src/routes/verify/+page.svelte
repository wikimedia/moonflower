<script lang="ts">
	import { en } from '$lib/i18n/en';
	import { completeMagicLink } from '$lib/firebase/client';
	import { authState } from '$lib/firebase/auth.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let status = $state<'verifying' | 'claiming' | 'done' | 'error'>('verifying');

	onMount(async () => {
		try {
			const success = await completeMagicLink();
			if (!success) {
				goto('/');
				return;
			}

			const pendingClaimJson = localStorage.getItem('pendingClaim');
			if (pendingClaimJson) {
				status = 'claiming';
				const card = JSON.parse(pendingClaimJson);

				// Wait for auth state to settle
				await new Promise<void>((resolve, reject) => {
					const timeout = setTimeout(() => reject(new Error('timeout')), 10000);
					const check = setInterval(() => {
						if (!authState.loading && authState.user) {
							clearInterval(check);
							clearTimeout(timeout);
							resolve();
						}
					}, 100);
				});

				const token = await authState.user!.getIdToken();
				const res = await fetch('/api/claim', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`
					},
					body: JSON.stringify(card)
				});

				localStorage.removeItem('pendingClaim');

				if (res.ok) {
					toastStore.show(en.toast.claimed, 'info');
				} else if (res.status === 409) {
					toastStore.show(en.toast.tooSlow, 'error');
				}

				status = 'done';
				goto('/inventory');
			} else {
				status = 'done';
				goto('/');
			}
		} catch {
			status = 'error';
			toastStore.show(en.errors.authFailed, 'error');
			setTimeout(() => goto('/'), 2000);
		}
	});
</script>

<div class="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center px-4">
	<h1 class="text-2xl font-bold uppercase tracking-[0.3em]">
		{#if status === 'verifying'}
			{en.auth.verifying}
		{:else if status === 'claiming'}
			{en.common.loading}
		{:else if status === 'error'}
			{en.errors.authFailed}
		{:else}
			{en.common.loading}
		{/if}
	</h1>

	<span class="loading loading-bars loading-md mt-6"></span>
</div>
