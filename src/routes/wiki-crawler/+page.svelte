<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { en } from '$lib/i18n/en';
	import {
		fetchArticleByTitle,
		fetchRandomTitle,
		hrefToPlayableWikiTitle,
		titleToWikiPath,
		type WikiCrawlerArticle
	} from './lib/wiki-crawler-api';

	const t = en.experiments.wikiCrawler;
	const DOUBLE_TAP_MS = 260;
	const DOUBLE_TAP_DISTANCE = 28;
	const MOVE_SPEED = 170;
	const ATTACK_DPS = 34;
	const ATTACK_RANGE = 54;
	const SCROLL_PADDING = 120;
	const TARGET_REACH_RADIUS = 10;
	const ATTACKABLE_BLOCK_SELECTOR = '.infobox, .thumb, .gallery, .wikitable, .sidebar, .tsingle, .tmulti';
	const DEBUG_WIKI_CRAWLER = true;

	type Facing = 'up' | 'down' | 'left' | 'right';
	type MovementKind = 'ground' | 'link' | 'combat';

	interface Point {
		x: number;
		y: number;
	}

	interface MovementTarget extends Point {
		kind: MovementKind;
		elementId?: string;
	}

	interface PendingLinkTarget extends Point {
		title: string;
		href: string;
	}

	interface ActiveCombatTarget {
		id: string;
		hp: number;
		maxHp: number;
		label: string;
	}

	interface AttackableEntity extends Point {
		id: string;
		node: HTMLElement;
		maxHp: number;
		label: string;
	}

	let loading = $state(true);
	let loadingLabel = $state<string>(t.loadingRandom);
	let errorMsg = $state('');
	let article = $state<WikiCrawlerArticle | null>(null);
	let queuedMovementTarget = $state<MovementTarget | null>(null);
	let pendingLinkJumpTarget = $state<PendingLinkTarget | null>(null);
	let activeCombatTarget = $state<ActiveCombatTarget | null>(null);
	let destroyedElements = $state<string[]>([]);

	let sprite = $state({
		x: 180,
		y: 96,
		facing: 'down' as Facing,
		moving: false,
		jumping: false
	});

	let articleViewport = $state<HTMLDivElement | null>(null);
	let articleCanvas = $state<HTMLDivElement | null>(null);
	let articleBody = $state<HTMLDivElement | null>(null);

	let attackables = new Map<string, AttackableEntity>();
	let nextAttackableId = 0;
	let requestToken = 0;
	let animationFrame = 0;
	let lastAnimationTime = 0;
	let pendingTapTimer: number | null = null;
	let lastTapAt = 0;
	let lastTapAttackableId = '';
	let lastTapPoint: Point | null = null;
	let lastLinkTapAt = 0;
	let lastLinkTapHref = '';
	let lastLinkTapPoint: Point | null = null;
	let highlightedAttackNode: HTMLElement | null = null;

	const statusText = $derived.by(() => {
		if (loading) return t.stateLoading;
		if (sprite.jumping) return t.stateJumping;
		if (activeCombatTarget) return t.stateCombat;
		if (queuedMovementTarget) return t.stateMoving;
		return t.stateIdle;
	});

	const targetText = $derived.by(() => {
		if (activeCombatTarget) return activeCombatTarget.label;
		if (pendingLinkJumpTarget) return pendingLinkJumpTarget.title;
		return t.noTarget;
	});

	function describeElement(element: HTMLElement | null): Record<string, string | null> | null {
		if (!element) return null;

		return {
			tag: element.tagName,
			id: element.id || null,
			className: element.className || null,
			href: element.getAttribute('href'),
			attackableId: element.dataset.crawlerAttackableId ?? null,
			text: element.textContent?.trim().slice(0, 80) || null
		};
	}

	function debugLog(message: string, details?: unknown): void {
		if (!DEBUG_WIKI_CRAWLER) return;
		console.debug(`[wiki-crawler] ${message}`, details ?? {});
	}

	function clearTapTimer(): void {
		if (pendingTapTimer !== null) {
			window.clearTimeout(pendingTapTimer);
			pendingTapTimer = null;
		}
	}

	function resetLinkTapState(): void {
		lastLinkTapAt = 0;
		lastLinkTapHref = '';
		lastLinkTapPoint = null;
	}

	function delay(ms: number): Promise<void> {
		return new Promise((resolve) => {
			window.setTimeout(resolve, ms);
		});
	}

	function setFacing(dx: number, dy: number): void {
		if (Math.abs(dx) > Math.abs(dy)) {
			sprite.facing = dx >= 0 ? 'right' : 'left';
			return;
		}

		sprite.facing = dy >= 0 ? 'down' : 'up';
	}

	function playfieldWidth(): number {
		return articleCanvas?.clientWidth ?? 360;
	}

	function playfieldHeight(): number {
		return Math.max(articleCanvas?.scrollHeight ?? 640, articleViewport?.clientHeight ?? 640);
	}

	function clampPoint(point: Point): Point {
		const width = playfieldWidth();
		const height = playfieldHeight();
		return {
			x: Math.min(Math.max(point.x, 24), Math.max(24, width - 24)),
			y: Math.min(Math.max(point.y, 24), Math.max(24, height - 24))
		};
	}

	function resetSpritePosition(): void {
		const width = playfieldWidth();
		sprite.x = Math.min(Math.max(width / 2, 48), Math.max(48, width - 48));
		sprite.y = 96;
		sprite.facing = 'down';
		sprite.moving = false;
		sprite.jumping = false;
	}

	function combatLabelForNode(node: HTMLElement): string {
		const image = node.tagName === 'IMG' ? node : node.querySelector('img');
		const altText = image?.getAttribute('alt')?.trim();
		if (altText) return altText;

		const heading = node.querySelector('caption, figcaption, th, .thumbcaption, .gallerytext');
		const label = heading?.textContent?.trim();
		if (label) return label;

		if (node.matches('.infobox')) return 'Infobox';
		if (node.matches('.wikitable')) return 'Media table';
		if (node.matches('.gallery, .thumb, .tmulti, .tsingle')) return 'Media block';
		if (node.matches('.sidebar')) return 'Sidebar';
		return 'Media target';
	}

	function hpForNode(node: HTMLElement): number {
		if (node.tagName === 'IMG') return 24;
		if (node.matches('.thumb, .gallery, .tmulti, .tsingle')) return 42;
		if (node.matches('.infobox, .wikitable, .sidebar')) return 64;
		return 36;
	}

	function relativeCenterOf(node: HTMLElement): Point | null {
		if (!articleCanvas) return null;
		const canvasRect = articleCanvas.getBoundingClientRect();
		const rect = node.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) return null;

		return clampPoint({
			x: rect.left - canvasRect.left + rect.width / 2,
			y: rect.top - canvasRect.top + rect.height / 2
		});
	}

	function markCombatNode(node: HTMLElement, ratio: number): void {
		if (highlightedAttackNode && highlightedAttackNode !== node) {
			highlightedAttackNode.classList.remove('is-under-attack');
			highlightedAttackNode.style.removeProperty('--crawler-hp');
		}

		highlightedAttackNode = node;
		node.classList.add('is-under-attack');
		node.style.setProperty('--crawler-hp', String(Math.max(0, ratio)));
	}

	function clearCombatHighlight(): void {
		if (!highlightedAttackNode) return;

		highlightedAttackNode.classList.remove('is-under-attack');
		highlightedAttackNode.style.removeProperty('--crawler-hp');
		highlightedAttackNode = null;
	}

	function collectAttackableNodes(): HTMLElement[] {
		if (!articleBody) return [];

		const nodes: HTMLElement[] = [];
		for (const block of articleBody.querySelectorAll<HTMLElement>(ATTACKABLE_BLOCK_SELECTOR)) {
			nodes.push(block);
		}

		for (const image of articleBody.querySelectorAll<HTMLElement>('img')) {
			if (image.closest(ATTACKABLE_BLOCK_SELECTOR)) continue;
			nodes.push(image);
		}

		return nodes;
	}

	function getOrAssignAttackableId(node: HTMLElement): string {
		let id = node.dataset.crawlerAttackableId;
		if (!id) {
			id = `target-${nextAttackableId}`;
			nextAttackableId += 1;
			node.dataset.crawlerAttackableId = id;
		}

		return id;
	}

	function buildAttackableEntity(node: HTMLElement): AttackableEntity | null {
		const id = getOrAssignAttackableId(node);

		if (destroyedElements.includes(id)) {
			node.style.display = 'none';
			return null;
		}

		node.style.removeProperty('display');
		node.classList.add('wiki-crawler-attackable');
		const center = relativeCenterOf(node);
		if (!center) return null;

		return {
			id,
			node,
			x: center.x,
			y: center.y,
			maxHp: hpForNode(node),
			label: combatLabelForNode(node)
		};
	}

	function resolveAttackableElement(target: HTMLElement): HTMLElement | null {
		const selector = `${ATTACKABLE_BLOCK_SELECTOR}, img`;
		return (
			target.closest<HTMLElement>('[data-crawler-attackable-id]') ??
			target.closest<HTMLElement>(selector) ??
			target.querySelector<HTMLElement>(selector) ??
			target.closest<HTMLElement>('a, figure, span, td, div')?.querySelector<HTMLElement>(selector) ??
			null
		);
	}

	function measureAttackables(): void {
		if (!articleBody || !articleCanvas) return;

		const measured = new Map<string, AttackableEntity>();
		for (const node of collectAttackableNodes()) {
			const entity = buildAttackableEntity(node);
			if (!entity) continue;

			measured.set(entity.id, entity);
		}

		attackables = measured;
		debugLog('measureAttackables', {
			count: measured.size,
			sample: Array.from(measured.values())
				.slice(0, 6)
				.map((entry) => ({
					id: entry.id,
					label: entry.label,
					tag: entry.node.tagName,
					x: Math.round(entry.x),
					y: Math.round(entry.y)
				}))
		});
		if (activeCombatTarget && !attackables.has(activeCombatTarget.id)) {
			activeCombatTarget = null;
			clearCombatHighlight();
		}
	}

	function wireRemeasureOnImages(): void {
		if (!articleBody) return;

		for (const image of articleBody.querySelectorAll<HTMLImageElement>('img')) {
			if (image.complete) continue;
			image.addEventListener('load', measureAttackables, { once: true });
		}
	}

	function pointerToPlayfield(event: PointerEvent): Point | null {
		if (!articleCanvas) return null;
		const rect = articleCanvas.getBoundingClientRect();
		return clampPoint({
			x: event.clientX - rect.left,
			y: event.clientY - rect.top
		});
	}

	function playableLinkFromTarget(target: HTMLElement, point: Point): PendingLinkTarget | null {
		const anchor = target.closest('a');
		if (!anchor) return null;

		const href = anchor.getAttribute('href');
		if (!href) return null;
		if (href.startsWith('#')) return null;

		const title = hrefToPlayableWikiTitle(href);
		if (!title) {
			if (href.startsWith('http')) {
				window.open(href, '_blank', 'noopener,noreferrer');
			}
			return null;
		}

		return {
			title,
			href,
			x: point.x,
			y: point.y
		};
	}

	function attackableFromTarget(target: HTMLElement): AttackableEntity | null {
		const element = resolveAttackableElement(target);
		if (!element) return null;

		const id = getOrAssignAttackableId(element);
		const measured = attackables.get(id);
		if (measured) return measured;

		const entity = buildAttackableEntity(element);
		if (!entity) {
			debugLog('attackableFromTarget:build-failed', {
				target: describeElement(target),
				resolved: describeElement(element),
				attackableCount: attackables.size
			});
			return null;
		}

		attackables.set(entity.id, entity);
		debugLog('attackableFromTarget:resolved-on-demand', {
			id: entity.id,
			label: entity.label,
			tag: entity.node.tagName,
			x: Math.round(entity.x),
			y: Math.round(entity.y)
		});
		return entity;
	}

	function queueGroundMovement(point: Point): void {
		clearTapTimer();
		debugLog('queueGroundMovement', { point });
		queuedMovementTarget = { ...clampPoint(point), kind: 'ground' };
		pendingLinkJumpTarget = null;
		activeCombatTarget = null;
		clearCombatHighlight();
	}

	function queueLinkMovement(target: PendingLinkTarget): void {
		clearTapTimer();
		debugLog('queueLinkMovement', target);
		queuedMovementTarget = { x: target.x, y: target.y, kind: 'link' };
		pendingLinkJumpTarget = target;
		activeCombatTarget = null;
		clearCombatHighlight();
	}

	function queueCombatMovement(target: AttackableEntity): void {
		clearTapTimer();
		lastTapAttackableId = '';
		lastTapPoint = null;
		debugLog('queueCombatMovement', {
			id: target.id,
			label: target.label,
			point: { x: target.x, y: target.y },
			maxHp: target.maxHp,
			element: describeElement(target.node)
		});
		queuedMovementTarget = {
			x: target.x,
			y: target.y,
			kind: 'combat',
			elementId: target.id
		};
		pendingLinkJumpTarget = null;
		activeCombatTarget = {
			id: target.id,
			hp: target.maxHp,
			maxHp: target.maxHp,
			label: target.label
		};
	}

	async function destroyAttackable(id: string): Promise<void> {
		const target = attackables.get(id);
		debugLog('destroyAttackable', {
			id,
			found: Boolean(target),
			element: describeElement(target?.node ?? null)
		});
		if (target) {
			target.node.style.display = 'none';
			target.node.classList.remove('is-under-attack');
			target.node.style.removeProperty('--crawler-hp');
		}

		destroyedElements = [...destroyedElements, id];
		attackables.delete(id);
		if (activeCombatTarget?.id === id) {
			activeCombatTarget = null;
		}
		queuedMovementTarget = null;
		clearCombatHighlight();

		await tick();
		measureAttackables();
	}

	async function loadArticle(title: string, label = t.loading): Promise<void> {
		debugLog('loadArticle:start', { title, label });
		const token = requestToken + 1;
		requestToken = token;
		loading = true;
		loadingLabel = label;
		errorMsg = '';
		queuedMovementTarget = null;
		pendingLinkJumpTarget = null;
		activeCombatTarget = null;
		destroyedElements = [];
		clearCombatHighlight();

		try {
			const nextArticle = await fetchArticleByTitle(title);
			if (requestToken !== token) return;
			debugLog('loadArticle:success', {
				title: nextArticle.title,
				pageId: nextArticle.pageId,
				htmlLength: nextArticle.htmlContent.length
			});

			article = nextArticle;
			nextAttackableId = 0;
			attackables = new Map<string, AttackableEntity>();

			await tick();
			if (requestToken !== token) return;

			if (articleViewport) {
				articleViewport.scrollTop = 0;
				articleViewport.scrollLeft = 0;
			}

			resetSpritePosition();
			measureAttackables();
			wireRemeasureOnImages();
		} catch {
			if (requestToken !== token) return;
			debugLog('loadArticle:error', { title });

			article = null;
			errorMsg = t.errorFetch;
		} finally {
			if (requestToken === token) {
				loading = false;
				sprite.jumping = false;
			}
		}
	}

	async function loadRandomArticle(): Promise<void> {
		loading = true;
		loadingLabel = t.loadingRandom;
		errorMsg = '';

		try {
			const title = await fetchRandomTitle();
			await loadArticle(title, t.loading);
		} catch {
			errorMsg = t.errorFetch;
			loading = false;
		}
	}

	async function triggerLinkJump(target: PendingLinkTarget): Promise<void> {
		debugLog('triggerLinkJump', target);
		sprite.jumping = true;
		await delay(220);
		await loadArticle(target.title, t.loading);
	}

	function keepSpriteInView(): void {
		if (!articleViewport || !articleCanvas) return;

		const left = articleViewport.scrollLeft;
		const top = articleViewport.scrollTop;
		const right = left + articleViewport.clientWidth;
		const bottom = top + articleViewport.clientHeight;

		let nextLeft = left;
		let nextTop = top;

		if (sprite.x < left + SCROLL_PADDING) {
			nextLeft = Math.max(0, sprite.x - SCROLL_PADDING);
		} else if (sprite.x > right - SCROLL_PADDING) {
			nextLeft = Math.max(0, sprite.x - articleViewport.clientWidth + SCROLL_PADDING);
		}

		if (sprite.y < top + SCROLL_PADDING) {
			nextTop = Math.max(0, sprite.y - SCROLL_PADDING);
		} else if (sprite.y > bottom - SCROLL_PADDING) {
			nextTop = Math.max(0, sprite.y - articleViewport.clientHeight + SCROLL_PADDING);
		}

		if (nextLeft !== left || nextTop !== top) {
			articleViewport.scrollTo({ left: nextLeft, top: nextTop });
		}
	}

	function advanceMovement(deltaSeconds: number): void {
		const combatEntity = activeCombatTarget ? attackables.get(activeCombatTarget.id) ?? null : null;
		if (activeCombatTarget && !combatEntity) {
			activeCombatTarget = null;
			clearCombatHighlight();
		}

		let moving = false;
		if (queuedMovementTarget) {
			let targetX = queuedMovementTarget.x;
			let targetY = queuedMovementTarget.y;
			const stopDistance = queuedMovementTarget.kind === 'combat' ? ATTACK_RANGE : TARGET_REACH_RADIUS;

			if (queuedMovementTarget.kind === 'combat' && combatEntity) {
				targetX = combatEntity.x;
				targetY = combatEntity.y;
				queuedMovementTarget.x = targetX;
				queuedMovementTarget.y = targetY;
			}

			const dx = targetX - sprite.x;
			const dy = targetY - sprite.y;
			const distance = Math.hypot(dx, dy);

			if (distance > stopDistance) {
				const step = Math.min(distance - stopDistance, MOVE_SPEED * deltaSeconds);
				const nextPoint = clampPoint({
					x: sprite.x + (dx / distance) * step,
					y: sprite.y + (dy / distance) * step
				});
				sprite.x = nextPoint.x;
				sprite.y = nextPoint.y;
				setFacing(dx, dy);
				moving = true;
			} else if (queuedMovementTarget.kind === 'link' && pendingLinkJumpTarget) {
				const nextLink = pendingLinkJumpTarget;
				debugLog('link target reached; jumping', {
					title: nextLink.title,
					href: nextLink.href,
					point: { x: nextLink.x, y: nextLink.y },
					sprite: { x: sprite.x, y: sprite.y }
				});
				queuedMovementTarget = null;
				pendingLinkJumpTarget = null;
				void triggerLinkJump(nextLink);
			} else if (queuedMovementTarget.kind !== 'combat') {
				queuedMovementTarget = null;
			}
		}

		sprite.moving = moving;

		if (activeCombatTarget) {
			const combatTarget = attackables.get(activeCombatTarget.id);
			if (!combatTarget) {
				activeCombatTarget = null;
				clearCombatHighlight();
				return;
			}

			const dx = combatTarget.x - sprite.x;
			const dy = combatTarget.y - sprite.y;
			const distance = Math.hypot(dx, dy);
			if (distance > ATTACK_RANGE) {
				if (!queuedMovementTarget) {
					queuedMovementTarget = {
						x: combatTarget.x,
						y: combatTarget.y,
						kind: 'combat',
						elementId: combatTarget.id
					};
				}
				return;
			}

			setFacing(dx, dy);
			activeCombatTarget.hp = Math.max(0, activeCombatTarget.hp - ATTACK_DPS * deltaSeconds);
			markCombatNode(combatTarget.node, activeCombatTarget.hp / activeCombatTarget.maxHp);

			if (activeCombatTarget.hp <= 0) {
				void destroyAttackable(activeCombatTarget.id);
			}
		}

		keepSpriteInView();
	}

	function handleAnimationFrame(time: number): void {
		if (!lastAnimationTime) {
			lastAnimationTime = time;
			animationFrame = window.requestAnimationFrame(handleAnimationFrame);
			return;
		}

		const deltaSeconds = Math.min((time - lastAnimationTime) / 1000, 0.05);
		lastAnimationTime = time;
		advanceMovement(deltaSeconds);
		animationFrame = window.requestAnimationFrame(handleAnimationFrame);
	}

	function handlePlayfieldClick(event: MouseEvent): void {
		const target = event.target as HTMLElement | null;
		if (!target?.closest('a')) return;

		event.preventDefault();
		event.stopPropagation();
	}

	function handlePlayfieldPointerUp(event: PointerEvent): void {
		if (loading || sprite.jumping) return;
		if (event.pointerType === 'mouse' && event.button !== 0) return;

		const target = event.target as HTMLElement | null;
		if (!target) return;

		const point = pointerToPlayfield(event);
		if (!point) return;

		const linkTarget = playableLinkFromTarget(target, point);
		const attackableTarget = attackableFromTarget(target);
		const now = performance.now();
		debugLog('pointerup', {
			pointerType: event.pointerType,
			point,
			rawTarget: describeElement(target),
			closestAnchor: describeElement(target.closest('a')),
			closestImage: describeElement(target.closest('img')),
			linkTarget,
			attackableTarget: attackableTarget
				? {
					id: attackableTarget.id,
					label: attackableTarget.label,
					point: { x: attackableTarget.x, y: attackableTarget.y },
					element: describeElement(attackableTarget.node)
				}
				: null,
			attackableCount: attackables.size
		});

		if (attackableTarget) {
			event.preventDefault();
			resetLinkTapState();
			const isDoubleTap =
				lastTapAttackableId === attackableTarget.id && now - lastTapAt <= DOUBLE_TAP_MS;
			const isNearLastTap =
				lastTapPoint === null ||
				Math.hypot(point.x - lastTapPoint.x, point.y - lastTapPoint.y) <= DOUBLE_TAP_DISTANCE;
			lastTapAttackableId = attackableTarget.id;
			lastTapAt = now;
			lastTapPoint = point;
			debugLog('attackable tap', {
				id: attackableTarget.id,
				label: attackableTarget.label,
				isDoubleTap,
				isNearLastTap,
				lastTapPoint,
				currentPoint: point,
				element: describeElement(attackableTarget.node)
			});

			if (isDoubleTap && isNearLastTap) {
				clearTapTimer();
				debugLog('attack double tap confirmed', {
					id: attackableTarget.id,
					label: attackableTarget.label
				});
				queueCombatMovement(attackableTarget);
				return;
			}

			debugLog('attackable single tap; moving to tapped point', {
				id: attackableTarget.id,
				label: attackableTarget.label,
				point
			});
			queueGroundMovement(point);
			return;
		}

		lastTapAttackableId = '';
		lastTapAt = 0;
		lastTapPoint = null;

		if (linkTarget) {
			const isLinkDoubleTap =
				lastLinkTapHref === linkTarget.href && now - lastLinkTapAt <= DOUBLE_TAP_MS;
			const isNearLastLinkTap =
				lastLinkTapPoint === null ||
				Math.hypot(point.x - lastLinkTapPoint.x, point.y - lastLinkTapPoint.y) <=
					DOUBLE_TAP_DISTANCE;

			lastLinkTapHref = linkTarget.href;
			lastLinkTapAt = now;
			lastLinkTapPoint = point;

			debugLog('link tap', {
				title: linkTarget.title,
				href: linkTarget.href,
				isLinkDoubleTap,
				isNearLastLinkTap,
				point
			});

			if (isLinkDoubleTap && isNearLastLinkTap) {
				debugLog('link double tap confirmed', linkTarget);
				queueLinkMovement(linkTarget);
				return;
			}

			debugLog('link single tap; moving only', {
				title: linkTarget.title,
				href: linkTarget.href,
				point
			});
			queueGroundMovement(point);
			return;
		}

		resetLinkTapState();
		queueGroundMovement(point);
	}

	onMount(() => {
		animationFrame = window.requestAnimationFrame(handleAnimationFrame);
		void loadRandomArticle();

		return () => {
			window.cancelAnimationFrame(animationFrame);
			clearTapTimer();
			clearCombatHighlight();
		};
	});
</script>

<div class="crawler-shell">
	<div class="crawler-hud">
		<div>
			<p class="crawler-label">{t.statusLabel}</p>
			<p class="crawler-value">{statusText}</p>
		</div>
		<div>
			<p class="crawler-label">{t.targetLabel}</p>
			<p class="crawler-value">{targetText}</p>
		</div>
		<button
			type="button"
			class="btn border-2 border-base-content/20 tracking-widest uppercase btn-outline btn-sm"
			onclick={() => void loadRandomArticle()}
		>
			{t.randomButton}
		</button>
	</div>

	<div class="crawler-stage" bind:this={articleViewport}>
		{#if loading}
			<div class="crawler-state-panel">
				<p class="crawler-state-copy">{loadingLabel}</p>
			</div>
		{:else if errorMsg}
			<div class="crawler-state-panel">
				<p class="crawler-error">{errorMsg}</p>
				<button
					type="button"
					class="btn border-2 border-base-content/20 tracking-widest uppercase btn-outline btn-sm"
					onclick={() => void loadRandomArticle()}
				>
					{t.retryButton}
				</button>
			</div>
		{:else if article}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="crawler-canvas"
				bind:this={articleCanvas}
				onclick={handlePlayfieldClick}
				onpointerup={handlePlayfieldPointerUp}
			>
				<div class="crawler-article-chrome">
					<h2 class="crawler-article-title">{article.title}</h2>
					<a href={article.canonicalUrl} target="_blank" rel="noreferrer" class="crawler-source-link">
						{titleToWikiPath(article.title)}
					</a>
				</div>

				<div class="crawler-article-body wiki-article-body" bind:this={articleBody}>
					{@html article.htmlContent}
				</div>

				<div class="crawler-overlay" aria-hidden="true">
					<div
						class:is-moving={sprite.moving}
						class:is-jumping={sprite.jumping}
						class="crawler-sprite"
						data-facing={sprite.facing}
						style={`left:${sprite.x}px; top:${sprite.y}px;`}
					>
						<div class="crawler-shadow"></div>
						<div class="crawler-avatar">
							<div class="crawler-cape"></div>
							<div class="crawler-arm crawler-arm-left"></div>
							<div class="crawler-arm crawler-arm-right"></div>
							<div class="crawler-torso"></div>
							<div class="crawler-leg crawler-leg-left"></div>
							<div class="crawler-leg crawler-leg-right"></div>
							<div class="crawler-head">
								<div class="crawler-eye crawler-eye-left"></div>
								<div class="crawler-eye crawler-eye-right"></div>
							</div>
						</div>
					</div>
				</div>

				<div class="crawler-footer">
					<p>{t.footerWikiLine}</p>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.crawler-shell {
		display: flex;
		min-height: 100%;
		flex: 1;
		flex-direction: column;
		background:
			radial-gradient(circle at top, rgba(96, 165, 250, 0.12), transparent 32%),
			linear-gradient(180deg, #0a111d 0%, #06090f 100%);
	}

	.crawler-hud {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.75rem;
		align-items: end;
		padding: 1rem 1rem 0.75rem;
		border-bottom: 1px solid rgba(148, 163, 184, 0.16);
		background: rgba(2, 8, 23, 0.78);
		backdrop-filter: blur(10px);
	}

	.crawler-label {
		margin: 0;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: rgba(191, 219, 254, 0.6);
	}

	.crawler-value {
		margin: 0.2rem 0 0;
		font-size: 0.95rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		color: #eff6ff;
	}

	.crawler-stage {
		flex: 1;
		overflow: auto;
		touch-action: manipulation;
	}

	.crawler-state-panel {
		display: flex;
		min-height: 100%;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: 2rem;
	}

	.crawler-state-copy {
		margin: 0;
		font-size: 0.9rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: rgba(191, 219, 254, 0.7);
	}

	.crawler-error {
		margin: 0;
		font-size: 0.95rem;
		color: #fca5a5;
	}

	.crawler-canvas {
		position: relative;
		width: min(100%, 52rem);
		margin: 0 auto;
		padding: 0 1rem 3rem;
	}

	.crawler-article-chrome {
		padding: 1.5rem 0 1rem;
		border-bottom: 2px solid rgba(191, 219, 254, 0.12);
		margin-bottom: 1.5rem;
	}

	.crawler-article-title {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #dbeafe;
		line-height: 1.25;
	}

	.crawler-source-link {
		display: inline-block;
		margin-top: 0.5rem;
		font-size: 0.7rem;
		letter-spacing: 0.08em;
		color: rgba(147, 197, 253, 0.78);
		text-decoration: none;
	}

	.crawler-article-body {
		position: relative;
		min-height: calc(100dvh - 18rem);
		padding-bottom: 6rem;
		color: #d8e4d8;
		font-size: 0.875rem;
		line-height: 1.75;
	}

	.crawler-overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 3;
	}

	.crawler-sprite {
		position: absolute;
		width: 50px;
		height: 64px;
		margin-left: -25px;
		margin-top: -50px;
		transform-origin: 50% 80%;
		transition: transform 0.12s ease;
	}

	.crawler-sprite.is-jumping {
		animation: crawler-jump 0.42s ease;
	}

	.crawler-sprite.is-moving .crawler-avatar {
		animation: crawler-bob 0.22s ease-in-out infinite alternate;
	}

	.crawler-shadow {
		position: absolute;
		left: 10px;
		right: 10px;
		bottom: 0;
		height: 12px;
		border-radius: 999px;
		background: rgba(2, 6, 23, 0.48);
		filter: blur(2px);
	}

	.crawler-avatar {
		position: absolute;
		left: 6px;
		top: 2px;
		width: 36px;
		height: 46px;
		transform-origin: 50% 100%;
		image-rendering: pixelated;
	}

	.crawler-avatar::before {
		content: '';
		position: absolute;
		left: 4px;
		top: 7px;
		width: 28px;
		height: 34px;
		border-radius: 999px;
		background: radial-gradient(circle, rgba(226, 232, 240, 0.28) 0%, rgba(191, 219, 254, 0.18) 55%, rgba(191, 219, 254, 0) 100%);
		filter: blur(2px);
		z-index: -1;
		pointer-events: none;
	}

	.crawler-sprite[data-facing='left'] .crawler-avatar {
		transform: scaleX(-1);
	}

	.crawler-cape {
		position: absolute;
		left: 8px;
		top: 12px;
		width: 18px;
		height: 21px;
		background: #1d4ed8;
		clip-path: polygon(50% 0, 100% 18%, 92% 100%, 8% 100%, 0 18%);
		opacity: 0.85;
	}

	.crawler-head {
		position: absolute;
		left: 10px;
		top: 0;
		width: 16px;
		height: 16px;
		border: 2px solid #0f172a;
		background: #f5d0a9;
		box-shadow: inset 0 -2px 0 rgba(199, 161, 120, 0.9);
		z-index: 3;
	}

	.crawler-eye {
		position: absolute;
		top: 5px;
		width: 2px;
		height: 2px;
		background: #0f172a;
	}

	.crawler-eye-left {
		left: 3px;
	}

	.crawler-eye-right {
		right: 3px;
	}

	.crawler-torso {
		position: absolute;
		left: 8px;
		top: 15px;
		width: 20px;
		height: 16px;
		border: 2px solid #0f172a;
		background: linear-gradient(180deg, #6366f1 0%, #4338ca 100%);
		z-index: 2;
	}

	.crawler-arm,
	.crawler-leg {
		position: absolute;
		width: 4px;
		border: 2px solid #0f172a;
		background: #1f2937;
		transform-origin: 50% 0;
	}

	.crawler-arm {
		top: 17px;
		height: 12px;
		z-index: 1;
	}

	.crawler-arm-left {
		left: 4px;
	}

	.crawler-arm-right {
		right: 4px;
	}

	.crawler-leg {
		top: 31px;
		height: 12px;
		z-index: 0;
	}

	.crawler-leg-left {
		left: 11px;
	}

	.crawler-leg-right {
		right: 11px;
	}

	.crawler-sprite[data-facing='up'] .crawler-eye {
		opacity: 0;
	}

	.crawler-sprite[data-facing='up'] .crawler-head {
		background: #d4b08b;
	}

	.crawler-sprite[data-facing='up'] .crawler-cape {
		opacity: 1;
	}

	.crawler-sprite.is-moving .crawler-arm-left,
	.crawler-sprite.is-moving .crawler-leg-right {
		animation: crawler-limb-swing 0.22s ease-in-out infinite alternate;
	}

	.crawler-sprite.is-moving .crawler-arm-right,
	.crawler-sprite.is-moving .crawler-leg-left {
		animation: crawler-limb-swing 0.22s ease-in-out infinite alternate-reverse;
	}

	.crawler-footer {
		margin-top: 2rem;
		padding-top: 1rem;
		padding-bottom: 1rem;
		border-top: 2px solid rgba(191, 219, 254, 0.12);
		font-size: 0.68rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(191, 219, 254, 0.42);
	}

	.crawler-footer p {
		margin: 0;
	}

	.wiki-article-body :global(*) {
		background-color: transparent !important;
		color: inherit !important;
		border-color: rgba(255, 255, 255, 0.1) !important;
	}

	.wiki-article-body :global(a) {
		color: #60a5fa !important;
		text-decoration: none;
		border-bottom: 1px solid rgba(96, 165, 250, 0.28) !important;
		transition: border-color 0.15s ease, color 0.15s ease;
	}

	.wiki-article-body :global(a:hover) {
		color: #bfdbfe !important;
		border-bottom-color: rgba(191, 219, 254, 0.72) !important;
	}

	.wiki-article-body :global(h2) {
		font-size: 1.1rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #dbeafe !important;
		margin: 2rem 0 0.75rem;
		padding-bottom: 0.5rem;
		border-bottom: 2px solid rgba(255, 255, 255, 0.1) !important;
	}

	.wiki-article-body :global(h3) {
		font-size: 0.95rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #c7d2fe !important;
		margin: 1.5rem 0 0.5rem;
	}

	.wiki-article-body :global(h4),
	.wiki-article-body :global(h5),
	.wiki-article-body :global(h6) {
		font-size: 0.85rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		color: #bfdbfe !important;
		margin: 1.25rem 0 0.4rem;
	}

	.wiki-article-body :global(p) {
		margin: 0.75rem 0;
	}

	.wiki-article-body :global(ul),
	.wiki-article-body :global(ol) {
		margin: 0.5rem 0;
		padding-left: 1.5rem;
	}

	.wiki-article-body :global(li) {
		margin: 0.25rem 0;
	}

	.wiki-article-body :global(blockquote) {
		border-left: 3px solid #60a5fa !important;
		padding-left: 1rem;
		margin: 1rem 0;
		opacity: 0.85;
		font-style: italic;
	}

	.wiki-article-body :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin: 1rem 0;
		font-size: 0.8rem;
	}

	.wiki-article-body :global(th),
	.wiki-article-body :global(td) {
		border: 1px solid rgba(255, 255, 255, 0.1) !important;
		padding: 0.4rem 0.6rem;
		text-align: left;
	}

	.wiki-article-body :global(th) {
		background: rgba(255, 255, 255, 0.05) !important;
		font-weight: 700;
		font-size: 0.75rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #dbeafe !important;
	}

	.wiki-article-body :global(img) {
		max-width: 100%;
		height: auto;
		margin: 0.5rem 0;
		border: 2px solid rgba(255, 255, 255, 0.1) !important;
	}

	.wiki-article-body :global(.thumb),
	.wiki-article-body :global(.tmulti) {
		margin: 1rem 0;
		max-width: 100%;
	}

	.wiki-article-body :global(.thumbinner) {
		max-width: 100% !important;
	}

	.wiki-article-body :global(.thumbcaption),
	.wiki-article-body :global(.gallerytext) {
		font-size: 0.75rem;
		opacity: 0.56;
		padding: 0.25rem 0;
		letter-spacing: 0.04em;
	}

	.wiki-article-body :global(.mw-editsection),
	.wiki-article-body :global(.reference),
	.wiki-article-body :global(.reflist),
	.wiki-article-body :global(.navbox),
	.wiki-article-body :global(.sistersitebox),
	.wiki-article-body :global(.side-box),
	.wiki-article-body :global(.metadata),
	.wiki-article-body :global(.noprint),
	.wiki-article-body :global(.catlinks),
	.wiki-article-body :global(.mw-authority-control),
	.wiki-article-body :global(.external),
	.wiki-article-body :global(.mw-references-wrap),
	.wiki-article-body :global(.mw-empty-elt),
	.wiki-article-body :global(.mbox-small),
	.wiki-article-body :global(.ambox),
	.wiki-article-body :global(.ombox),
	.wiki-article-body :global(.tmbox),
	.wiki-article-body :global(.dmbox),
	.wiki-article-body :global(.fmbox),
	.wiki-article-body :global(.cmbox),
	.wiki-article-body :global(.imbox),
	.wiki-article-body :global(.plainlinks),
	.wiki-article-body :global(.shortdescription),
	.wiki-article-body :global(.hatnote) {
		display: none !important;
	}

	.wiki-article-body :global(.infobox),
	.wiki-article-body :global(.sidebar),
	.wiki-article-body :global(.wikitable) {
		width: 100% !important;
		float: none !important;
		margin: 1rem 0 !important;
		background: rgba(255, 255, 255, 0.03) !important;
		border: 2px solid rgba(255, 255, 255, 0.1) !important;
		font-size: 0.8rem;
	}

	.wiki-article-body :global(.infobox th),
	.wiki-article-body :global(.infobox .infobox-header),
	.wiki-article-body :global(.infobox .infobox-above),
	.wiki-article-body :global(.infobox .infobox-subheader),
	.wiki-article-body :global(.sidebar-heading),
	.wiki-article-body :global(.sidebar-above) {
		background: rgba(255, 255, 255, 0.06) !important;
		color: #dbeafe !important;
		font-weight: 700;
	}

	.wiki-article-body :global(.gallery),
	.wiki-article-body :global(.gallerybox) {
		background: transparent !important;
	}

	.wiki-article-body :global(.wiki-crawler-attackable) {
		transition:
			opacity 0.16s ease,
			transform 0.16s ease,
			outline-color 0.16s ease,
			box-shadow 0.16s ease;
	}

	.wiki-article-body :global(.wiki-crawler-attackable.is-under-attack) {
		outline: 3px solid rgba(248, 113, 113, 0.98);
		outline-offset: 2px;
		box-shadow:
			0 0 0 6px rgba(248, 113, 113, calc(1 - var(--crawler-hp, 1) * 0.65)),
			0 0 24px rgba(248, 113, 113, 0.5);
		filter: saturate(1.35) brightness(1.12);
		transform: translate3d(0, 0, 0) scale(0.985);
		animation: crawler-hit 0.16s linear infinite alternate;
	}

	@keyframes crawler-hit {
		from {
			transform: translateX(-1px) scale(0.99);
		}

		to {
			transform: translateX(1px) scale(1.01);
		}
	}

	@keyframes crawler-jump {
		0% {
			transform: translateY(0) scale(1);
		}

		45% {
			transform: translateY(-18px) scale(1.04);
		}

		100% {
			transform: translateY(0) scale(1);
		}
	}

	@keyframes crawler-bob {
		from {
			transform: translateY(0);
		}

		to {
			transform: translateY(-1px);
		}
	}

	@keyframes crawler-limb-swing {
		from {
			transform: rotate(-14deg);
		}

		to {
			transform: rotate(14deg);
		}
	}

	@media (max-width: 720px) {
		.crawler-hud {
			grid-template-columns: 1fr 1fr;
		}

		.crawler-hud :global(button) {
			grid-column: 1 / -1;
		}

		.crawler-canvas {
			padding-inline: 0.75rem;
		}
	}
</style>