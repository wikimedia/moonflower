<script lang="ts">
	import { toastStore } from '$lib/stores/toast.svelte';
</script>

{#if toastStore.items.length > 0}
	<div class="toast toast-center toast-bottom z-50 mb-20">
		{#each toastStore.items as toast (toast.id)}
			<div
				class="alert font-mono text-sm tracking-wide animate-slide-up
					{toast.type === 'error' ? 'alert-error' : 'alert-info'}"
			>
				<span>{toast.message}</span>
			</div>
		{/each}
	</div>
{/if}
