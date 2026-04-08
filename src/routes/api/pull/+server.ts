import { json } from '@sveltejs/kit';
import { adminDb } from '$lib/firebase/admin';
import type { WikiCard } from '$lib/types';
import type { RequestHandler } from './$types';

const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const USER_AGENT = 'Moonflower/1.0 (WikiGacha Game; contact@moonflower.app)';

export const GET: RequestHandler = async () => {
	const params = new URLSearchParams({
		action: 'query',
		format: 'json',
		generator: 'random',
		grnnamespace: '0',
		grnlimit: '10',
		prop: 'extracts',
		exintro: 'true',
		explaintext: 'true',
		exsentences: '5'
	});

	const res = await fetch(`${WIKI_API}?${params}`, {
		headers: { 'User-Agent': USER_AGENT }
	});

	if (!res.ok) {
		return json([], { status: 502 });
	}

	const data = await res.json();
	const pages = Object.values(data.query?.pages ?? {}) as Array<{
		pageid: number;
		title: string;
		extract?: string;
	}>;

	if (pages.length === 0) {
		return json([]);
	}

	// Batch-check which page IDs are already claimed
	const refs = pages.map((p) => adminDb.collection('claimed_cards').doc(String(p.pageid)));
	const docs = await adminDb.getAll(...refs);
	const claimedIds = new Set(docs.filter((d) => d.exists).map((d) => d.id));

	// Filter to unclaimed, return up to 5
	const unclaimed: WikiCard[] = pages
		.filter((p) => !claimedIds.has(String(p.pageid)))
		.filter((p) => p.extract && p.extract.trim().length > 0)
		.map((p) => ({
			pageId: p.pageid,
			title: p.title,
			extract: p.extract ?? ''
		}))
		.slice(0, 5);

	return json(unclaimed);
};
