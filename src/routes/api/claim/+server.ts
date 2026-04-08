import { json, error } from '@sveltejs/kit';
import { adminDb, adminAuth } from '$lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { en } from '$lib/i18n/en';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const authHeader = request.headers.get('Authorization');
	if (!authHeader?.startsWith('Bearer ')) {
		throw error(401, en.errors.unauthorized);
	}

	const token = authHeader.slice(7);
	let uid: string;

	try {
		const decoded = await adminAuth.verifyIdToken(token);
		uid = decoded.uid;
	} catch {
		throw error(401, en.errors.invalidToken);
	}

	const { pageId, title, extract } = await request.json();

	if (!pageId || !title) {
		throw error(400, 'Missing required fields.');
	}

	const docRef = adminDb.collection('claimed_cards').doc(String(pageId));

	try {
		await adminDb.runTransaction(async (tx) => {
			const doc = await tx.get(docRef);
			if (doc.exists) {
				throw new Error('ALREADY_CLAIMED');
			}
			tx.set(docRef, {
				ownerId: uid,
				claimedAt: FieldValue.serverTimestamp(),
				title,
				extract: extract ?? ''
			});
		});

		return json({ success: true }, { status: 201 });
	} catch (e: unknown) {
		if (e instanceof Error && e.message === 'ALREADY_CLAIMED') {
			throw error(409, en.errors.alreadyClaimed);
		}
		throw error(500, en.errors.claimFailed);
	}
};
