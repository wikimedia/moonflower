const SKIP_PREFIXES = [
  "category:articles ",
  "category:all ",
  "category:commons ",
  "category:coordinates ",
  "category:good articles",
  "category:featured articles",
  "category:use ",
  "category:webarchive ",
  "category:wikipedia ",
  "category:pages ",
  "category:cs1 ",
  "category:pages with ",
  "category:short description ",
  "category:engvar",
  "category:dmy dates",
  "category:mdy dates",
];

function normalize(cat: string): string {
  return cat.trim().toLowerCase();
}

/** Strip "Category:" prefix for display */
export function displayCategoryTitle(fullTitle: string): string {
  const t = fullTitle.replace(/^Category:/i, "");
  return t.replace(/_/g, " ");
}

function isBroadMetaCategory(display: string): boolean {
  const d = display.toLowerCase();
  return (
    d.includes("articles") ||
    d.includes("wikipedia") ||
    d.includes("pages") ||
    d.includes("short description")
  );
}

export function pickContentCategory(categoryTitles: string[]): string {
  let fallback: string | null = null;
  for (const raw of categoryTitles) {
    const lower = normalize(raw);
    const skip = SKIP_PREFIXES.some((p) => lower.startsWith(p));
    if (skip) continue;
    const display = displayCategoryTitle(raw);
    if (!fallback) fallback = display;
    if (!isBroadMetaCategory(display)) return display;
  }
  return fallback ?? "General topic";
}
