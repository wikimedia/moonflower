import { useState } from "react";
import type { WikiCard } from "../types";
import { fetchCardPack } from "../lib/wikipedia";
import { pickRandomTheme, type SpreadTheme } from "../lib/themes";

interface PullPageProps {
  onPackReady: (cards: WikiCard[], theme: SpreadTheme) => void;
}

export function PullPage({ onPackReady }: PullPageProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewTheme, setPreviewTheme] = useState<SpreadTheme | null>(null);

  async function handlePull() {
    setError(null);
    const theme = pickRandomTheme();
    setPreviewTheme(theme);
    setLoading(true);
    try {
      const pack = await fetchCardPack(3);
      onPackReady(pack, theme);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const ledeTheme = previewTheme;

  return (
    <div className="pull-page">
      <p className="pull-lede">
        {ledeTheme
          ? ledeTheme.headline
          : "Pull three illustrated Wikipedia articles. A random prompt frames your spread — then keep one card."}
      </p>
      <button
        type="button"
        className="btn btn-primary btn-pull"
        onClick={handlePull}
        disabled={loading}
      >
        {loading ? "Consulting the archives…" : "Pull"}
      </button>
      {loading && <div className="pull-skeleton" aria-hidden />}
      {error && (
        <p className="pull-error" role="alert">
          {error}
        </p>
      )}
      <footer className="wiki-attribution">
        Text and images from{" "}
        <a
          href="https://en.wikipedia.org"
          target="_blank"
          rel="noreferrer noopener"
        >
          Wikipedia
        </a>{" "}
        (CC BY-SA).
      </footer>
    </div>
  );
}
