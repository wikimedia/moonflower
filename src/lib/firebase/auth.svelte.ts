import { browser } from '$app/environment';
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from 'firebase/auth';

let user = $state<User | null>(null);
let loading = $state(true);

if (browser) {
	import('./client').then(({ auth }) => {
		onAuthStateChanged(auth, (firebaseUser) => {
			user = firebaseUser;
			loading = false;
		});
	});
}

export const authState = {
	get user() {
		return user;
	},
	get loading() {
		return loading;
	},
	async signOut() {
		const { auth } = await import('./client');
		await firebaseSignOut(auth);
	}
};
