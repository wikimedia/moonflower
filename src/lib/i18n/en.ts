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
		}
	},
	errors: {
		pullFailed: 'Failed to pull articles. Try again.'
	},
	toast: {
		pulled: 'Articles pulled!'
	}
} as const;
