import type { Experiment } from '$lib/types';
import { en } from '$lib/i18n/en';

/**
 * Central registry of all gacha experiments.
 *
 * To add a new experiment:
 * 1. Create a route directory at `src/routes/<slug>/`
 * 2. Add an entry to this array
 * 3. Add i18n strings under `en.experiments.<slug>`
 */
export const experiments: Experiment[] = [
	{
		slug: 'example',
		name: en.experiments.example.name,
		description: en.experiments.example.description,
		color: '#a78bfa'
	},
	{
		slug: '3-theme-spread',
		name: en.experiments.threeThemeSpread.name,
		description: en.experiments.threeThemeSpread.description,
		color: '#f472b6'
	},
	{
		slug: 'gatcha-drop',
		name: en.experiments.gatchaDrop.name,
		description: en.experiments.gatchaDrop.description,
		color: '#c084fc'
	},
	{
		slug: 'fakeout',
		name: en.experiments.fakeout.name,
		description: en.experiments.fakeout.description,
		color: '#22d3ee'
	},
	{
		slug: 'fakeout-swipe',
		name: en.experiments.fakeoutSwipe.name,
		description: en.experiments.fakeoutSwipe.description,
		color: '#38bdf8'
	},
	{
		slug: 'gacha-stream',
		name: en.experiments.gachaStream.name,
		description: en.experiments.gachaStream.description,
		color: '#34d399'
	},
	{
		slug: 'test-probe',
		name: en.experiments.testProbe.name,
		description: en.experiments.testProbe.description,
		color: '#f59e0b'
	},
	{
		slug: 'walk',
		name: en.experiments.walk.name,
		description: en.experiments.walk.description,
		color: '#fb7185'
	},
	{
		slug: 'browse',
		name: en.experiments.browse.name,
		description: en.experiments.browse.description,
		color: '#4ade80'
	},
	{
		slug: 'wiki-crawler',
		name: en.experiments.wikiCrawler.name,
		description: en.experiments.wikiCrawler.description,
		color: '#60a5fa'
	},
	{
		slug: 'design-card',
		name: en.experiments.designCard.name,
		description: en.experiments.designCard.description,
		color: '#d4a574'
	}
];
