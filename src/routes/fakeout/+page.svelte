<script lang="ts">
	import { resolve } from '$app/paths';
	import { en } from '$lib/i18n/en';
</script>

<div class="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-3xl flex-col items-center justify-center gap-6 px-4 py-10">
	<a href={resolve('/fakeout/deal')} class="btn btn-primary btn-lg w-full max-w-sm tracking-[0.3em]">
		{en.experiments.fakeout.dealButton}
	</a>
	<a href={resolve('/fakeout/collection')} class="btn btn-neutral btn-lg w-full max-w-sm tracking-[0.3em]">
		{en.experiments.fakeout.collectionButton}
	</a>
</div>
