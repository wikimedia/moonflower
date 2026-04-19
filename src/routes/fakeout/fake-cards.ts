import type { FakeCard } from './types';

// JSON-style source for known decoy cards used by fakeout.
export const fakeCards: FakeCard[] = [
	{
		id: 'fc-astral-proxy',
		title: 'Astral Proxy Index',
		extract:
			'An authoritative-looking index of interstellar logistics nodes that never existed outside a single satirical zine.',
		thumbnail:
			'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Crystal_Clear_app_ksirtet.svg/512px-Crystal_Clear_app_ksirtet.svg.png',
		fakeReason: 'The citation trail loops back to itself.'
	},
	{
		id: 'fc-lunar-mint',
		title: 'Lunar Mint Treaty',
		extract:
			'A supposed 19th-century treaty standardizing coin presses on the moon decades before practical rocketry.',
		thumbnail:
			'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Simpleicons_Places_moon-and-stars.svg/512px-Simpleicons_Places_moon-and-stars.svg.png',
		fakeReason: 'The timeline contradicts known launch history.'
	},
	{
		id: 'fc-cloud-archive',
		title: 'Cloud Archive Project',
		extract:
			'A documentation effort claiming weather fronts can be serialized as legal records and replayed in court.',
		thumbnail:
			'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/OOjs_UI_icon_cloud.svg/512px-OOjs_UI_icon_cloud.svg.png',
		fakeReason: 'The methods section uses impossible instrumentation.'
	},
	{
		id: 'fc-echo-parliament',
		title: 'Echo Parliament',
		extract:
			'A short-lived assembly where votes were allegedly cast by acoustic resonance in cathedral halls.',
		thumbnail:
			'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/OOjs_UI_icon_speechBubbles-ltr.svg/512px-OOjs_UI_icon_speechBubbles-ltr.svg.png',
		fakeReason: 'Primary sources are paraphrases with no originals.'
	},
	{
		id: 'fc-solar-vine',
		title: 'Solar Vine Cartography',
		extract:
			'A mapping discipline that treated sunbeam paths as fixed roads between settlements.',
		thumbnail:
			'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Antu_weather-clear.svg/512px-Antu_weather-clear.svg.png',
		fakeReason: 'Seasonal drift makes the core premise unusable.'
	},
	{
		id: 'fc-vacuum-opera',
		title: 'Vacuum Opera Movement',
		extract:
			'An avant-garde opera movement said to perform entirely in silent chambers with audience interpretation scores.',
		thumbnail:
			'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/OOjs_UI_icon_musicalScore-ltr.svg/512px-OOjs_UI_icon_musicalScore-ltr.svg.png',
		fakeReason: 'No venue logs or performers can be independently verified.'
	},
	{
		id: 'fc-orbit-bazaar',
		title: 'Orbit Bazaar Protocol',
		extract:
			'A trade protocol where contracts were finalized only during apogee to improve bargaining clarity.',
		thumbnail:
			'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/OOjs_UI_icon_tag.svg/512px-OOjs_UI_icon_tag.svg.png',
		fakeReason: 'Economic claims are sourced to fictional agencies.'
	},
	{
		id: 'fc-pale-signal',
		title: 'Pale Signal Conspiracy',
		extract:
			'A fringe theory that all lighthouse beams encoded parliamentary debates from lost island states.',
		thumbnail:
			'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/OOjs_UI_icon_bell.svg/512px-OOjs_UI_icon_bell.svg.png',
		fakeReason: 'Signal decoding tables are mathematically inconsistent.'
	}
];
