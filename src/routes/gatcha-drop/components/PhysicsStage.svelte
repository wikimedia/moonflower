<script lang="ts">
	import { untrack } from 'svelte';
	import Matter from 'matter-js';
	import {
		SPAWN_STAGGER_MS_MAX,
		SPAWN_STAGGER_MS_MIN,
		WALL_THICKNESS
	} from '../../../../maryyann/gatcha-drop/physics-config';
	import {
		createArticleBody,
		getArticlePlugin,
		initialAngularVelocity,
		initialDownwardVelocity,
		randomSpawnX
	} from '../../../../maryyann/gatcha-drop/spawn';
	import type { DropArticle } from '../../../../maryyann/gatcha-drop/types';
	import {
		playFirstDropGlassAmbient,
		stopGlassDropSound
	} from '../../../../maryyann/gatcha-drop/glass-clink';

	interface Props {
		dropArticles: DropArticle[];
		simulationsRunning: boolean;
		inputEnabled: boolean;
		collectedPageIds: readonly number[];
		onTapArticle: (pageId: number) => void;
	}

	let { dropArticles, simulationsRunning, inputEnabled, collectedPageIds, onTapArticle }: Props =
		$props();

	let containerEl = $state<HTMLDivElement | null>(null);
	let canvasEl = $state<HTMLCanvasElement | null>(null);

	let worldW = $state(320);
	let worldH = $state(480);
	let dpr = $state(1);

	/** Raw: Matter mutates `engine.world` every tick; a reactive proxy would re-fire `$effect`s that read `engine`. */
	let engine = $state.raw<Matter.Engine | null>(null);
	let runner: Matter.Runner | null = null;
	let wallBodies: Matter.Body[] = [];
	let afterUpdateHandler: (() => void) | null = null;
	let spawnTimeouts: number[] = [];
	let ro: ResizeObserver | null = null;

	let pointerDown: { lx: number; ly: number; t: number } | null = null;
	let pointerDragged = false;

	const images: Record<number, HTMLImageElement> = {};

	/** After the drop sound starts, stop it once every chip is at rest (debounced). */
	let monitorGlassSettle = false;
	let settleStableFrames = 0;
	const SETTLE_FRAMES_NEEDED = 20;

	function articleBodies(eng: Matter.Engine): Matter.Body[] {
		return Matter.Composite.allBodies(eng.world).filter(
			(b: Matter.Body) => !b.isStatic && getArticlePlugin(b)
		);
	}

	function bodySettled(b: Matter.Body): boolean {
		return (
			b.isSleeping || (b.speed < 0.12 && Math.abs(b.angularSpeed) < 0.04)
		);
	}

	function tickGlassSettleIfNeeded(eng: Matter.Engine) {
		if (!monitorGlassSettle) return;
		const articles = articleBodies(eng);
		if (articles.length === 0) {
			stopGlassDropSound();
			monitorGlassSettle = false;
			settleStableFrames = 0;
			return;
		}
		if (articles.every(bodySettled)) {
			settleStableFrames++;
			if (settleStableFrames >= SETTLE_FRAMES_NEEDED) {
				stopGlassDropSound();
				monitorGlassSettle = false;
				settleStableFrames = 0;
			}
		} else {
			settleStableFrames = 0;
		}
	}

	function clientToLocal(clientX: number, clientY: number, rect: DOMRect) {
		return { lx: clientX - rect.left, ly: clientY - rect.top };
	}

	function makeWalls(w: number, h: number): Matter.Body[] {
		const t = WALL_THICKNESS;
		const floor = Matter.Bodies.rectangle(w / 2, h + t / 2, w + t * 6, t, {
			isStatic: true,
			label: 'wall-floor'
		});
		const left = Matter.Bodies.rectangle(-t / 2, h / 2, t, h * 2 + t * 4, {
			isStatic: true,
			label: 'wall-left'
		});
		const right = Matter.Bodies.rectangle(w + t / 2, h / 2, t, h * 2 + t * 4, {
			isStatic: true,
			label: 'wall-right'
		});
		return [floor, left, right];
	}

	function ensureImage(a: DropArticle) {
		if (images[a.pageId]) return;
		const img = new Image();
		img.onload = () => untrack(() => drawFrame());
		img.onerror = () => untrack(() => drawFrame());
		if (a.thumbnail) img.src = a.thumbnail;
		images[a.pageId] = img;
	}

	function drawFrame() {
		const eng = engine;
		if (!eng || !canvasEl) return;
		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;

		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		for (const body of Matter.Composite.allBodies(eng.world)) {
			const plug = getArticlePlugin(body);
			if (!plug || body.isStatic) continue;
			const img = images[plug.pageId];
			if (!img?.complete || img.naturalWidth === 0) continue;

			const { displayWidth: dw, displayHeight: dh } = plug;
			ctx.save();
			ctx.translate(body.position.x, body.position.y);
			ctx.rotate(body.angle);
			ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);

			ctx.restore();
		}
	}

	function pickArticleAtWorld(wx: number, wy: number): number | null {
		const eng = engine;
		if (!eng) return null;
		// Query.point expects Body[], not Composite — passing world breaks the length loop (always zero hits).
		const hits = Matter.Query.point(Matter.Composite.allBodies(eng.world), { x: wx, y: wy });
		const articleBodies: Matter.Body[] = [];
		for (const b of hits) {
			if (!b.isStatic && getArticlePlugin(b)) articleBodies.push(b);
		}
		if (articleBodies.length === 0) return null;
		let bestId: number | null = null;
		let bestD = Infinity;
		for (const body of articleBodies) {
			const plug = getArticlePlugin(body)!;
			const d = Math.hypot(body.position.x - wx, body.position.y - wy);
			if (d < bestD) {
				bestD = d;
				bestId = plug.pageId;
			}
		}
		return bestId;
	}

	function clearSpawnTimeouts() {
		for (const t of spawnTimeouts) clearTimeout(t);
		spawnTimeouts = [];
	}

	function rebuildWalls(eng: Matter.Engine) {
		for (const w of wallBodies) {
			Matter.Composite.remove(eng.world, w);
		}
		wallBodies = makeWalls(worldW, worldH);
		Matter.World.add(eng.world, wallBodies);
	}

	function resizeFromContainer(eng: Matter.Engine) {
		if (!containerEl || !canvasEl) return;
		const w = Math.max(200, containerEl.clientWidth);
		const h = Math.max(240, containerEl.clientHeight);
		worldW = w;
		worldH = h;
		dpr = Math.min(2.5, window.devicePixelRatio || 1);
		canvasEl.width = Math.floor(w * dpr);
		canvasEl.height = Math.floor(h * dpr);
		canvasEl.style.width = `${w}px`;
		canvasEl.style.height = `${h}px`;
		rebuildWalls(eng);
		untrack(() => drawFrame());
	}

	function onPointerDown(e: PointerEvent) {
		if (!containerEl || e.button !== 0) return;
		const rect = containerEl.getBoundingClientRect();
		const local = clientToLocal(e.clientX, e.clientY, rect);
		pointerDown = { lx: local.lx, ly: local.ly, t: performance.now() };
		pointerDragged = false;
		try {
			containerEl.setPointerCapture(e.pointerId);
		} catch {
			/* ignore */
		}
	}

	function onPointerMove(e: PointerEvent) {
		if (!containerEl || !pointerDown) return;
		const rect = containerEl.getBoundingClientRect();
		const local = clientToLocal(e.clientX, e.clientY, rect);
		if (Math.hypot(local.lx - pointerDown.lx, local.ly - pointerDown.ly) > 12) {
			pointerDragged = true;
		}
	}

	function onPointerUp(e: PointerEvent) {
		if (!containerEl || !engine) return;
		const rect = containerEl.getBoundingClientRect();
		const local = clientToLocal(e.clientX, e.clientY, rect);

		try {
			containerEl.releasePointerCapture(e.pointerId);
		} catch {
			/* ignore */
		}

		const down = pointerDown;
		pointerDown = null;
		if (!down) return;

		const elapsed = performance.now() - down.t;
		const moved = Math.hypot(local.lx - down.lx, local.ly - down.ly);

		if (!inputEnabled || !simulationsRunning) return;
		if (pointerDragged || moved > 22 || elapsed > 700) return;

		const pageId = pickArticleAtWorld(local.lx, local.ly);
		if (pageId != null) onTapArticle(pageId);
	}

	$effect(() => {
		const eng = engine;
		const ids = collectedPageIds;
		if (!eng || ids.length === 0) return;

		const remove = new Set(ids);
		for (const b of Matter.Composite.allBodies(eng.world)) {
			if (b.isStatic) continue;
			const plug = getArticlePlugin(b);
			if (!plug || !remove.has(plug.pageId)) continue;
			Matter.Composite.remove(eng.world, b);
			delete images[plug.pageId];
		}
		// Neighbors stay asleep when a body is removed — wake so the pile can settle.
		for (const b of Matter.Composite.allBodies(eng.world)) {
			if (b.isStatic) continue;
			if (!getArticlePlugin(b)) continue;
			Matter.Sleeping.set(b, false);
		}
		untrack(() => drawFrame());
	});

	$effect(() => {
		const eng = engine;
		const run = simulationsRunning;
		if (!eng || !runner) return;
		Matter.Runner.stop(runner);
		if (run) Matter.Runner.run(runner, eng);
	});

	$effect(() => {
		const c = containerEl;
		const cv = canvasEl;
		if (!c || !cv) return;

		const eng = Matter.Engine.create({ enableSleeping: true });
		eng.gravity.y = 1.05;
		engine = eng;
		runner = Matter.Runner.create();

		afterUpdateHandler = () =>
			untrack(() => {
				tickGlassSettleIfNeeded(eng);
				drawFrame();
			});
		Matter.Events.on(eng, 'afterUpdate', afterUpdateHandler);

		ro = new ResizeObserver(() => resizeFromContainer(eng));
		ro.observe(c);
		queueMicrotask(() => resizeFromContainer(eng));

		return () => {
			stopGlassDropSound();
			monitorGlassSettle = false;
			settleStableFrames = 0;
			clearSpawnTimeouts();
			ro?.disconnect();
			ro = null;
			if (afterUpdateHandler) Matter.Events.off(eng, 'afterUpdate', afterUpdateHandler);
			afterUpdateHandler = null;
			if (runner) Matter.Runner.stop(runner);
			runner = null;
			Matter.Engine.clear(eng);
			engine = null;
			wallBodies = [];
			for (const k of Object.keys(images)) delete images[+k];
			pointerDown = null;
		};
	});

	$effect(() => {
		const eng = engine;
		const list = dropArticles;
		if (!eng || list.length === 0) {
			clearSpawnTimeouts();
			return;
		}

		for (const a of list) ensureImage(a);

		clearSpawnTimeouts();
		stopGlassDropSound();
		monitorGlassSettle = false;
		settleStableFrames = 0;
		const toRemove = Matter.Composite.allBodies(eng.world).filter(
			(b: Matter.Body) => !b.isStatic && getArticlePlugin(b)
		);
		for (const b of toRemove) Matter.Composite.remove(eng.world, b);

		let delay = 0;
		let glassPlayed = false;
		for (const a of list) {
			const stagger =
				SPAWN_STAGGER_MS_MIN + Math.random() * (SPAWN_STAGGER_MS_MAX - SPAWN_STAGGER_MS_MIN);
			delay += stagger;
			const id = window.setTimeout(() => {
				const e = engine;
				if (!e) return;
				if (!glassPlayed) {
					glassPlayed = true;
					untrack(() => playFirstDropGlassAmbient());
					monitorGlassSettle = true;
					settleStableFrames = 0;
				}
				const x = randomSpawnX(worldW, a.displayWidth);
				const y = -50 - Math.random() * 120;
				const body = createArticleBody(x, y, a.displayWidth, a.displayHeight, a.pageId);
				Matter.Body.setVelocity(body, {
					x: (Math.random() - 0.5) * 1.4,
					y: initialDownwardVelocity()
				});
				Matter.Body.setAngularVelocity(body, initialAngularVelocity());
				Matter.World.add(e.world, body);
			}, delay);
			spawnTimeouts.push(id);
		}

		return () => {
			clearSpawnTimeouts();
			const e = engine;
			if (!e) return;
			const dynamics = Matter.Composite.allBodies(e.world).filter(
				(b: Matter.Body) => !b.isStatic && getArticlePlugin(b)
			);
			for (const b of dynamics) Matter.Composite.remove(e.world, b);
		};
	});
</script>

<div
	bind:this={containerEl}
	class="relative min-h-0 w-full flex-1 touch-none overflow-hidden border-2 border-base-content/20 bg-base-200"
	tabindex="-1"
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerUp}
	role="application"
	aria-label="Article drop playfield"
>
	<canvas bind:this={canvasEl} class="absolute inset-0 block h-full w-full"></canvas>
</div>
