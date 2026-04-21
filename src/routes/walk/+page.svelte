<script lang="ts">
	import { onDestroy } from 'svelte';
	import GachaCard from '$lib/components/GachaCard.svelte';
	import { en } from '$lib/i18n/en';
	import type { WikiArticle } from '$lib/types';
	import {
		FINAL_CARD_DELAY_MS,
		FINAL_CARD_SENTENCES,
		FLASH_FINAL_HOLD_MS,
		FLASH_INTERVAL_MS,
		FLASH_MAX_CYCLES,
		FLASH_MIN_CYCLES,
		MAX_LINK_CONTINUATIONS,
		MAX_NEIGHBOR_POOL,
		SUGGESTION_DEBOUNCE_MS,
		SUGGESTION_LIMIT,
		VISIBLE_NEIGHBOR_COUNT,
		WALK_MAX_HOPS,
		WALK_MIN_HOPS,
		WALK_STEP_DELAY_MS
	} from './lib/constants';
	import { fetchArticleNeighbors, fetchTitleSuggestions, pickRandomSubset } from './lib/walk-api';

	type Phase = 'seed' | 'walking' | 'resolved' | 'error';
	type CytoscapeCore = import('cytoscape').Core;
	type CytoscapeElementDefinition = import('cytoscape').ElementDefinition;

	interface GraphNodeMeta {
		id: string;
		title: string;
		step: number;
	}

	interface GraphEdgeMeta {
		id: string;
		sourceId: string;
		targetId: string;
		step: number;
	}

	const t = en.experiments.walk;

	let phase = $state<Phase>('seed');
	let query = $state('');
	let suggestions = $state<string[]>([]);
	let suggestionsLoading = $state(false);

	let seedTitle = $state('');
	let currentTitle = $state('');
	let walkLength = $state(0);
	let hopNumber = $state(0);
	let statusLabel = $state('');

	let finalArticle = $state<WikiArticle | null>(null);
	let finalLoading = $state(false);
	let errorMessage = $state('');

	let graphNodes = $state<GraphNodeMeta[]>([]);
	let graphEdges = $state<GraphEdgeMeta[]>([]);
	let currentNodeId = $state('');
	let flashingNodeId = $state('');
	let pathNodeIds = $state<string[]>([]);
	let pathEdgeIds = $state<string[]>([]);

	let suggestionTimeout: ReturnType<typeof setTimeout> | null = null;
	let suggestionRequestId = 0;
	let activeWalkId = 0;

	let graphHost = $state<HTMLDivElement | null>(null);
	let cy: CytoscapeCore | null = null;
	let cyInitializing = false;
	const titleToNodeId = new Map<string, string>();
	const edgeIds = new Set<string>();
	let nextNodeId = 1;

	const isPathSettled = $derived(phase === 'resolved');

	$effect(() => {
		if (phase !== 'seed') {
			suggestions = [];
			suggestionsLoading = false;
			return;
		}

		const trimmed = query.trim();
		if (suggestionTimeout) {
			clearTimeout(suggestionTimeout);
			suggestionTimeout = null;
		}

		if (trimmed.length < 2) {
			suggestions = [];
			suggestionsLoading = false;
			return;
		}

		suggestionsLoading = true;
		const requestId = ++suggestionRequestId;

		suggestionTimeout = setTimeout(async () => {
			try {
				const matches = await fetchTitleSuggestions(trimmed, SUGGESTION_LIMIT);
				if (requestId !== suggestionRequestId) return;
				suggestions = matches;
			} catch {
				if (requestId !== suggestionRequestId) return;
				suggestions = [];
			} finally {
				if (requestId === suggestionRequestId) {
					suggestionsLoading = false;
				}
			}
		}, SUGGESTION_DEBOUNCE_MS);

		return () => {
			if (suggestionTimeout) {
				clearTimeout(suggestionTimeout);
				suggestionTimeout = null;
			}
		};
	});

	async function initCytoscape(container: HTMLDivElement): Promise<void> {
		if (cy || cyInitializing) return;
		cyInitializing = true;

		try {
			const cytoscape = (await import('cytoscape')).default;
			if (graphHost !== container) return;

			cy = cytoscape({
				container,
				elements: [],
				style: [
					{
						selector: 'node',
						style: {
							'background-color': '#4a4a4a',
							label: 'data(label)',
							color: '#f5f5f5',
							'font-size': '9px',
							'text-wrap': 'wrap',
							'text-max-width': '110px',
							'text-valign': 'center',
							'text-halign': 'center',
							'text-outline-width': 1,
							'text-outline-color': '#1b1b1b',
							width: 46,
							height: 46,
							'border-width': 2,
							'border-color': '#6a6a6a'
						}
					},
					{
						selector: 'edge',
						style: {
							width: 2,
							'line-color': '#666',
							'curve-style': 'bezier',
							opacity: 0.8
						}
					},
					{
						selector: '.is-current',
						style: {
							'background-color': '#00b4d8',
							'border-color': '#90e0ef',
							'border-width': 3,
							width: 56,
							height: 56,
							'font-size': '10px'
						}
					},
					{
						selector: '.is-flashing',
						style: {
							'background-color': '#fbbf24',
							'border-color': '#fde68a'
						}
					},
					{
						selector: '.is-path',
						style: {
							'background-color': '#22c55e',
							'border-color': '#86efac'
						}
					},
					{
						selector: '.is-path-edge',
						style: {
							width: 4,
							'line-color': '#22c55e',
							opacity: 1
						}
					},
					{
						selector: '.is-active-edge',
						style: {
							width: 3,
							'line-color': '#fbbf24',
							opacity: 1
						}
					}
				],
				layout: { name: 'grid' },
				minZoom: 0.15,
				maxZoom: 2
			});

			rebuildGraph({ animateLayout: true });
			if (phase === 'resolved') {
				focusPath(false);
			} else {
				focusCurrentNode(false);
			}
		} finally {
			cyInitializing = false;
		}
	}

	$effect(() => {
		if (!graphHost) {
			cy?.destroy();
			cy = null;
			return;
		}

		if (!cy) {
			void initCytoscape(graphHost);
		}
	});

	onDestroy(() => {
		cy?.destroy();
		cy = null;
	});

	function randomInt(min: number, max: number): number {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	function pause(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	function shortTitle(title: string): string {
		if (title.length <= 24) return title;
		return `${title.slice(0, 21)}...`;
	}

	function pickTypedOrExactSuggestion(): string {
		const typed = query.trim();
		if (!typed) return '';
		const exact = suggestions.find((s) => s.toLowerCase() === typed.toLowerCase());
		return exact ?? typed;
	}

	function chooseSuggestion(title: string) {
		query = title;
		suggestions = [];
	}

	function ensureNode(title: string, step: number): string {
		const existing = titleToNodeId.get(title);
		if (existing) return existing;

		const id = `n${nextNodeId++}`;
		titleToNodeId.set(title, id);
		graphNodes = [...graphNodes, { id, title, step }];
		return id;
	}

	function ensureEdge(sourceId: string, targetId: string, step: number): string {
		const id = `${sourceId}__${targetId}`;
		if (edgeIds.has(id)) return id;
		edgeIds.add(id);
		graphEdges = [...graphEdges, { id, sourceId, targetId, step }];
		return id;
	}

	function resetGraph(seed: string) {
		titleToNodeId.clear();
		edgeIds.clear();
		nextNodeId = 1;
		graphNodes = [];
		graphEdges = [];
		const seedId = ensureNode(seed, 0);
		currentNodeId = seedId;
		flashingNodeId = '';
		pathNodeIds = [seedId];
		pathEdgeIds = [];
		rebuildGraph({ animateLayout: true, anchorNodeId: seedId, centerCurrentAfterLayout: true });
		focusCurrentNode(false);
	}

	function clearGraph() {
		titleToNodeId.clear();
		edgeIds.clear();
		nextNodeId = 1;
		graphNodes = [];
		graphEdges = [];
		currentNodeId = '';
		flashingNodeId = '';
		pathNodeIds = [];
		pathEdgeIds = [];
		rebuildGraph({ animateLayout: false });
	}

	function rebuildGraph(options?: {
		animateLayout?: boolean;
		anchorNodeId?: string;
		centerCurrentAfterLayout?: boolean;
	}) {
		if (!cy) return;

		const animateLayout = options?.animateLayout ?? true;
		const anchorNodeId = options?.anchorNodeId ?? currentNodeId;
		const centerCurrentAfterLayout = options?.centerCurrentAfterLayout ?? phase === 'walking';
		const priorPositions = new Map<string, { x: number; y: number }>();
		const priorNodeIds = new Set<string>();

		cy.nodes().forEach((node) => {
			priorNodeIds.add(node.id());
			priorPositions.set(node.id(), { ...node.position() });
		});

		const desiredNodeIds = new Set(graphNodes.map((node) => node.id));
		const desiredEdgeIds = new Set(graphEdges.map((edge) => edge.id));

		cy.nodes().forEach((node) => {
			if (!desiredNodeIds.has(node.id())) {
				node.remove();
			}
		});

		cy.edges().forEach((edge) => {
			if (!desiredEdgeIds.has(edge.id())) {
				edge.remove();
			}
		});

		const nodeDefsToAdd: CytoscapeElementDefinition[] = [];
		const edgeDefsToAdd: CytoscapeElementDefinition[] = [];
		const newNodeIds: string[] = [];

		cy.batch(() => {
			for (const node of graphNodes) {
				const existing = cy?.getElementById(node.id);
				if (!existing || existing.empty()) {
					nodeDefsToAdd.push({
						data: {
							id: node.id,
							label: shortTitle(node.title),
							fullLabel: node.title,
							step: node.step
						}
					});
					newNodeIds.push(node.id);
				} else {
					existing.data({
						label: shortTitle(node.title),
						fullLabel: node.title,
						step: node.step
					});
				}
			}

			for (const edge of graphEdges) {
				const existing = cy?.getElementById(edge.id);
				if (!existing || existing.empty()) {
					edgeDefsToAdd.push({
						data: {
							id: edge.id,
							source: edge.sourceId,
							target: edge.targetId,
							step: edge.step
						}
					});
				} else {
					existing.data({ step: edge.step });
				}
			}

			if (nodeDefsToAdd.length > 0) {
				cy?.add(nodeDefsToAdd);
			}
			if (edgeDefsToAdd.length > 0) {
				cy?.add(edgeDefsToAdd);
			}
		});

		const anchorCandidate = anchorNodeId ? priorPositions.get(anchorNodeId) : undefined;
		const firstNode = cy.nodes().first();
		const firstPos = firstNode.nonempty() ? firstNode.position() : undefined;
		const anchorPos: { x: number; y: number } = anchorCandidate ?? firstPos ?? { x: 0, y: 0 };

		cy.nodes().forEach((node) => {
			const previous = priorPositions.get(node.id());
			if (previous) {
				node.position(previous);
				node.style('opacity', 1);
				return;
			}

			// Spawn new nodes near the current anchor so expansion transitions feel continuous.
			const angle = Math.random() * Math.PI * 2;
			const radius = 42 + Math.random() * 26;
			node.position({
				x: anchorPos.x + Math.cos(angle) * radius,
				y: anchorPos.y + Math.sin(angle) * radius
			});
			node.style('opacity', 0.25);
		});

		for (const nodeId of newNodeIds) {
			const node = cy.getElementById(nodeId);
			if (!node.empty()) {
				node.animate({ style: { opacity: 1 }, duration: animateLayout ? 320 : 120 });
			}
		}

		// Keep existing graph stable: only new nodes participate in expansion layout.
		for (const nodeId of priorNodeIds) {
			const node = cy.getElementById(nodeId);
			if (!node.empty()) {
				node.lock();
			}
		}

		cy.layout({
			name: 'cose',
			animate: animateLayout,
			animationDuration: animateLayout ? 420 : 0,
			randomize: false,
			fit: false,
			padding: 60,
			nodeRepulsion: 2600,
			edgeElasticity: 100,
			idealEdgeLength: 100,
			gravity: 0.4,
			numIter: 220
		}).run();

		if (animateLayout) {
			cy.one('layoutstop', () => {
				cy?.nodes().unlock();
				refreshGraphClasses();
				if (phase === 'resolved') {
					focusPath(false);
				} else if (centerCurrentAfterLayout) {
					focusCurrentNode(true);
				}
			});
		} else {
			cy.nodes().unlock();
		}

		refreshGraphClasses();
	}

	function refreshGraphClasses() {
		if (!cy) return;

		const pathNodeSet = new Set(pathNodeIds);
		const pathEdgeSet = new Set(pathEdgeIds);

		cy.nodes().forEach((node) => {
			node.removeClass('is-current is-flashing is-path');
			if (node.id() === currentNodeId) node.addClass('is-current');
			if (node.id() === flashingNodeId) node.addClass('is-flashing');
			if (isPathSettled && pathNodeSet.has(node.id())) node.addClass('is-path');
		});

		cy.edges().forEach((edge) => {
			edge.removeClass('is-path-edge is-active-edge');
			if (isPathSettled && pathEdgeSet.has(edge.id())) edge.addClass('is-path-edge');
			if (!isPathSettled && pathEdgeSet.has(edge.id())) edge.addClass('is-active-edge');
		});
	}

	function focusCurrentNode(animated = true) {
		if (!cy || !currentNodeId) return;
		const node = cy.getElementById(currentNodeId);
		if (node.empty()) return;

		if (animated) {
			cy.animate({
				center: { eles: node },
				duration: 220
			});
		} else {
			cy.center(node);
		}
	}

	function focusPath(animated = true) {
		if (!cy || pathNodeIds.length === 0) return;
		const selector = pathNodeIds.map((id) => `#${id}`).join(',');
		const selectorEdges = pathEdgeIds.map((id) => `#${id}`).join(',');
		const eles = cy.$(`${selector}${selectorEdges ? `,${selectorEdges}` : ''}`);
		if (eles.empty()) return;

		if (animated) {
			cy.animate({
				fit: { eles, padding: 80 },
				duration: 420
			});
		} else {
			cy.fit(eles, 80);
		}
	}

	function useNewSeed() {
		activeWalkId += 1;
		phase = 'seed';
		query = '';
		suggestions = [];
		suggestionsLoading = false;
		seedTitle = '';
		currentTitle = '';
		walkLength = 0;
		hopNumber = 0;
		statusLabel = '';
		finalArticle = null;
		finalLoading = false;
		errorMessage = '';
		clearGraph();
	}

	async function fetchFinalCard(title: string, walkId: number): Promise<boolean> {
		finalLoading = true;
		finalArticle = null;
		errorMessage = '';

		try {
			const params = new URLSearchParams({
				titles: title,
				sentences: String(FINAL_CARD_SENTENCES)
			});
			const res = await fetch(`/api/pull?${params.toString()}`);
			if (!res.ok) throw new Error();

			const articles = (await res.json()) as WikiArticle[];
			if (walkId !== activeWalkId) return false;
			finalArticle = articles[0] ?? null;

			if (!finalArticle) {
				errorMessage = t.finalEmpty;
			}
			return true;
		} catch {
			if (walkId !== activeWalkId) return false;
			errorMessage = t.fetchError;
			phase = 'error';
			return false;
		} finally {
			if (walkId === activeWalkId) {
				finalLoading = false;
			}
		}
	}

	async function startWalk(seedInput: string): Promise<void> {
		const seed = seedInput.trim();
		if (!seed) return;

		const walkId = ++activeWalkId;
		phase = 'walking';
		query = seed;
		suggestions = [];
		suggestionsLoading = false;
		seedTitle = seed;
		currentTitle = seed;
		walkLength = randomInt(WALK_MIN_HOPS, WALK_MAX_HOPS);
		hopNumber = 0;
		statusLabel = t.selectionLabel;
		finalArticle = null;
		finalLoading = false;
		errorMessage = '';

		resetGraph(seed);

		let walkTitle = seed;

		for (let step = 1; step <= walkLength; step += 1) {
			if (walkId !== activeWalkId) return;
			hopNumber = step;

			let neighborsResult;
			try {
				neighborsResult = await fetchArticleNeighbors(
					walkTitle,
					MAX_NEIGHBOR_POOL,
					MAX_LINK_CONTINUATIONS
				);
			} catch {
				if (walkId !== activeWalkId) return;
				errorMessage = t.fetchError;
				phase = 'error';
				return;
			}

			if (walkId !== activeWalkId) return;
			walkTitle = neighborsResult.resolvedTitle;
			currentTitle = walkTitle;
			currentNodeId = ensureNode(walkTitle, step);

			if (step === 1 && pathNodeIds.length === 1 && pathNodeIds[0] !== currentNodeId) {
				pathNodeIds = [currentNodeId];
			}

			const subset = pickRandomSubset(neighborsResult.neighbors, VISIBLE_NEIGHBOR_COUNT);
			const subsetNodeIds = subset.map((neighbor) => ensureNode(neighbor, step));
			for (const neighborId of subsetNodeIds) {
				ensureEdge(currentNodeId, neighborId, step);
			}

			rebuildGraph({ animateLayout: true, anchorNodeId: currentNodeId, centerCurrentAfterLayout: true });

			if (subset.length === 0) {
				statusLabel = t.noNeighbors;
				break;
			}

			const chosenIndex = randomInt(0, subset.length - 1);
			const cycles = randomInt(FLASH_MIN_CYCLES, FLASH_MAX_CYCLES);
			const flashSteps = cycles * subset.length;
			statusLabel = t.selectionLabel;

			for (let i = 0; i < flashSteps; i += 1) {
				if (walkId !== activeWalkId) return;
				flashingNodeId = subsetNodeIds[i % subsetNodeIds.length];
				refreshGraphClasses();
				await pause(FLASH_INTERVAL_MS);
			}

			if (walkId !== activeWalkId) return;
			const chosenTitle = subset[chosenIndex];
			const chosenNodeId = subsetNodeIds[chosenIndex];
			flashingNodeId = chosenNodeId;
			refreshGraphClasses();
			await pause(FLASH_FINAL_HOLD_MS);
			if (walkId !== activeWalkId) return;

			const pathEdge = ensureEdge(currentNodeId, chosenNodeId, step);
			pathEdgeIds = [...pathEdgeIds, pathEdge];
			pathNodeIds = [...pathNodeIds, chosenNodeId];
			walkTitle = chosenTitle;
			currentTitle = walkTitle;
			currentNodeId = chosenNodeId;
			flashingNodeId = '';
			refreshGraphClasses();
			focusCurrentNode(true);
			await pause(WALK_STEP_DELAY_MS);
		}

		if (walkId !== activeWalkId) return;
		statusLabel = t.settledLabel;
		flashingNodeId = '';
		refreshGraphClasses();
		await pause(FINAL_CARD_DELAY_MS);
		if (walkId !== activeWalkId) return;

		const finalFetchSucceeded = await fetchFinalCard(currentTitle, walkId);
		if (walkId !== activeWalkId) return;
		if (!finalFetchSucceeded) return;

		phase = 'resolved';
		refreshGraphClasses();
		focusPath(true);
	}

	function onSubmitSeed(event: SubmitEvent) {
		event.preventDefault();
		const title = pickTypedOrExactSuggestion();
		if (!title) return;
		void startWalk(title);
	}
</script>

<div class="flex min-h-0 flex-1 flex-col overflow-y-auto bg-base-200 p-4">
	{#if phase === 'seed'}
		<div class="mx-auto flex w-full max-w-3xl flex-col gap-4">
			<div class="border-2 border-base-content/20 bg-base-100 p-4">
				<p class="text-xs tracking-widest uppercase opacity-70">{t.seedPrompt}</p>
			</div>

			<form class="flex flex-col gap-3" onsubmit={onSubmitSeed}>
				<label class="text-xs font-bold tracking-widest uppercase" for="walk-seed-input">
					{t.inputLabel}
				</label>
				<div class="flex flex-col gap-2 sm:flex-row">
					<input
						id="walk-seed-input"
						type="text"
						class="input w-full border-2 border-base-content/20 bg-base-100"
						bind:value={query}
						placeholder={t.inputPlaceholder}
						autocomplete="off"
					/>
					<button
						type="submit"
						class="btn border-2 border-base-content/20 tracking-[0.18em] uppercase btn-primary"
						disabled={query.trim().length === 0}
					>
						{t.startButton}
					</button>
				</div>
			</form>

			<div class="border-2 border-base-content/20 bg-base-100 p-3">
				<div class="mb-2 flex items-center justify-between gap-2">
					<p class="text-[11px] font-bold tracking-widest uppercase">{t.suggestionsHeading}</p>
					{#if suggestionsLoading}
						<span class="text-[10px] tracking-wider uppercase opacity-60">{t.suggestionsLoading}</span>
					{/if}
				</div>

				{#if suggestions.length > 0}
					<ul class="menu max-h-60 gap-1 overflow-y-auto p-0">
						{#each suggestions as suggestion}
							<li>
								<button
									type="button"
									class="btn btn-ghost w-full justify-start border-2 border-base-content/10 font-normal normal-case"
									onclick={() => chooseSuggestion(suggestion)}
								>
									{suggestion}
								</button>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-xs tracking-wide opacity-60">
						{query.trim().length >= 2 && !suggestionsLoading ? t.suggestionsEmpty : t.pickHint}
					</p>
				{/if}
			</div>
		</div>
	{:else}
		<div class="mx-auto flex w-full max-w-6xl flex-col gap-4">
			<div class="grid gap-3 md:grid-cols-3">
				<div class="border-2 border-base-content/20 bg-base-100 p-3">
					<p class="text-[10px] tracking-widest uppercase opacity-60">{t.seedLabel}</p>
					<p class="mt-1 text-sm font-bold tracking-wide">{seedTitle}</p>
				</div>
				<div class="border-2 border-base-content/20 bg-base-100 p-3">
					<p class="text-[10px] tracking-widest uppercase opacity-60">{t.hopLabel}</p>
					<p class="mt-1 text-sm font-bold tracking-wide">
						{hopNumber} {t.ofLabel} {walkLength}
					</p>
				</div>
				<div class="border-2 border-base-content/20 bg-base-100 p-3">
					<p class="text-[10px] tracking-widest uppercase opacity-60">
						{phase === 'walking' ? t.runningLabel : t.finalHeading}
					</p>
					<p class="mt-1 text-sm font-bold tracking-wide">{statusLabel}</p>
				</div>
			</div>

			<div class="border-2 border-base-content/20 bg-base-100 p-4">
				<p class="mb-3 text-[10px] tracking-widest uppercase opacity-60">{t.graphLabel}</p>
				<div class="relative overflow-hidden border-2 border-base-content/20 bg-base-200">
					<div bind:this={graphHost} class="h-[26rem] w-full"></div>
					{#if graphNodes.length === 0}
						<div class="absolute inset-0 flex items-center justify-center p-4">
							<p class="text-xs tracking-wide opacity-60">{t.pathHint}</p>
						</div>
					{/if}
				</div>
				<p class="mt-3 text-xs opacity-60">
					{isPathSettled ? t.pathHint : t.currentLabel}: {currentTitle}
				</p>
			</div>

			{#if phase === 'error'}
				<p class="border-2 border-error px-3 py-2 text-sm text-error-content bg-error/80">{errorMessage}</p>
			{/if}

			{#if finalLoading}
				<p class="text-sm font-bold tracking-wide uppercase">{t.finalLoading}</p>
			{:else if finalArticle}
				<div class="w-full max-w-md">
					<GachaCard
						article={finalArticle}
						flippable={false}
						articleLinkMode="separate"
						wikiLinkLabel={t.wikiLinkLabel}
					/>
				</div>
			{:else if errorMessage}
				<p class="text-sm opacity-80">{errorMessage}</p>
			{/if}

			<div class="flex flex-col gap-2 sm:flex-row">
				<button
					type="button"
					class="btn border-2 border-base-content/20 tracking-widest uppercase btn-outline"
					onclick={useNewSeed}
				>
					{t.chooseNewSeed}
				</button>
			</div>
		</div>
	{/if}
</div>
