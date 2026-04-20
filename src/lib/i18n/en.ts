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
