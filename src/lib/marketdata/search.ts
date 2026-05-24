// Ticker search — dispatched across Twelve Data + Finnhub.
// Wrapped in a 5-minute in-process LRU so identical queries don't burn budget.

import { dispatchSymbolSearch } from './dispatch';

export interface SearchHit {
  ticker: string;        // canonical, exchange suffix included where the provider returns it
  name: string;
  exchange: string | null;
  country: string | null;
  currency: string | null;
  type: string | null;   // e.g. "Common Stock", "ETF"
  logoUrl: string;       // computed from FMP image-stock pattern
}

const TTL_MS = 5 * 60_000;
const memo = new Map<string, { at: number; hits: SearchHit[] }>();

export async function searchSymbols(query: string, limit = 8): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 1) return [];
  const key = q.toLowerCase();

  const cached = memo.get(key);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.hits.slice(0, limit);

  const hits = await dispatchSymbolSearch(q, limit);

  memo.set(key, { at: Date.now(), hits });
  return hits.slice(0, limit);
}
