<script lang="ts">
	import { en } from '$lib/i18n/en';

	const iframeSrc = '/maryyann/different-themes/index.html';
</script>

<div class="flex min-h-0 flex-1 flex-col">
	<iframe
		class="h-[calc(100dvh-3.5rem)] w-full flex-1 border-0"
		title={en.experiments.differentThemes.iframeTitle}
		src={iframeSrc}
	></iframe>
</div>
