import type { SpreadCard, WikiCard } from "../types";
import type { SpreadTheme } from "./themes";
import { factualLineForSlot } from "./quotes";
import { generateExplanation } from "./gemini";

const SLOTS = ["past", "present", "future"] as const;

function slotLabel(slot: (typeof SLOTS)[number], theme: SpreadTheme): string {
  if (slot === "past") return theme.slotLabels[0];
  if (slot === "present") return theme.slotLabels[1];
  return theme.slotLabels[2];
}

async function explanationForCard(
  card: WikiCard,
  label: string,
  theme: SpreadTheme,
): Promise<string> {
  try {
    const text = await generateExplanation(card, label, theme);
    // #region agent log
    fetch("http://127.0.0.1:7460/ingest/4fe380ab-39b0-4940-96a7-c5508aee6536", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "678b9f",
      },
      body: JSON.stringify({
        sessionId: "678b9f",
        runId: "gemini-style-debug-pre-fix",
        hypothesisId: "H4_oldStyleFromFallbackOrCachedBundle",
        location: "src/lib/spread.ts:21",
        message: "Using Gemini-generated explanation",
        data: {
          title: card.title,
          label,
          hasColon: text.includes(":"),
          sample: text.slice(0, 120),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return text;
  } catch (error) {
    const fallback = factualLineForSlot(card, label);
    // #region agent log
    fetch("http://127.0.0.1:7460/ingest/4fe380ab-39b0-4940-96a7-c5508aee6536", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "678b9f",
      },
      body: JSON.stringify({
        sessionId: "678b9f",
        runId: "gemini-style-debug-pre-fix",
        hypothesisId: "H1_fallbackTriggeredByGeminiFailure",
        location: "src/lib/spread.ts:42",
        message: "Using fallback explanation",
        data: {
          title: card.title,
          label,
          fallbackHasColon: fallback.includes(":"),
          error:
            error instanceof Error ? error.message : "Unknown non-Error throw",
          fallbackSample: fallback.slice(0, 120),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return fallback;
  }
}

export async function buildSpreadCards(
  pack: WikiCard[],
  theme: SpreadTheme,
): Promise<SpreadCard[]> {
  const entries = pack.map((card, i) => {
    const slot = SLOTS[i] ?? "future";
    const label = slotLabel(slot, theme);
    return { card, slot, label };
  });

  const lines = await Promise.all(
    entries.map(({ card, label }) => explanationForCard(card, label, theme)),
  );

  return entries.map(({ card, slot }, i) => ({
    ...card,
    slot,
    inspirationalLine: lines[i] ?? factualLineForSlot(card, slotLabel(slot, theme)),
    slotDescription: card.articleQuote,
  }));
}
