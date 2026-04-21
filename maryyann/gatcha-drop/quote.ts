const SENTENCE_SPLIT = /(?<=[.!?])\s+/;

/**
 * Short quote for peek UI: up to two intro sentences, capped by max length.
 */
export function trimArticleQuote(extract: string, maxLen = 240): string {
	const trimmed = extract.trim();
	if (!trimmed) return '';

	const sentences = trimmed.split(SENTENCE_SPLIT).filter(Boolean);
	const first = sentences[0] ?? '';
	const two = sentences.slice(0, 2).join(' ');
	const body = two.length <= maxLen ? two : first;

	if (body.length <= maxLen) return body;
	return `${body.slice(0, Math.max(1, maxLen - 1))}…`;
}
