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
		slug: 'gacha-stream',
		name: en.experiments.gachaStream.name,
		description: en.experiments.gachaStream.description,
		color: '#34d399'
	}
];
