/**
 * Returns the first sentence of a plaintext Wikipedia intro extract.
 * Falls back to the full string when no clear sentence boundary is found.
 */
export function firstIntroSentence(extract: string): string {
	const t = extract.trim();
	if (!t) return '';

	const match = t.match(/^[\s\S]+?[.!?](?=\s|$)/);
	if (match) return match[0]!.trim();

	return t;
}
