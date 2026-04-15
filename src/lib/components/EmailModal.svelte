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
<div class="modal modal-open" role="dialog" aria-modal="true" onclick={handleBackdrop}>
	<div class="modal-box bg-base-200 border-2 border-base-content/20">
		{#if sent}
			<h2 class="text-lg font-bold uppercase tracking-widest">{en.auth.checkEmail}</h2>
			<p class="mt-4 text-sm tracking-wide">{en.auth.emailSent}</p>
			<div class="modal-action">
				<button
					class="btn btn-primary btn-block tracking-[0.3em]"
					onclick={onClose}
				>
					{en.common.ok}
				</button>
			</div>
		{:else}
			<h2 class="text-lg font-bold uppercase tracking-widest">
				{en.auth.signInToClaim}
			</h2>
			<form onsubmit={handleSubmit}>
				<input
					type="email"
					bind:value={email}
					placeholder={en.auth.emailPlaceholder}
					required
					class="input input-bordered w-full mt-4 font-mono text-sm tracking-wide"
				/>
				<div class="modal-action">
					<button
						type="submit"
						disabled={sending}
						class="btn btn-primary btn-block tracking-[0.3em]"
					>
						{#if sending}
							<span class="loading loading-spinner loading-sm"></span>
						{/if}
						{sending ? en.common.loading : en.auth.sendLink}
					</button>
				</div>
			</form>
		{/if}
	</div>
	<div class="modal-backdrop" onclick={onClose}></div>
</div>
