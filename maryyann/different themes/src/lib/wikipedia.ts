import type { WikiCard } from "../types";
import { pickContentCategory } from "./categories";
import { pickShortArticleQuote } from "./quotes";
import { rarityFromSignals } from "./rarity";

const API =
  "https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*";

type MwCategory = { title: string };
type MwThumbnail = { source: string; width?: number; height?: number };
type MwRevision = { size?: number };

interface MwPage {
  pageid: number;
  title: string;
  extract?: string;
  thumbnail?: MwThumbnail;
  categories?: MwCategory[];
  revisions?: MwRevision[];
  length?: number;
}

interface QueryResponse {
  query?: {
    pages?: Record<string, MwPage>;
  };
  error?: { info?: string };
}

function buildUrl(params: Record<string, string>): string {
  const u = new URLSearchParams(params);
  return `${API}&${u.toString()}`;
}

async function fetchRandomBatch(limit: number): Promise<MwPage[]> {
  const url = buildUrl({
    generator: "random",
    grnnamespace: "0",
    grnlimit: String(limit),
    prop: "pageimages|extracts|categories|revisions",
    piprop: "thumbnail",
    pithumbsize: "640",
    exintro: "1",
    explaintext: "1",
    cllimit: "50",
    rvprop: "size",
  });

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wikipedia returned ${res.status}`);
  const data = (await res.json()) as QueryResponse;
  if (data.error?.info) throw new Error(data.error.info);
  const pages = data.query?.pages;
  if (!pages) return [];
  return Object.values(pages);
}

function toWikiCard(page: MwPage): WikiCard | null {
  const thumb = page.thumbnail?.source;
  if (!thumb) return null;

  const extract = page.extract?.trim() ?? "";
  const revSize = page.revisions?.[0]?.size ?? 0;
  const categoryTitles = (page.categories ?? []).map((c) => c.title);
  const category = pickContentCategory(categoryTitles);
  const articleQuote = pickShortArticleQuote(extract);
  const { tier, score } = rarityFromSignals({
    revisionBytes: revSize,
    categoryCount: categoryTitles.length,
    extractLength: extract.length,
    categoryTitles,
  });

  const title = page.title.replace(/_/g, " ");
  const encoded = encodeURIComponent(page.title.replace(/ /g, "_"));

  return {
    pageid: page.pageid,
    title,
    articleUrl: `https://en.wikipedia.org/wiki/${encoded}`,
    imageUrl: thumb,
    category,
    articleQuote,
    rarity: tier,
    rarityScore: score,
  };
}

/**
 * Collects up to `count` distinct wiki cards that have thumbnails.
 */
export async function fetchCardPack(
  count: number,
  opts?: { maxRounds?: number; batchSize?: number },
): Promise<WikiCard[]> {
  const maxRounds = opts?.maxRounds ?? 12;
  const batchSize = opts?.batchSize ?? 18;
  const seen = new Set<number>();
  const out: WikiCard[] = [];

  for (let round = 0; round < maxRounds && out.length < count; round++) {
    let batch: MwPage[];
    try {
      batch = await fetchRandomBatch(batchSize);
    } catch {
      throw new Error("Could not reach Wikipedia. Check your connection.");
    }

    for (const page of batch) {
      if (seen.has(page.pageid)) continue;
      const card = toWikiCard(page);
      if (!card) continue;
      seen.add(page.pageid);
      out.push(card);
      if (out.length >= count) break;
    }
  }

  if (out.length < count) {
    throw new Error("Not enough illustrated articles right now. Try again.");
  }

  return out.slice(0, count);
}
