export const en = {
	common: {
		appName: 'MOONFLOWER',
		tagline: 'Pull. Claim. Collect.',
		loading: 'Loading...',
		ok: 'OK',
		claimed: 'CLAIMED'
	},
	nav: {
		pull: '[ PULL ]',
		inventory: '[ INVENTORY ]'
	},
	gacha: {
		pullButton: '[ PULL ]',
		claimButton: '[ CLAIM ]',
		revealHint: '?',
		pulling: 'PULLING...',
		noPulls: 'Tap pull to begin.',
		emptyPull: 'No unclaimed articles found. Try again.',
		readMore: '[ READ MORE ]',
		collapse: '[ COLLAPSE ]'
	},
	auth: {
		emailPlaceholder: 'your@email.com',
		sendLink: '[ SEND MAGIC LINK ]',
		checkEmail: 'Check your email.',
		emailSent: 'A sign-in link has been sent to your inbox.',
		emailPrompt: 'Please provide your email for confirmation',
		verifying: 'VERIFYING...',
		signOut: '[ SIGN OUT ]',
		signInToClaim: 'Sign in to claim this card.'
	},
	inventory: {
		title: 'INVENTORY',
		empty: 'Nothing here yet. Go pull some cards.',
		releaseButton: '[ RELEASE ]',
		releaseConfirm: 'Release this card back into the wild?',
		cardCount: (n: number) => `${n} card${n === 1 ? '' : 's'}`
	},
	errors: {
		unauthorized: 'You must be signed in.',
		invalidToken: 'Invalid authentication token.',
		alreadyClaimed: 'Too slow! Someone else just claimed this card.',
		claimFailed: 'Failed to claim card. Try again.',
		pullFailed: 'Failed to pull cards. Try again.',
		authFailed: 'Authentication failed. Please try again.'
	},
	toast: {
		claimed: 'Card claimed!',
		released: 'Card released back into the wild.',
		tooSlow: 'Too slow! Someone else just claimed this card.',
		linkSent: 'Magic link sent! Check your email.'
	}
} as const;
