export type TarotSlot = "past" | "present" | "future";

export type RarityTier = "common" | "uncommon" | "rare" | "mythic";

export interface WikiCard {
  pageid: number;
  title: string;
  articleUrl: string;
  imageUrl: string;
  category: string;
  articleQuote: string;
  rarity: RarityTier;
  rarityScore: number;
}

export interface SpreadCard extends WikiCard {
  slot: TarotSlot;
  inspirationalLine: string;
  slotDescription: string;
}
