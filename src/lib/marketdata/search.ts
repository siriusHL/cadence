// Ticker search — Twelve Data symbol_search.
// Free tier allowance applies; we add a tiny memo cache to suppress repeats.

const BASE = 'https://api.twelvedata.com';

export interface SearchHit {
  ticker: string;        // canonical, exchange suffix included where Twelve Data returns it
  name: string;
  exchange: string | null;
  country: string | null;
  currency: string | null;
  type: string | null;   // e.g. "Common Stock", "ETF"
  logoUrl: string;       // computed from FMP image-stock pattern
}

interface TwelveDataResult {
  symbol: string;
  instrument_name: string;
  exchange?: string;
  country?: string;
  currency?: string;
  instrument_type?: string;
}

// 5-minute in-process LRU. Keyed by lowercased query.
const TTL_MS = 5 * 60_000;
const memo = new Map<string, { at: number; hits: SearchHit[] }>();

export async function searchSymbols(query: string, limit = 8): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 1) return [];
  const key = q.toLowerCase();

  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.hits.slice(0, limit);

  const apiKey = process.env.TWELVE_DATA_KEY;
  if (!apiKey) throw new Error('TWELVE_DATA_KEY missing');

  const url = `${BASE}/symbol_search?symbol=${encodeURIComponent(q)}&outputsize=${limit}&apikey=${apiKey}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`twelvedata search ${res.status}`);
  const j = await res.json() as { data?: TwelveDataResult[] };

  const hits: SearchHit[] = (j.data ?? []).map((r) => ({
    ticker:   r.symbol,
    name:     r.instrument_name,
    exchange: r.exchange ?? null,
    country:  r.country ?? null,
    currency: r.currency ?? null,
    type:     r.instrument_type ?? null,
    logoUrl:  `https://financialmodelingprep.com/image-stock/${encodeURIComponent(r.symbol)}.png`,
  }));

  memo.set(key, { at: Date.now(), hits });
  return hits.slice(0, limit);
}
