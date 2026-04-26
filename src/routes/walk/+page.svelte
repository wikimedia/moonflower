<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
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
	import { saveKeptIfNew } from './lib/collection';
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

	interface GraphPoint {
		x: number;
		y: number;
	}

	const t = en.experiments.walk;
	const WALK_INTRO_DISMISSED_KEY = 'moonflower-walk-intro-v1';

	let phase = $state<Phase>('seed');
	let query = $state('');
	let suggestions = $state<string[]>([]);
	let suggestionsLoading = $state(false);
	let showIntroModal = $state(false);

	let seedTitle = $state('');
	let currentTitle = $state('');
	let walkLength = $state(0);
	let statusLabel = $state('');

	let finalArticle = $state<WikiArticle | null>(null);
	let finalLoading = $state(false);
	let showFinalModal = $state(false);
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
	const nodePositions = new Map<string, GraphPoint>();
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
							'font-size': '10px',
							'min-zoomed-font-size': 8,
							'text-wrap': 'wrap',
							'text-max-width': '120px',
							'text-valign': 'bottom',
							'text-halign': 'center',
							'text-margin-y': 12,
							'text-outline-width': 0,
							'text-background-color': '#1b1b1b',
							'text-background-opacity': 0.9,
							'text-background-padding': '3px',
							'text-background-shape': 'roundrectangle',
							width: 54,
							height: 54,
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
							width: 66,
							height: 66,
							'font-size': '11px'
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
				layout: { name: 'preset' },
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

	onMount(() => {
		try {
			showIntroModal = localStorage.getItem(WALK_INTRO_DISMISSED_KEY) !== '1';
		} catch {
			showIntroModal = true;
		}
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
		nodePositions.clear();
		nextNodeId = 1;
		graphNodes = [];
		graphEdges = [];
		const seedId = ensureNode(seed, 0);
		nodePositions.set(seedId, { x: 0, y: 0 });
		currentNodeId = seedId;
		flashingNodeId = '';
		pathNodeIds = [seedId];
		pathEdgeIds = [];
		rebuildGraph({ animateLayout: false, anchorNodeId: seedId });
		cy?.zoom(1);
		focusCurrentNode(false);
	}

	function clearGraph() {
		titleToNodeId.clear();
		edgeIds.clear();
		nodePositions.clear();
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
		spawnedNodeIds?: string[];
	}) {
		if (!cy) return;

		const animateLayout = options?.animateLayout ?? true;
		const anchorNodeId = options?.anchorNodeId ?? currentNodeId;
		const priorPositions = new Map<string, { x: number; y: number }>();

		cy.nodes().forEach((node) => {
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
		assignSpawnPositions(anchorNodeId, options?.spawnedNodeIds ?? [], anchorPos);

		cy.nodes().forEach((node) => {
			const previous = priorPositions.get(node.id());
			const targetPos = nodePositions.get(node.id()) ?? anchorPos;
			if (previous) {
				node.position(targetPos);
				node.style('opacity', 1);
				return;
			}

			if (animateLayout) {
				node.position(anchorPos);
				node.style('opacity', 0.25);
				node.animate({
					position: targetPos,
					style: { opacity: 1 },
					duration: 380,
					easing: 'ease-out-cubic'
				});
				return;
			}

			node.position(targetPos);
			node.style('opacity', 1);
		});

		refreshGraphClasses();
	}

	function getGrowthDirection(anchorNodeId: string, fallback: GraphPoint): GraphPoint {
		const pathIndex = pathNodeIds.lastIndexOf(anchorNodeId);
		if (pathIndex > 0) {
			const previousPos = nodePositions.get(pathNodeIds[pathIndex - 1]);
			const anchorPos = nodePositions.get(anchorNodeId);
			if (previousPos && anchorPos) {
				const dx = anchorPos.x - previousPos.x;
				const dy = anchorPos.y - previousPos.y;
				const magnitude = Math.hypot(dx, dy);
				if (magnitude > 0) {
					return { x: dx / magnitude, y: dy / magnitude };
				}
			}
		}

		const magnitude = Math.hypot(fallback.x, fallback.y);
		if (magnitude > 0) {
			return { x: fallback.x / magnitude, y: fallback.y / magnitude };
		}

		return { x: 0, y: -1 };
	}

	function avoidNodeOverlap(candidate: GraphPoint, anchorPos: GraphPoint, anchorNodeId: string): GraphPoint {
		let position = candidate;
		for (let attempt = 0; attempt < 8; attempt += 1) {
			const overlap = Array.from(nodePositions.entries()).find(([nodeId, point]) => {
				if (nodeId === anchorNodeId) return false;
				return Math.hypot(position.x - point.x, position.y - point.y) < 72;
			});

			if (!overlap) {
				return position;
			}

			const dx = position.x - anchorPos.x;
			const dy = position.y - anchorPos.y;
			position = {
				x: anchorPos.x + dx * 1.18,
				y: anchorPos.y + dy * 1.18
			};
		}

		return position;
	}

	function assignSpawnPositions(
		anchorNodeId: string,
		spawnedNodeIds: string[],
		fallbackAnchorPos: GraphPoint
	) {
		if (!anchorNodeId || spawnedNodeIds.length === 0) return;

		const anchorPos = nodePositions.get(anchorNodeId) ?? fallbackAnchorPos;
		nodePositions.set(anchorNodeId, anchorPos);

		const growthDirection = getGrowthDirection(anchorNodeId, { x: 0, y: -1 });
		const baseAngle = Math.atan2(growthDirection.y, growthDirection.x);
		const count = spawnedNodeIds.length;
		const spread = count === 1 ? 0 : Math.min(Math.PI * 0.95, Math.max(Math.PI * 0.55, (count - 1) * 0.34));
		const startAngle = baseAngle - spread / 2;
		const stepAngle = count > 1 ? spread / (count - 1) : 0;

		spawnedNodeIds.forEach((nodeId, index) => {
			if (nodePositions.has(nodeId)) return;

			const ring = Math.floor(index / 3);
			const radius = 140 + ring * 26;
			const angle = startAngle + stepAngle * index;
			const target = avoidNodeOverlap(
				{
					x: anchorPos.x + Math.cos(angle) * radius,
					y: anchorPos.y + Math.sin(angle) * radius
				},
				anchorPos,
				anchorNodeId
			);

			nodePositions.set(nodeId, target);
		});
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
		const graph = cy;
		const node = graph.getElementById(currentNodeId);
		if (node.empty()) return;
		const childNodeIds = Array.from(
			new Set(
				graphEdges
					.filter((edge) => edge.sourceId === currentNodeId)
					.map((edge) => edge.targetId)
			)
		);
		const clusterNodeIds = [currentNodeId, ...childNodeIds];
		const shouldFitCluster = childNodeIds.length > 0;
		const padding = graph.width() < 480 ? 48 : 64;
		const minReadableZoom = graph.width() < 480 ? 0.78 : 1;
		const clusterPoints = clusterNodeIds
			.map((id) => nodePositions.get(id) ?? graph.getElementById(id).position())
			.filter((point): point is GraphPoint => point !== undefined);
		const clusterBounds =
			shouldFitCluster && clusterPoints.length > 0
				? clusterPoints.reduce(
					(bounds, point) => ({
						minX: Math.min(bounds.minX, point.x),
						maxX: Math.max(bounds.maxX, point.x),
						minY: Math.min(bounds.minY, point.y),
						maxY: Math.max(bounds.maxY, point.y)
					}),
					{ minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
				)
				: null;
		const clusterWidth = clusterBounds ? clusterBounds.maxX - clusterBounds.minX + 120 : 0;
		const clusterHeight = clusterBounds ? clusterBounds.maxY - clusterBounds.minY + 110 : 0;
		const clusterCenter = clusterBounds
			? {
					x: (clusterBounds.minX + clusterBounds.maxX) / 2,
					y: (clusterBounds.minY + clusterBounds.maxY) / 2 + 12
			  }
			: null;
		const availableWidth = Math.max(graph.width() - padding * 2, 1);
		const availableHeight = Math.max(graph.height() - padding * 2, 1);
		const requiredZoom = clusterBounds
			? Math.min(
				availableWidth / Math.max(clusterWidth, 1),
				availableHeight / Math.max(clusterHeight, 1),
				graph.maxZoom()
			)
			: graph.zoom();
		const targetZoom = Math.max(requiredZoom, graph.minZoom(), minReadableZoom);
		const shouldAdjustZoom = shouldFitCluster && Math.abs(targetZoom - graph.zoom()) > 0.08;
		const resolvedZoom = shouldAdjustZoom ? targetZoom : graph.zoom();
		const targetPan = clusterCenter
			? {
					x: graph.width() / 2 - clusterCenter.x * resolvedZoom,
					y: graph.height() / 2 - clusterCenter.y * resolvedZoom
			  }
			: null;

		if (shouldFitCluster && animated) {
			if (shouldAdjustZoom && targetPan) {
				graph.animate({
					pan: targetPan,
					zoom: targetZoom,
					duration: 420,
					easing: 'ease-in-out-cubic'
				});
			} else if (targetPan) {
				graph.animate({
					pan: targetPan,
					duration: 420,
					easing: 'ease-in-out-cubic'
				});
			}
		} else if (shouldFitCluster) {
			if (shouldAdjustZoom) {
				graph.zoom(targetZoom);
			}
			if (targetPan) {
				graph.pan(targetPan);
			}
		} else if (animated) {
			graph.animate({
				center: { eles: node },
				duration: 320,
				easing: 'ease-in-out-cubic'
			});
		} else {
			graph.center(node);
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
		statusLabel = '';
		finalArticle = null;
		finalLoading = false;
		showFinalModal = false;
		errorMessage = '';
		clearGraph();
	}

	function addFinalToCollection() {
		if (finalArticle) {
			saveKeptIfNew(finalArticle);
		}
		showFinalModal = false;
	}

	function dismissIntroModal() {
		showIntroModal = false;
		try {
			localStorage.setItem(WALK_INTRO_DISMISSED_KEY, '1');
		} catch {
			// Ignore storage failures and just hide the intro for this session.
		}
	}

	async function fetchFinalCard(title: string, walkId: number): Promise<boolean> {
		finalLoading = true;
		finalArticle = null;
		showFinalModal = false;
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
		statusLabel = t.selectionLabel;
		finalArticle = null;
		finalLoading = false;
		showFinalModal = false;
		errorMessage = '';

		resetGraph(seed);
		console.log('[walk] seed', seed);

		let walkTitle = seed;
		const visitedTitles = new Set<string>([seed]);

		for (let step = 1; step <= walkLength; step += 1) {
			if (walkId !== activeWalkId) return;

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
			visitedTitles.add(walkTitle);

			if (step === 1 && pathNodeIds.length === 1 && pathNodeIds[0] !== currentNodeId) {
				pathNodeIds = [currentNodeId];
			}

			const unvisitedNeighbors = neighborsResult.neighbors.filter(
				(neighbor) => !visitedTitles.has(neighbor)
			);
			const subset = pickRandomSubset(unvisitedNeighbors, VISIBLE_NEIGHBOR_COUNT);
			const subsetNodeIds = subset.map((neighbor) => ensureNode(neighbor, step));
			for (const neighborId of subsetNodeIds) {
				ensureEdge(currentNodeId, neighborId, step);
			}

			rebuildGraph({
				animateLayout: true,
				anchorNodeId: currentNodeId,
				spawnedNodeIds: subsetNodeIds
			});
			focusCurrentNode(true);

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
			visitedTitles.add(chosenTitle);
			console.log('[walk] picked', { step, title: chosenTitle });
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
		showFinalModal = finalArticle !== null;
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
			{#if showIntroModal}
				<div class="fixed inset-0 z-40 grid place-items-center bg-base-100/55 px-3 backdrop-blur-sm">
					<div class="w-full max-w-md border-2 border-base-content bg-base-100 p-4 shadow-2xl">
						<div class="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] opacity-70">
							{t.introTitle}
						</div>
						<p class="mb-4 text-sm leading-relaxed opacity-85">
							{t.introBody}
						</p>
						<button
							type="button"
							onclick={dismissIntroModal}
							class="btn btn-primary w-full uppercase tracking-[0.2em]"
						>
							{t.introDismiss}
						</button>
					</div>
				</div>
			{/if}

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
						{#each suggestions as suggestion (suggestion)}
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
			<div class="border-2 border-base-content/20 bg-base-100 p-3">
				<p class="text-[10px] tracking-widest uppercase opacity-60">{t.seedLabel}</p>
				<p class="mt-1 text-sm font-bold tracking-wide">{seedTitle}</p>
			</div>

			<div class="border-2 border-base-content/20 bg-base-100 p-4">
				<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
					<p class="text-[10px] tracking-widest uppercase opacity-60">{t.graphLabel}</p>
					<p class="text-[10px] font-bold tracking-widest uppercase opacity-60">{statusLabel}</p>
				</div>
				<div class="relative overflow-hidden border-2 border-base-content/20 bg-base-200">
					<div bind:this={graphHost} class="h-[34rem] w-full sm:h-[40rem]"></div>
					{#if graphNodes.length === 0}
						<div class="absolute inset-0 flex items-center justify-center p-4">
							<p class="text-xs tracking-wide opacity-60">{t.pathHint}</p>
						</div>
					{/if}
				</div>
				<p class="mt-3 text-xs opacity-60">
					{isPathSettled ? t.pathHint : t.currentLabel}: {currentTitle}
				</p>
				{#if finalLoading}
					<p class="mt-2 text-xs font-bold tracking-wide uppercase opacity-70">{t.finalLoading}</p>
				{/if}
			</div>

			{#if phase === 'error'}
				<p class="border-2 border-error px-3 py-2 text-sm text-error-content bg-error/80">{errorMessage}</p>
			{/if}

			{#if !finalLoading && !finalArticle && errorMessage}
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

{#if showFinalModal && finalArticle}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-neutral/80 p-4" role="presentation">
		<div class="w-full max-w-md" role="presentation">
			<GachaCard
				article={finalArticle}
				flippable={false}
				articleLinkMode="separate"
				wikiLinkLabel={t.wikiLinkLabel}
			>
				{#snippet actions()}
					<button
						type="button"
						class="btn w-full border-2 border-base-content/20 font-bold tracking-widest uppercase btn-primary"
						onclick={addFinalToCollection}
					>
						{t.addToCollection}
					</button>
				{/snippet}
			</GachaCard>
		</div>
	</div>
{/if}
