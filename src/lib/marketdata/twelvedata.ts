// Twelve Data adapter — quotes, time series, FX.
// Free tier: 800 calls/day, 8 calls/min. Use sparingly behind the cache cascade.

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
