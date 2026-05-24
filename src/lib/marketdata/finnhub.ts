// Finnhub adapter — quotes, profile, dividends, search, candles.
// Free tier: 60 calls/min, unlimited per day for US stocks.
//   - /quote, /stock/profile2, /stock/metric, /search → free
//   - /stock/dividend, /stock/candle                  → premium (returns 403)
// Premium endpoints are still wired here; the dispatcher catches the 403 and
// rolls forward to FMP / Twelve Data, so we just spread free-tier load.

import type { RawQuote, RawEod, RawWeekly } from './twelvedata';
import type { RawDividend, RawProfile } from './fmp';
import type { SearchHit } from './search';

const BASE = 'https://finnhub.io/api/v1';

// ─── Module-level circuit breaker ──────────────────────────────────────
// Finnhub returns HTTP 429 once you blow the per-minute cap, and 403 for
// premium-only endpoints. Tripping on 429 lets the dispatcher route around
// us for a while; we don't trip on 403 because those failures are permanent
// for the endpoint and the dispatcher's per-call fallback already handles them.
const COOLDOWN_MS = 60 * 1000;  // 1 minute — matches the rate-limit window
let breakerUntil = 0;

function breakerOpen(): boolean { return Date.now() < breakerUntil; }
function tripBreaker(): void { breakerUntil = Date.now() + COOLDOWN_MS; }

export function isFinnhubQuotaExhausted(): boolean { return breakerOpen(); }

async function fhFetchJson(url: string): Promise<unknown> {
  if (breakerOpen()) throw new Error('finnhub_circuit_breaker_open');
  const res = await fetch(url, { cache: 'no-store' });
  if (res.status === 429) {
    tripBreaker();
    throw new Error('finnhub 429');
  }
  if (!res.ok) throw new Error(`finnhub ${res.status}`);
  return res.json();
}

function apiKey(): string {
  const key = process.env.FINNHUB_KEY;
  if (!key) throw new Error('FINNHUB_KEY missing');
  return key;
}

// ─── Quotes ────────────────────────────────────────────────────────────

interface FhQuote { c: number; d: number; dp: number; h: number; l: number; o: number; pc: number; t: number }

export async function fetchQuote(ticker: string): Promise<RawQuote> {
  const url = `${BASE}/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey()}`;
  const j = (await fhFetchJson(url)) as FhQuote;
  // Finnhub returns c=0 for unknown symbols (no error envelope).
  if (!j || j.c === 0) throw new Error('finnhub_no_data');
  return {
    ticker,
    price: Number(j.c),
    change_pct: Number(j.dp),
    as_of: j.t ? new Date(j.t * 1000).toISOString() : new Date().toISOString(),
  };
}

// ─── Profile ───────────────────────────────────────────────────────────

interface FhProfile2 {
  country?: string;
  currency?: string;
  exchange?: string;
  name?: string;
  ticker?: string;
  finnhubIndustry?: string;
  weburl?: string;
  logo?: string;
}

interface FhMetric {
  metric?: {
    beta?: number;
    dividendPerShareAnnual?: number;
    dividendYieldIndicatedAnnual?: number;
  };
}

export async function fetchProfile(ticker: string): Promise<RawProfile | null> {
  const key = apiKey();
  // Both calls are needed: profile2 has identifying info, metric carries the
  // dividend + beta values that FMP exposes inline on its profile endpoint.
  const [profile, metric] = await Promise.all([
    fhFetchJson(`${BASE}/stock/profile2?symbol=${encodeURIComponent(ticker)}&token=${key}`) as Promise<FhProfile2>,
    fhFetchJson(`${BASE}/stock/metric?symbol=${encodeURIComponent(ticker)}&metric=all&token=${key}`).catch(() => ({} as FhMetric)) as Promise<FhMetric>,
  ]);
  if (!profile || !profile.ticker) return null;

  const m = metric.metric ?? {};
  const annualDiv = m.dividendPerShareAnnual != null ? Number(m.dividendPerShareAnnual) : 0;

  return {
    ticker:            profile.ticker,
    name:              profile.name ?? null,
    description:       null,                       // Finnhub profile2 doesn't include a description
    exchange:          profile.exchange ?? null,
    country:           profile.country ?? null,
    sector:            profile.finnhubIndustry ?? null,
    industry:          profile.finnhubIndustry ?? null,
    currency:          profile.currency ?? null,
    price:             null,                       // Use /quote for price; profile2 has none
    fwdDivAnnualLocal: annualDiv,
    beta:              m.beta != null ? Number(m.beta) : null,
  };
}

// ─── Dividends (premium tier on Finnhub) ───────────────────────────────

interface FhDividend {
  symbol: string;
  date: string;        // ex-date
  amount: number;
  adjustedAmount?: number;
  payDate?: string;
  recordDate?: string;
  declarationDate?: string;
  currency?: string;
}

export async function fetchDividendHistory(ticker: string): Promise<RawDividend[]> {
  // Window: 5 years back to today. Finnhub requires explicit from/to.
  const to = new Date().toISOString().slice(0, 10);
  const fromDate = new Date();
  fromDate.setFullYear(fromDate.getFullYear() - 5);
  const from = fromDate.toISOString().slice(0, 10);
  const url = `${BASE}/stock/dividend?symbol=${encodeURIComponent(ticker)}&from=${from}&to=${to}&token=${apiKey()}`;
  const arr = (await fhFetchJson(url)) as FhDividend[];
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((d) => d.date && d.amount != null)
    .map((d) => ({
      ex_date:      d.date,
      pay_date:     d.payDate ?? null,
      amount_local: Number(d.amount),
      frequency:    null,  // Finnhub doesn't return cadence label; enrich.ts will infer
    }));
}

// ─── EOD / weekly history (premium tier on Finnhub) ────────────────────

interface FhCandle {
  c?: number[]; h?: number[]; l?: number[]; o?: number[]; t?: number[]; v?: number[]; s?: string;
}

export async function fetchEodOnDate(ticker: string, date: string): Promise<RawEod | null> {
  // Pull a 7-day window ending at the requested date so weekends/holidays roll back.
  const end = new Date(date);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  const fromSec = Math.floor(start.getTime() / 1000);
  const toSec = Math.floor(end.getTime() / 1000) + 86400;
  const url = `${BASE}/stock/candle?symbol=${encodeURIComponent(ticker)}&resolution=D&from=${fromSec}&to=${toSec}&token=${apiKey()}`;
  const j = (await fhFetchJson(url)) as FhCandle;
  if (!j || j.s !== 'ok' || !j.c?.length || !j.t?.length) return null;
  // Last bar = most recent trading day at or before `date`.
  const lastIdx = j.c.length - 1;
  return {
    ticker,
    date:  new Date(j.t[lastIdx] * 1000).toISOString().slice(0, 10),
    close: Number(j.c[lastIdx]),
  };
}

export async function fetchWeeklyHistory(ticker: string, weeks: number): Promise<RawWeekly[]> {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - weeks * 7);
  const fromSec = Math.floor(start.getTime() / 1000);
  const toSec = Math.floor(end.getTime() / 1000);
  const url = `${BASE}/stock/candle?symbol=${encodeURIComponent(ticker)}&resolution=W&from=${fromSec}&to=${toSec}&token=${apiKey()}`;
  const j = (await fhFetchJson(url)) as FhCandle;
  if (!j || j.s !== 'ok' || !j.c?.length || !j.t?.length) return [];
  return j.t.map((sec, i) => ({
    date:  new Date(sec * 1000).toISOString().slice(0, 10),
    close: Number(j.c![i]),
  }));
}

// ─── Symbol search ─────────────────────────────────────────────────────

interface FhSearchResult {
  count: number;
  result: { symbol: string; description: string; displaySymbol: string; type: string }[];
}

export async function searchSymbols(query: string, limit: number): Promise<SearchHit[]> {
  const url = `${BASE}/search?q=${encodeURIComponent(query)}&token=${apiKey()}`;
  const j = (await fhFetchJson(url)) as FhSearchResult;
  const hits: SearchHit[] = (j.result ?? []).slice(0, limit).map((r) => ({
    ticker:   r.symbol,
    name:     r.description,
    exchange: null,   // Finnhub /search doesn't return exchange/country/currency
    country:  null,
    currency: null,
    type:     r.type ?? null,
    logoUrl:  `https://financialmodelingprep.com/image-stock/${encodeURIComponent(r.symbol)}.png`,
  }));
  return hits;
}
