/** Shape of the fixed spread theme under `en.experiments.threeThemeSpread.spreadTheme`. */
export type ThemeI18n = {
	readonly id: string;
	readonly headline: string;
	readonly slotLabelVariants: readonly (readonly [string, string, string])[];
	readonly slotTemplates: readonly [readonly string[], readonly string[], readonly string[]];
};
