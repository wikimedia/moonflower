export const en = {
	common: {
		appName: 'MOONFLOWER',
		tagline: 'A Wikipedia gacha experiment platform.',
		loading: 'Loading...',
		ok: 'OK'
	},
	hub: {
		heading: 'EXPERIMENTS',
		subtitle: 'Choose an experiment to play.',
		empty: 'No experiments available yet.'
	},
	shared: {
		pullButton: '[ PULL ]',
		pulling: 'PULLING...',
		revealHint: '?',
		readMore: '[ READ MORE ]',
		collapse: '[ COLLAPSE ]',
		arrow: '→',
		noPulls: 'Tap pull to begin.',
		emptyPull: 'No articles found. Try again.'
	},
	experiments: {
		example: {
			name: 'EXAMPLE',
			description: 'The classic pull-and-reveal gacha mechanic.',
			pullPrompt: 'Pull to discover random Wikipedia articles.'
		},
		fakeout: {
			name: 'FAKEOUT',
			description: 'Deal drifting cards, build a collection, avoid decoys.',
			dealButton: '[ DEAL ]',
			dealAgainButton: '[ DEAL AGAIN ]',
			endDealButton: '[ END DEAL ]',
			collectionButton: '[ COLLECTION ]',
			takeButton: '[ TAKE ]',
			takenButton: '[ TAKEN ]',
			dealing: 'DEALING...',
			statusReady: 'Run available.',
			statusActive: 'Run active. Pick wisely.',
			statusEnded: 'Run over. Return after cooldown.',
			statusFailed: 'You took a fake. Run failed.',
			statusMaxDealt: 'You reached the 20 card limit.',
			cardsDealt: 'Cards dealt',
			cardsTaken: 'Cards taken',
			fakesFellFor: 'Fakes fell for',
			cooldown: 'Next run in',
			handTitle: 'Current hand',
			emptyHand: 'Deal to draw five cards.',
			collectionTitle: 'Collection',
			collectionEmpty: 'No cards collected yet.',
			fakesTitle: 'Fake cards you fell for',
			fakesEmpty: 'No fake cards taken yet.',
			runEnded: 'Run ended.',
			takenStamp: 'TAKEN',
			fakeWarningTitle: 'FAKE CARD WARNING',
			fakeWarningBody: 'Taking a fake card ends your draw run immediately. Be careful before you tap.',
			fakeWarningConfirm: '[ I UNDERSTAND ]',
			noPickWarningTitle: 'PICK BEFORE DEALING AGAIN',
			noPickWarningBody: 'You need to click at least one card before dealing again.',
			noPickWarningConfirm: '[ GOT IT ]',
			failureTitle: 'FAKE TAKEN',
			failureBody: 'The illusion breaks. This run is over.'
		}
	},
	errors: {
		pullFailed: 'Failed to pull articles. Try again.'
	},
	toast: {
		pulled: 'Articles pulled!'
	}
} as const;
