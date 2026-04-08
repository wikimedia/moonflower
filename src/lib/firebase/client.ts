import { initializeApp } from 'firebase/app';
import {
	getAuth,
	sendSignInLinkToEmail,
	signInWithEmailLink,
	isSignInWithEmailLink
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import {
	PUBLIC_FIREBASE_API_KEY,
	PUBLIC_FIREBASE_AUTH_DOMAIN,
	PUBLIC_FIREBASE_PROJECT_ID,
	PUBLIC_AUTH_REDIRECT_URL
} from '$env/static/public';
import { en } from '$lib/i18n/en';

const firebaseConfig = {
	apiKey: PUBLIC_FIREBASE_API_KEY,
	authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: PUBLIC_FIREBASE_PROJECT_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const STORAGE_KEY_EMAIL = 'emailForSignIn';

export async function sendMagicLink(email: string): Promise<void> {
	const redirectUrl = PUBLIC_AUTH_REDIRECT_URL || 'http://localhost:5173/verify';
	await sendSignInLinkToEmail(auth, email, {
		url: redirectUrl,
		handleCodeInApp: true
	});
	window.localStorage.setItem(STORAGE_KEY_EMAIL, email);
}

export async function completeMagicLink(): Promise<boolean> {
	if (!isSignInWithEmailLink(auth, window.location.href)) return false;

	let email = window.localStorage.getItem(STORAGE_KEY_EMAIL);
	if (!email) {
		email = window.prompt(en.auth.emailPrompt) || '';
	}

	await signInWithEmailLink(auth, email, window.location.href);
	window.localStorage.removeItem(STORAGE_KEY_EMAIL);
	return true;
}
