import type { ThemeI18n } from '../../../maryyann/3themeSpread/types';

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
		threeThemeSpread: {
			name: '3 THEME SPREAD',
			description:
				'Pull three articles, read them as past, present, and future, then keep one card.',
			pullPrompt:
				'Pull three illustrated articles. Past, present, and future frame your spread — then keep one card.',
			attributionLead: 'Text and images from',
			attributionTrail: '(CC BY-SA).',
			spreadWaiting: 'Cards are flipping into place…',
			spreadSelect: 'Tap the card you want to keep.',
			footerWikiLine: 'Text and images from Wikipedia (CC BY-SA).',
			wikipediaLinkLabel: 'Wikipedia',
			wikipediaHomeUrl: 'https://en.wikipedia.org/wiki/Main_Page',
			shareButton: '[ SHARE ]',
			shareCopied: 'Copied to clipboard.',
			shareShared: 'Shared.',
			shareFailed: 'Could not share. Try again.',
			newPullButton: '[ NEW PULL ]',
			keepButton: '[ KEEP ]',
			openArticleButton: '[ OPEN ]',
			cardBackLetter: 'W',
			funFactHeading: 'FUN FACT',
			descriptionHeading: 'FROM THE ARTICLE',
			mobileSwipeHint: 'Swipe sideways for the next card.',
			prevCard: '[ PREV ]',
			nextCard: '[ NEXT ]',
			spreadTheme: {
				id: 'past-present-future',
				headline: 'PAST, PRESENT, FUTURE',
				slotLabelVariants: [['Past', 'Present', 'Future']],
				slotTemplates: [
					[
						'The past echoes in {title}; {lede}',
						'What came before leans on {title}; {lede}',
						'History nods at {title}; {lede}'
					],
					[
						'The present centers on {title}; {lede}',
						'Right now the story is {title}; {lede}',
						'Today turns on {title}; {lede}'
					],
					[
						'Ahead lies {title}; {lede}',
						'The line forward runs through {title}; {lede}',
						'What comes next whispers {title}; {lede}'
					]
				]
			} satisfies ThemeI18n
		},
		gatchaDrop: {
			name: 'GATCHA DROP',
			description:
				'Articles rain down in a physics pile. Tap thumbnails to peek cards, and collect five unique articles.',
			pullPrompt: 'Pull a pile of illustrated articles. Collect five to finish the round.',
			pullLoadingMessage: 'Gathering articles',
			pullLoadingHint: 'Hang tight',
			collectedProgress: (n: number) => `Collected ${n} / 5`,
			articleQuoteHeading: 'Interesting quote',
			collectButton: '[ COLLECT ]',
			collectedAlready: 'Already collected',
			collectFull: 'Five collected',
			wikiLinkLabel: '[ READ ON WIKIPEDIA ]',
			winTitle: 'You kept five',
			winBody: 'Nice dig — those articles are yours for this round.',
			newPullButton: '[ NEW PULL ]',
			footerWikiLine: 'Text and images from Wikipedia (CC BY-SA).',
			closeCardAriaLabel: 'Close card'
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
		},
		walk: {
			name: 'WALK',
			description: 'Type a Wikipedia title, then watch a random neighbor walk settle on one final card.',
			seedPrompt: 'Type a Wikipedia article title to begin the walk.',
			inputLabel: 'Seed article',
			inputPlaceholder: 'Start typing a title...',
			suggestionsHeading: 'Suggestions',
			suggestionsLoading: 'Searching...',
			suggestionsEmpty: 'No matching titles.',
			pickHint: 'Pick one suggestion or press Enter to use your typed title.',
			startButton: '[ START WALK ]',
			runningLabel: 'Walk running',
			hopLabel: 'Hop',
			ofLabel: 'of',
			seedLabel: 'Seed',
			currentLabel: 'Current article',
			graphLabel: 'Node graph',
			neighborsLabel: 'Nearby links',
			pathLabel: 'Path taken',
			pathHint: 'The highlighted route shows each hop from the seed to the final article.',
			selectionLabel: 'Selecting next link',
			settledLabel: 'Walk settled',
			noNeighbors: 'No neighbors available here. Settling now.',
			fetchError: 'Could not continue the walk. Try again.',
			finalHeading: 'Final pull',
			finalEmpty: 'No card was returned for the final title.',
			finalLoading: 'Fetching final card...',
			wikiLinkLabel: '[ READ ON WIKIPEDIA ]',
			restartSameSeed: '[ WALK AGAIN ]',
			chooseNewSeed: '[ NEW SEED ]'
		}
	},
	errors: {
		pullFailed: 'Failed to pull articles. Try again.'
	},
	toast: {
		pulled: 'Articles pulled!'
	}
} as const;
