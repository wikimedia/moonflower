import type { WikiCard } from "../types";
import type { SpreadTheme } from "./themes";

const MODEL = "gemini-2.0-flash";
const TIMEOUT_MS = 5000;

function apiKey(): string {
  return import.meta.env.VITE_GEMINI_API_KEY ?? "";
}

function buildUserPrompt(
  card: WikiCard,
  slotLabel: string,
  theme: SpreadTheme,
): string {
  return [
    `Article: "${card.title}" — ${card.category}`,
    `Summary: ${card.articleQuote}`,
    `Context label: "${slotLabel}"`,
    `Theme: "${theme.headline}"`,
    "",
    "Write one or two sentences addressing the player about this article in relation to their label.",
  ].join("\n");
}

const SYSTEM_PROMPT =
  'You write one or two short sentences spoken directly to the player in second person ("you"). ' +
  "Ground it in a real fact from the Wikipedia article. " +
  "Connect it to the context label as if reading the card for them personally. " +
  "Write in naturally spoken English, the way you would say it out loud to someone. " +
  "No colons. No hyphens or dashes. No em dashes. No semicolons. No quotes around card titles. " +
  'No "this card". No "maps to" or academic phrasing. No flowery language. ' +
  "Start from the label or from the player, not from the article title.";

function isPlaceholderKey(key: string): boolean {
  const k = key.trim();
  return (
    !k ||
    k === "your-key-here" ||
    k.startsWith("sk-ant-your-key") ||
    !k.startsWith("AIza")
  );
}

export async function generateExplanation(
  card: WikiCard,
  slotLabel: string,
  theme: SpreadTheme,
): Promise<string> {
  const key = apiKey();
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
      hypothesisId: "H2_keyMalformedOrPlaceholder",
      location: "src/lib/gemini.ts:45",
      message: "Gemini request starting with key shape metadata",
      data: {
        title: card.title,
        slotLabel,
        keyLength: key.length,
        keyPrefix: key.slice(0, 6),
        placeholderDetected: isPlaceholderKey(key),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  if (isPlaceholderKey(key)) {
    throw new Error("No API key configured");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: buildUserPrompt(card, slotLabel, theme) }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 120,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
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
          location: "src/lib/gemini.ts:76",
          message: "Gemini API returned non-OK status",
          data: {
            status: res.status,
            statusText: res.statusText,
            title: card.title,
            responsePreview: errText.slice(0, 240),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      throw new Error(`Gemini API error ${res.status}`);
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
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
        hypothesisId: "H3_responseParseOrStyleIssue",
        location: "src/lib/gemini.ts:87",
        message: "Gemini response text extracted",
        data: {
          title: card.title,
          hasText: Boolean(text),
          hasColon: Boolean(text?.includes(":")),
          hasDash: Boolean(text?.includes("-") || text?.includes("—")),
          sample: text?.slice(0, 120) ?? "",
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    if (!text) throw new Error("Empty response from API");
    return text;
  } catch (error) {
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
        location: "src/lib/gemini.ts:109",
        message: "Gemini generation threw error",
        data: {
          title: card.title,
          error:
            error instanceof Error ? error.message : "Unknown non-Error throw",
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}
