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
		testProbe: {
			name: 'TEST PROBE',
			description: 'Ping the backend test endpoint and inspect its TEST env value.',
			headline: 'Backend Environment Probe',
			hint: 'This experiment reads the TEST variable from /api/test.',
			refreshButton: '[ REFRESH ]',
			loading: 'CHECKING...',
			error: 'Could not reach /api/test.',
			endpointLabel: 'Endpoint',
			variableLabel: 'Variable',
			valueLabel: 'Value',
			endpointValue: '/api/test',
			variableName: 'TEST',
			notSet: 'Not set'
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
		},
		gachaStream: {
			name: 'GACHA STREAM',
			description: 'Catch live Wikipedia edits as collectible cards.',
			streamTag: 'LIVE STREAM',
			collectionTag: 'COLLECTION',
			viewCollection: '[ VIEW COLLECTION ]',
			backToStream: '[ BACK TO STREAM ]',
			statusConnecting: 'CONNECTING',
			statusLive: 'LIVE',
			statusReconnecting: 'RECONNECTING',
			statusDisconnected: 'DISCONNECTED',
			streamHint: 'Article edits glide across the screen. Let them pass to claim cards.',
			collectionHint: 'Scroll your captured cards. Newest cards appear first.',
			emptyCollection: 'No cards collected yet. Watch the stream to earn cards.',
			editorPrefix: 'Edited by',
			typePrefix: 'Change type',
			unknownEditor: 'Unknown editor',
			unknownType: 'unknown',
			rewardPrefix: 'CARD ACQUIRED',
			itemsLabel: 'Active',
			cardsLabel: 'Cards',
			burstReady: '[ STARBURST DROP ]',
			burstLoading: 'SUMMONING...',
			burstCooldown: 'RECHARGING',
			burstProgress: 'Drop charge',
			burstSource: 'Starburst Feed',
			burstType: 'drop',
			noSummary: 'No summary available yet.',
			rarityLabel: 'Rarity',
			rarities: {
				common: 'COMMON',
				rare: 'RARE',
				epic: 'EPIC',
				legendary: 'LEGENDARY'
			}
		}
	},
	errors: {
		pullFailed: 'Failed to pull articles. Try again.'
	},
	toast: {
		pulled: 'Articles pulled!'
	}
} as const;
