<script lang="ts">
	import { en } from '$lib/i18n/en';
	import { sendMagicLink } from '$lib/firebase/client';
	import { toastStore } from '$lib/stores/toast.svelte';

	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();
	let email = $state('');
	let sending = $state(false);
	let sent = $state(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!email) return;
		sending = true;
		try {
			await sendMagicLink(email);
			sent = true;
			toastStore.show(en.toast.linkSent, 'info');
		} catch {
			toastStore.show(en.errors.authFailed, 'error');
		} finally {
			sending = false;
		}
	}

	function handleBackdrop(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6"
	role="dialog"
	aria-modal="true"
	tabindex="-1"
	onclick={handleBackdrop}
>
	<div class="w-full max-w-sm border-2 border-black bg-white p-6">
		{#if sent}
			<h2 class="mb-4 text-lg font-bold uppercase tracking-widest">{en.auth.checkEmail}</h2>
			<p class="mb-6 text-sm tracking-wide">{en.auth.emailSent}</p>
			<button
				class="w-full border-2 border-black bg-black py-3 font-bold tracking-[0.3em] text-white transition-colors hover:bg-white hover:text-black"
				onclick={onClose}
			>
				{en.common.ok}
			</button>
		{:else}
			<h2 class="mb-2 text-lg font-bold uppercase tracking-widest">
				{en.auth.signInToClaim}
			</h2>
			<form onsubmit={handleSubmit}>
				<input
					type="email"
					bind:value={email}
					placeholder={en.auth.emailPlaceholder}
					required
					class="mb-4 mt-4 w-full border-2 border-black bg-white px-4 py-3 font-mono text-sm tracking-wide outline-none focus:bg-black focus:text-white"
				/>
				<button
					type="submit"
					disabled={sending}
					class="w-full border-2 border-black bg-black py-3 font-bold tracking-[0.3em] text-white transition-colors hover:bg-white hover:text-black disabled:opacity-50"
				>
					{sending ? en.common.loading : en.auth.sendLink}
				</button>
			</form>
		{/if}
	</div>
</div>
