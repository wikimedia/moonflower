<script lang="ts">
	import { toastStore } from '$lib/stores/toast.svelte';
</script>

{#if toastStore.items.length > 0}
	<div class="fixed bottom-20 left-0 right-0 z-50 flex flex-col items-center gap-2 px-4">
		{#each toastStore.items as toast (toast.id)}
			<div
				class="w-full max-w-sm border-2 px-4 py-3 font-mono text-sm tracking-wide animate-slide-up
					{toast.type === 'error' ? 'border-white bg-black text-white' : 'border-black bg-white text-black'}"
			>
				{toast.message}
			</div>
		{/each}
	</div>
{/if}
