// Twelve Data adapter — quotes, time series, FX, symbol search.
// Free tier: 800 calls/day, 8 calls/min. Use sparingly behind the cache cascade.

import type { SearchHit } from './search';

const BASE = 'https://api.twelvedata.com';

export interface RawQuote {
  ticker: string;
  price: number;
  change_pct: number;
  as_of: string;
}

export async function fetchQuote(ticker: string): Promise<RawQuote> {
  const key = process.env.TWELVE_DATA_KEY;
  if (!key) throw new Error('TWELVE_DATA_KEY missing');
  const url = `${BASE}/quote?symbol=${encodeURIComponent(ticker)}&apikey=${key}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`twelvedata ${res.status}`);
  const j = await res.json();
  if (j.status === 'error') throw new Error(j.message ?? 'twelvedata error');
  return {
    ticker,
    price: Number(j.close),
    change_pct: Number(j.percent_change),
    as_of: new Date().toISOString(),
  };
}

/**
 * Closing price for a specific date.
 * If the date is a weekend/holiday, the API returns the previous trading day —
 * we return its close + the actual trading date so callers can show "as of …".
 */
export interface RawEod {
  ticker: string;
  date: string;   // ISO YYYY-MM-DD — actual trading day, may differ from request
  close: number;
}

/** Weekly closes — used to build portfolio value/return time series. */
export interface RawWeekly {
  date: string;   // YYYY-MM-DD — week's last trading day
  close: number;
}

export async function fetchWeeklyHistory(ticker: string, weeks: number): Promise<RawWeekly[]> {
  const key = process.env.TWELVE_DATA_KEY;
  if (!key) throw new Error('TWELVE_DATA_KEY missing');
  const url =
    `${BASE}/time_series?symbol=${encodeURIComponent(ticker)}` +
    `&interval=1week&outputsize=${weeks}&order=asc&apikey=${key}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`twelvedata weekly ${res.status}`);
  const j = await res.json();
  if (j.status === 'error') throw new Error(j.message ?? 'twelvedata error');
  const rows = (j.values ?? []) as { datetime: string; close: string }[];
  return rows.map((r) => ({ date: r.datetime, close: Number(r.close) }));
}

interface TwelveDataSearchRow {
  symbol: string;
  instrument_name: string;
  exchange?: string;
  country?: string;
  currency?: string;
  instrument_type?: string;
}

export async function searchSymbols(query: string, limit: number): Promise<SearchHit[]> {
  const key = process.env.TWELVE_DATA_KEY;
  if (!key) throw new Error('TWELVE_DATA_KEY missing');
  const url = `${BASE}/symbol_search?symbol=${encodeURIComponent(query)}&outputsize=${limit}&apikey=${key}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`twelvedata search ${res.status}`);
  const j = (await res.json()) as { data?: TwelveDataSearchRow[]; status?: string; message?: string };
  if (j.status === 'error') throw new Error(j.message ?? 'twelvedata error');
  return (j.data ?? []).slice(0, limit).map((r) => ({
    ticker:   r.symbol,
    name:     r.instrument_name,
    exchange: r.exchange ?? null,
    country:  r.country ?? null,
    currency: r.currency ?? null,
    type:     r.instrument_type ?? null,
    logoUrl:  `https://financialmodelingprep.com/image-stock/${encodeURIComponent(r.symbol)}.png`,
  }));
}

export async function fetchEodOnDate(ticker: string, date: string): Promise<RawEod | null> {
  const key = process.env.TWELVE_DATA_KEY;
  if (!key) throw new Error('TWELVE_DATA_KEY missing');
  // Request a small window ending at the target date; Twelve Data returns the
  // most recent trading day at or before `end_date` when the exact day is closed.
  const start = new Date(date);
  start.setDate(start.getDate() - 6);
  const startStr = start.toISOString().slice(0, 10);
  const url =
    `${BASE}/time_series?symbol=${encodeURIComponent(ticker)}` +
    `&interval=1day&start_date=${startStr}&end_date=${date}` +
    `&order=desc&outputsize=1&apikey=${key}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`twelvedata eod ${res.status}`);
  const j = await res.json();
  if (j.status === 'error') throw new Error(j.message ?? 'twelvedata error');
  const row = j?.values?.[0];
  if (!row) return null;
  return {
    ticker,
    date:  row.datetime,            // actual trading day
    close: Number(row.close),
  };
}
