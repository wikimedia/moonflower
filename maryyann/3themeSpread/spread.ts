import type { ThemeI18n } from './types';

const CARD_QUOTE_MAX = 100;

function ensureSentence(line: string): string {
	const cleaned = line.replace(/\s+/g, ' ').trim();
	if (!cleaned) return '';
	if (/[.!?]$/.test(cleaned)) return cleaned;
	return `${cleaned}.`;
}

/** Short lede from article extract for template `{lede}` — no network, no API keys. */
export function ledeFromExtract(extract: string, maxLen = CARD_QUOTE_MAX): string {
	const text = extract.replace(/\s+/g, ' ').trim();
	if (!text) return '';

	const sentences = text
		.split(/(?<=[.!?])\s+/)
		.map((s) => s.trim())
		.filter((s) => s.length > 12);

	const fitting = sentences.filter((s) => s.length <= maxLen);
	if (fitting.length) {
		fitting.sort((a, b) => b.length - a.length);
		return ensureSentence(fitting[0]!);
	}

	const shortest = [...sentences].sort((a, b) => a.length - b.length)[0];
	if (shortest) {
		const t = shortest.trim();
		if (t.length <= maxLen) return ensureSentence(t);
		return ensureSentence(`${t.slice(0, Math.max(1, maxLen - 1)).trimEnd()}…`);
	}

	const t = text.slice(0, maxLen).trimEnd();
	return ensureSentence(t.length < text.length ? `${t}…` : t);
}

export function substituteTemplate(template: string, title: string, lede: string): string {
	return template.replaceAll('{title}', title).replaceAll('{lede}', lede);
}

export function pickSlotLabels(theme: ThemeI18n): [string, string, string] {
	const variants = theme.slotLabelVariants;
	const row = variants[Math.floor(Math.random() * variants.length)] ?? variants[0]!;
	return [row[0]!, row[1]!, row[2]!];
}

export function buildSlotLines(
	theme: ThemeI18n,
	articles: readonly { title: string; extract: string }[]
): [string, string, string] {
	const out: string[] = [];
	for (let slot = 0; slot < 3; slot++) {
		const pool = theme.slotTemplates[slot]!;
		const tpl = pool[Math.floor(Math.random() * pool.length)] ?? pool[0]!;
		const article = articles[slot]!;
		const lede = ledeFromExtract(article.extract);
		out.push(substituteTemplate(tpl, article.title, lede));
	}
	return [out[0]!, out[1]!, out[2]!];
}
