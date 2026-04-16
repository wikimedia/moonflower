import type { WikiCard } from "../types";

function ensureSentence(line: string): string {
  const cleaned = line.replace(/\s+/g, " ").trim();
  if (!cleaned) return "No summary line available for this card.";
  if (/[.!?]$/.test(cleaned)) return cleaned;
  return `${cleaned}.`;
}

function stripTrailingPunctuation(s: string): string {
  return s.replace(/[.!?]+$/, "").trim();
}

/** Short, factual line tying the card to the slot label. */
export function factualLineForSlot(card: WikiCard, slotLabel: string): string {
  const category = card.category || "general knowledge";
  const label = slotLabel.replace(/\s+/g, " ").trim();
  const fact = stripTrailingPunctuation(ensureSentence(card.articleQuote));
  return `Your ${label.toLowerCase()} is ${card.title} from ${category}. ${fact}.`;
}

const CARD_QUOTE_MAX = 100;

function truncateFit(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  if (max <= 1) return "…";
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Picks a lead sentence that fits the fixed card quote area (length cap).
 */
export function pickShortArticleQuote(
  extract: string,
  maxLen: number = CARD_QUOTE_MAX,
): string {
  const text = extract.replace(/\s+/g, " ").trim();
  if (!text) return "No summary line available for this card.";

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);

  const fitting = sentences.filter((s) => s.length <= maxLen);
  if (fitting.length) {
    fitting.sort((a, b) => b.length - a.length);
    return fitting[0]!;
  }

  const shortest = [...sentences].sort((a, b) => a.length - b.length)[0];
  if (shortest) return truncateFit(shortest, maxLen);

  return truncateFit(text, maxLen);
}
