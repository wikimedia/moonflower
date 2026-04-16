import { useEffect, useMemo, useState } from "react";
import type { SpreadCard, WikiCard } from "../types";
import type { SpreadTheme } from "../lib/themes";
import { buildSpreadCards } from "../lib/spread";
import { saveKeptCard } from "../lib/collection";
import { TarotSpread } from "../components/TarotSpread";

interface SpreadPageProps {
  pack: WikiCard[];
  theme: SpreadTheme;
  onDoneKeep: () => void;
  onCardsBuilt?: (cards: SpreadCard[]) => void;
}

const FLIP_STAGGER_MS = 420;
const INITIAL_FLIP_DELAY_MS = 120;

export function SpreadPage({ pack, theme, onDoneKeep, onCardsBuilt }: SpreadPageProps) {
  const [cards, setCards] = useState<SpreadCard[] | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<[boolean, boolean, boolean]>([
    false,
    false,
    false,
  ]);

  const packKey = useMemo(
    () => pack.map((c) => c.pageid).join(","),
    [pack],
  );

  useEffect(() => {
    let cancelled = false;
    setCards(null);
    setRevealed([false, false, false]);

    buildSpreadCards(pack, theme).then((built) => {
      if (cancelled) return;
      setCards(built);
      onCardsBuilt?.(built);
    });

    return () => {
      cancelled = true;
    };
  }, [packKey, theme]);

  useEffect(() => {
    if (!cards) return;
    setRevealed([false, false, false]);
    const t0 = window.setTimeout(() => {
      setRevealed([true, false, false]);
    }, INITIAL_FLIP_DELAY_MS);
    const t1 = window.setTimeout(() => {
      setRevealed([true, true, false]);
    }, INITIAL_FLIP_DELAY_MS + FLIP_STAGGER_MS);
    const t2 = window.setTimeout(() => {
      setRevealed([true, true, true]);
    }, INITIAL_FLIP_DELAY_MS + FLIP_STAGGER_MS * 2);
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [cards]);

  const selectable = revealed[0] && revealed[1] && revealed[2];

  function handleSelectCard(card: SpreadCard) {
    if (!selectable) return;
    setSelected(card.pageid);
    saveKeptCard(card);
    window.setTimeout(() => {
      onDoneKeep();
    }, 450);
  }

  if (!cards) {
    return (
      <div className="spread-page">
        <p className="spread-hint">Reading the cards…</p>
        <div className="pull-skeleton" aria-hidden />
      </div>
    );
  }

  return (
    <div className="spread-page">
      <p className="spread-hint">
        {selectable
          ? "Tap the card you want to keep for your collection."
          : "Cards are flipping into place…"}
      </p>
      <TarotSpread
        cards={cards}
        theme={theme}
        revealed={revealed}
        selectable={selectable}
        selectedPageid={selected}
        onSelectCard={handleSelectCard}
      />
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
