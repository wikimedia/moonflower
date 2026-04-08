import { initializeApp, cert, getApps, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { env } from '$env/dynamic/private';

function getAdminApp() {
	const existing = getApps();
	if (existing.length > 0) {
		return existing[0];
	}

	const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT ?? '{}') as ServiceAccount;
	return initializeApp({ credential: cert(serviceAccount) });
}

const adminApp = getAdminApp();

export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
