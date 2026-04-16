import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SpreadCard } from "../types";
import type { SpreadTheme } from "../lib/themes";
import { rarityLabel } from "../lib/rarity";
import { useMatchMedia } from "../hooks/useMatchMedia";

function slotHeading(theme: SpreadTheme, slot: SpreadCard["slot"]): string {
  if (slot === "past") return theme.slotLabels[0];
  if (slot === "present") return theme.slotLabels[1];
  return theme.slotLabels[2];
}

interface TarotSpreadProps {
  cards: SpreadCard[];
  theme: SpreadTheme;
  revealed: [boolean, boolean, boolean];
  selectable: boolean;
  selectedPageid: number | null;
  onSelectCard: (card: SpreadCard) => void;
}

const SWIPE_PX = 56;
const DESKTOP_MIN = "(min-width: 720px)";

function stackOffset(activeIndex: number, cardIndex: number): number {
  return (cardIndex - activeIndex + 3) % 3;
}

interface TarotFlipCardProps {
  card: SpreadCard;
  label: string;
  revealed: boolean;
  selectable: boolean;
  selected: boolean;
  onSelect: () => void;
}

function TarotFlipCard({
  card,
  label,
  revealed,
  selectable,
  selected,
  onSelect,
}: TarotFlipCardProps) {
  const isRevealed = revealed;
  const canTap = selectable && isRevealed;
  return (
    <article className="tarot-card">
      <div className="tarot-flip-scene">
        <div
          className={`tarot-flip-inner ${isRevealed ? "tarot-flip-inner--revealed" : ""}`}
        >
          <div className="tarot-flip-face tarot-flip-face--back" aria-hidden>
            <span className="tarot-flip-face--back-text">W</span>
          </div>
          <button
            type="button"
            className="tarot-flip-face tarot-flip-face--front tarot-card-body"
            onClick={() => onSelect()}
            aria-pressed={selected}
            aria-label={`Keep ${card.title} from ${label}`}
            aria-disabled={!canTap}
            disabled={!canTap}
          >
            <div className="tarot-image-wrap">
              <img
                src={card.imageUrl}
                alt=""
                className="tarot-image"
                loading="lazy"
              />
              <div className="tarot-card-gradient" aria-hidden />
              <span className={`rarity rarity--${card.rarity}`}>
                {rarityLabel(card.rarity)}
              </span>
              <div className="tarot-meta">
                <h3 className="tarot-title">{card.title}</h3>
                <p className="tarot-category">{card.category}</p>
                <p className="tarot-quote">{card.slotDescription}</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </article>
  );
}

function TarotSpreadDesktop({
  cards,
  theme,
  revealed,
  selectable,
  selectedPageid,
  onSelectCard,
}: TarotSpreadProps) {
  return (
    <div className="tarot tarot--desktop">
      {cards.map((card, index) => {
        const selected = selectedPageid === card.pageid;
        const isRevealed = revealed[index] ?? false;
        const label = slotHeading(theme, card.slot);
        return (
          <section
            key={card.pageid}
            className={`tarot-column ${selected ? "tarot-column--selected" : ""}`}
          >
            <header className="tarot-slot">
              <h2 className="tarot-slot-title">{label}</h2>
            </header>

            <TarotFlipCard
              card={card}
              label={label}
              revealed={isRevealed}
              selectable={selectable}
              selected={selected}
              onSelect={() => onSelectCard(card)}
            />

            <p className="tarot-slot-reading">{card.inspirationalLine}</p>
          </section>
        );
      })}
    </div>
  );
}

function TarotSpreadMobile({
  cards,
  theme,
  revealed,
  selectable,
  selectedPageid,
  onSelectCard,
}: TarotSpreadProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchActive = useRef(false);

  const cardIds = useMemo(() => cards.map((c) => c.pageid).join(","), [cards]);

  useEffect(() => {
    setActiveIndex(0);
  }, [cardIds]);

  const activeCard = cards[activeIndex];
  const activeLabel = activeCard ? slotHeading(theme, activeCard.slot) : "";

  const goNext = useCallback(() => {
    setActiveIndex((i) => (i + 1) % 3);
  }, []);

  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i + 2) % 3);
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartX.current = e.touches[0].clientX;
    touchActive.current = true;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchActive.current || touchStartX.current == null) return;
      touchActive.current = false;
      const endX = e.changedTouches[0]?.clientX;
      if (endX == null) return;
      const dx = endX - touchStartX.current;
      touchStartX.current = null;
      if (Math.abs(dx) < SWIPE_PX) return;
      if (dx < 0) goNext();
      else goPrev();
    },
    [goNext, goPrev],
  );

  const onTouchCancel = useCallback(() => {
    touchActive.current = false;
    touchStartX.current = null;
  }, []);

  return (
    <div className="tarot tarot--mobile">
      <div
        className="tarot-stack-wrap"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
      >
        <div
          className="tarot-stack-stage"
          role="region"
          aria-label="Spread cards — swipe left or right to change card"
        >
          {cards.map((card, index) => {
            const offset = stackOffset(activeIndex, index);
            const depthClass =
              offset === 0
                ? "tarot-stack-card--front"
                : offset === 1
                  ? "tarot-stack-card--mid"
                  : "tarot-stack-card--back";
            const selected = selectedPageid === card.pageid;
            const label = slotHeading(theme, card.slot);
            const isFront = index === activeIndex;
            return (
              <div
                key={card.pageid}
                className={`tarot-stack-card ${depthClass} ${selected ? "tarot-stack-card--selected" : ""}`.trim()}
              >
                <TarotFlipCard
                  card={card}
                  label={label}
                  revealed={revealed[index] ?? false}
                  selectable={selectable && isFront}
                  selected={selected}
                  onSelect={() => onSelectCard(card)}
                />
              </div>
            );
          })}
        </div>
        <div className="tarot-stack-dots" role="tablist" aria-label="Choose card">
          {cards.map((card, index) => (
            <button
              key={card.pageid}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              className={`tarot-stack-dot ${index === activeIndex ? "tarot-stack-dot--active" : ""}`}
              onClick={() => setActiveIndex(index)}
            >
              <span className="tarot-stack-dot-sr">
                {slotHeading(theme, card.slot)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <section className="tarot-mobile-meta" aria-live="polite">
        <header className="tarot-slot tarot-slot--mobile">
          <h2 className="tarot-slot-title">{activeLabel}</h2>
        </header>
        <p className="tarot-slot-reading tarot-slot-reading--mobile">
          {activeCard?.inspirationalLine}
        </p>
      </section>
    </div>
  );
}

export function TarotSpread(props: TarotSpreadProps) {
  const isDesktop = useMatchMedia(DESKTOP_MIN, false);
  return isDesktop ? (
    <TarotSpreadDesktop {...props} />
  ) : (
    <TarotSpreadMobile {...props} />
  );
}
