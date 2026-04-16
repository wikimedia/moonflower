import type { RarityTier } from "../types";

export interface RaritySignals {
  revisionBytes: number;
  categoryCount: number;
  extractLength: number;
  categoryTitles: string[];
}

function featuredBonus(titles: string[]): number {
  let b = 0;
  for (const t of titles) {
    const l = t.toLowerCase();
    if (l.includes("featured articles") || l.includes("featured article")) b += 80;
    if (l.includes("good articles") || l.includes("good article")) b += 40;
  }
  return Math.min(b, 120);
}

export function rarityFromSignals(s: RaritySignals): {
  tier: RarityTier;
  score: number;
} {
  const base =
    Math.log10(Math.max(s.revisionBytes, 1)) * 35 +
    Math.min(s.categoryCount, 40) * 1.2 +
    Math.min(s.extractLength, 1200) * 0.04 +
    featuredBonus(s.categoryTitles);

  const score = Math.round(base * 10) / 10;

  let tier: RarityTier;
  if (score < 58) tier = "common";
  else if (score < 72) tier = "uncommon";
  else if (score < 88) tier = "rare";
  else tier = "mythic";

  return { tier, score };
}

export function rarityLabel(tier: RarityTier): string {
  switch (tier) {
    case "common":
      return "Common";
    case "uncommon":
      return "Uncommon";
    case "rare":
      return "Rare";
    case "mythic":
      return "Mythic";
    default:
      return tier;
  }
}
