<script lang="ts">
	import { en } from '$lib/i18n/en';

	let testValue = $state<string | null>(null);
	let loading = $state(false);
	let failed = $state(false);

	async function probeTest() {
		loading = true;
		failed = false;

		try {
			const res = await fetch(en.experiments.testProbe.endpointValue);
			if (!res.ok) throw new Error('Request failed');
			const data = (await res.json()) as { TEST?: string | null };
			testValue = typeof data.TEST === 'string' ? data.TEST : null;
		} catch {
			failed = true;
			testValue = null;
		} finally {
			loading = false;
		}
	}

	void probeTest();
</script>

<div class="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-3xl flex-col items-center justify-center gap-6 px-4 py-10">
	<div class="card w-full border-2 border-base-content/20 bg-base-200">
		<div class="card-body gap-4">
			<p class="text-xs font-bold uppercase tracking-[0.3em] opacity-60">{en.experiments.testProbe.headline}</p>
			<p class="text-sm opacity-80">{en.experiments.testProbe.hint}</p>

			<div class="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
				<div class="rounded-none border-2 border-base-content/20 px-3 py-2">
					<p class="text-xs font-bold uppercase tracking-[0.2em] opacity-60">{en.experiments.testProbe.endpointLabel}</p>
					<p class="mt-1 font-mono text-xs">{en.experiments.testProbe.endpointValue}</p>
				</div>
				<div class="rounded-none border-2 border-base-content/20 px-3 py-2">
					<p class="text-xs font-bold uppercase tracking-[0.2em] opacity-60">{en.experiments.testProbe.variableLabel}</p>
					<p class="mt-1 font-mono text-xs">{en.experiments.testProbe.variableName}</p>
				</div>
				<div class="rounded-none border-2 border-base-content/20 px-3 py-2">
					<p class="text-xs font-bold uppercase tracking-[0.2em] opacity-60">{en.experiments.testProbe.valueLabel}</p>
					{#if loading}
						<p class="mt-1 font-bold uppercase tracking-[0.2em]">{en.experiments.testProbe.loading}</p>
					{:else if failed}
						<p class="mt-1 text-error font-bold uppercase tracking-[0.2em]">{en.experiments.testProbe.error}</p>
					{:else}
						<p class="mt-1 font-mono text-xs break-all">{testValue ?? en.experiments.testProbe.notSet}</p>
					{/if}
				</div>
			</div>

			<div class="card-actions justify-end">
				<button class="btn btn-primary tracking-[0.3em]" onclick={probeTest} disabled={loading}>
					{#if loading}
						<span class="loading loading-dots loading-sm"></span>
						{en.experiments.testProbe.loading}
					{:else}
						{en.experiments.testProbe.refreshButton}
					{/if}
				</button>
			</div>
		</div>
	</div>
</div>
