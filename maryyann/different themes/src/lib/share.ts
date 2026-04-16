import type { SpreadCard } from "../types";
import type { SpreadTheme } from "./themes";
import { rarityLabel } from "./rarity";

function slotLabel(theme: SpreadTheme, slot: SpreadCard["slot"]): string {
  if (slot === "past") return theme.slotLabels[0];
  if (slot === "present") return theme.slotLabels[1];
  return theme.slotLabels[2];
}

export function formatSpreadShareText(
  cards: SpreadCard[],
  theme: SpreadTheme,
): string {
  const lines = cards.map(
    (c) =>
      `${slotLabel(theme, c.slot)}: ${c.title} (${rarityLabel(c.rarity)}) — ${c.articleUrl}`,
  );
  return [
    theme.headline,
    "",
    ...lines,
    "",
    "Pulled from Wikipedia (CC BY-SA).",
  ].join("\n");
}

export async function shareSpreadText(text: string): Promise<boolean> {
  const nav = navigator as Navigator & {
    share?: (data: ShareData) => Promise<void>;
    canShare?: (data: ShareData) => boolean;
  };
  if (typeof nav.share === "function") {
    const data: ShareData = { title: "Different Themes", text };
    if (typeof nav.canShare === "function" && !nav.canShare(data)) {
      // fall through to clipboard
    } else {
      await nav.share(data);
      return true;
    }
  }
  await navigator.clipboard.writeText(text);
  return false;
}
