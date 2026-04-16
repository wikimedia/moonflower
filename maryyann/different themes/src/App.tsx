import { useCallback, useState } from "react";
import type { SpreadCard, WikiCard } from "./types";
import type { SpreadTheme } from "./lib/themes";
import { AppShell } from "./components/AppShell";
import { PullPage } from "./pages/PullPage";
import { SpreadPage } from "./pages/SpreadPage";
import { formatSpreadShareText, shareSpreadText } from "./lib/share";

type Page = "pull" | "spread";

export default function App() {
  const [page, setPage] = useState<Page>("pull");
  const [pack, setPack] = useState<WikiCard[] | null>(null);
  const [activeTheme, setActiveTheme] = useState<SpreadTheme | null>(null);
  const [builtCards, setBuiltCards] = useState<SpreadCard[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const onPackReady = useCallback((cards: WikiCard[], theme: SpreadTheme) => {
    setPack(cards);
    setActiveTheme(theme);
    setBuiltCards(null);
    setPage("spread");
  }, []);

  const onDoneKeep = useCallback(() => {
    setPack(null);
    setActiveTheme(null);
    setBuiltCards(null);
    setPage("pull");
  }, []);

  const handleShare = useCallback(async () => {
    if (!builtCards?.length || !activeTheme) return;
    const text = formatSpreadShareText(builtCards, activeTheme);
    try {
      const usedNative = await shareSpreadText(text);
      setToast(usedNative ? "Shared!" : "Copied to clipboard.");
    } catch {
      setToast("Could not share. Try again.");
    }
    window.setTimeout(() => setToast(null), 2500);
  }, [builtCards, activeTheme]);

  const headerLeft = <h1 className="app-title">Different Themes</h1>;

  const headerRight =
    page === "spread" ? (
      <button type="button" className="btn btn-share" onClick={handleShare}>
        Share
      </button>
    ) : null;

  return (
    <>
      {toast && (
        <div className="toast toast-global" role="status">
          {toast}
        </div>
      )}
      <AppShell headerLeft={headerLeft} headerRight={headerRight}>
        {page === "pull" && <PullPage onPackReady={onPackReady} />}
        {page === "spread" && pack && activeTheme && (
          <SpreadPage
            pack={pack}
            theme={activeTheme}
            onDoneKeep={onDoneKeep}
            onCardsBuilt={setBuiltCards}
          />
        )}
      </AppShell>
    </>
  );
}
