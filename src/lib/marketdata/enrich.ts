// Lazy enrichment of the shared instrument cache.
// Called on screens that need full data (name, price, dividend) per ticker.
// Refreshes only what's stale; runs writes via the service-role admin client.

import { supabaseAdmin } from '@/lib/supabase/admin';
import { frequencyToPerYear, inferPayoutFreq, type RawProfile } from '@/lib/marketdata/fmp';
import {
  dispatchQuote,
  dispatchProfile,
  dispatchDividendHistory,
  dispatchWeeklyHistory,
} from '@/lib/marketdata/dispatch';
import { singleflight } from '@/lib/cache';

interface InstrumentRow {
  ticker: string;
  name: string | null;
  currency: string | null;
  sector: string | null;
  payout_freq: number | null;
  updated_at: string;
}
interface QuoteRow { ticker: string; as_of: string }
interface FundRow  { ticker: string; updated_at: string }
interface DivRow   { ticker: string }

/**
 * Backfill missing market data for the given tickers.
 *
 * Page loads call this on every render; it must be cheap. The policy is
 * strict: a ticker that already has a row in each cache table is a no-op,
 * regardless of how old the row is. Refresh of stale-but-present data is
 * the cron job's job (/api/jobs/refresh-instruments), not page loads.
 *
 * Only the first-sight case (or a partially-populated row from a prior
 * failure) triggers an upstream call.
 */
export async function enrichInstruments(tickers: string[]): Promise<void> {
  if (tickers.length === 0) return;
  const admin = supabaseAdmin();

  const [instRes, quoteRes, fundRes, divRes] = await Promise.all([
    admin.from('instruments').select('ticker, name, currency, sector, payout_freq, updated_at').in('ticker', tickers),
    admin.from('instrument_quotes').select('ticker, as_of').in('ticker', tickers),
    admin.from('instrument_fundamentals').select('ticker, updated_at').in('ticker', tickers),
    admin.from('instrument_dividends').select('ticker').in('ticker', tickers),
  ]);

  const instByT  = new Map((instRes.data  as InstrumentRow[] ?? []).map((r) => [r.ticker, r]));
  const quoteByT = new Map((quoteRes.data as QuoteRow[]      ?? []).map((r) => [r.ticker, r]));
  const fundByT  = new Map((fundRes.data  as FundRow[]       ?? []).map((r) => [r.ticker, r]));
  const divsByT  = new Set((divRes.data   as DivRow[]        ?? []).map((r) => r.ticker));

  await Promise.all(
    tickers.map(async (t) => {
      const inst  = instByT.get(t);
      const quote = quoteByT.get(t);
      const fund  = fundByT.get(t);

      // "Missing" means either no row, or a row that's incomplete from a prior
      // partial enrichment (no name / no payout_freq). Age is irrelevant here.
      const needsProfile   = !inst || !inst.name || !fund;
      const needsDividends = !divsByT.has(t) || !inst?.payout_freq;
      const needsQuote     = !quote;

      // Each upstream call is coalesced so concurrent users hitting the same
      // ticker only fire one network request.
      const tasks: Promise<unknown>[] = [];
      if (needsProfile)   tasks.push(singleflight(`profile:${t}`,   () => enrichProfile(t)));
      if (needsDividends) tasks.push(singleflight(`dividends:${t}`, () => enrichDividends(t)));
      if (needsQuote)     tasks.push(singleflight(`quote:${t}`,     () => enrichQuote(t)));
      await Promise.allSettled(tasks);
    }),
  );
}

async function enrichDividends(ticker: string): Promise<void> {
  const admin = supabaseAdmin();

  // Path A: real history from FMP /stable/dividends
  try {
    const rows = await dispatchDividendHistory(ticker);
    if (rows.length > 0) {
      await admin.from('instrument_dividends').upsert(
        rows.map((r) => ({
          ticker,
          ex_date:      r.ex_date,
          pay_date:     r.pay_date,
          amount_local: r.amount_local,
        })),
        { onConflict: 'ticker,ex_date' },
      );
      const perYear = frequencyToPerYear(rows[0].frequency);
      if (perYear) {
        await admin.from('instruments')
          .update({ payout_freq: perYear, updated_at: new Date().toISOString() })
          .eq('ticker', ticker);
      }
      return;
    }
  } catch {
    /* fall through to synthesis */
  }

  // Path B: synthesize from profile when FMP blocks the symbol on free tier.
  // We know lastDividend (annual) — derive per-payment amount + cadence and
  // generate a believable ex-date schedule (24mo history + 12mo forward).
  try {
    const profile = await dispatchProfile(ticker);
    if (!profile || profile.fwdDivAnnualLocal <= 0) return;
    const perYear = inferPayoutFreq(profile);
    const intervalMonths = Math.round(12 / perYear);
    const amountPerPayment = profile.fwdDivAnnualLocal / perYear;

    // Anchor near the most recent month boundary so monthly stocks land in
    // their own bucket; weekly precision isn't useful in v0.
    const anchor = new Date();
    anchor.setDate(15);
    const rows: { ticker: string; ex_date: string; pay_date: null; amount_local: number }[] = [];

    // Backward 24 cycles
    const back = new Date(anchor);
    for (let i = 1; i <= 24; i++) {
      back.setMonth(back.getMonth() - intervalMonths);
      rows.push({
        ticker,
        ex_date:      back.toISOString().slice(0, 10),
        pay_date:     null,
        amount_local: amountPerPayment,
      });
    }
    // Anchor month itself
    rows.push({
      ticker,
      ex_date:      anchor.toISOString().slice(0, 10),
      pay_date:     null,
      amount_local: amountPerPayment,
    });
    // Forward 12 cycles
    const fwd = new Date(anchor);
    for (let i = 1; i <= 12; i++) {
      fwd.setMonth(fwd.getMonth() + intervalMonths);
      rows.push({
        ticker,
        ex_date:      fwd.toISOString().slice(0, 10),
        pay_date:     null,
        amount_local: amountPerPayment,
      });
    }

    await admin.from('instrument_dividends').upsert(rows, { onConflict: 'ticker,ex_date' });
    await admin.from('instruments')
      .update({ payout_freq: perYear, updated_at: new Date().toISOString() })
      .eq('ticker', ticker);
  } catch {
    /* leave cache as-is */
  }
}

async function enrichProfile(ticker: string): Promise<RawProfile | null> {
  try {
    const p = await dispatchProfile(ticker);
    if (!p) return null;
    const admin = supabaseAdmin();
    await admin.from('instruments').upsert({
      ticker:    p.ticker,
      name:      p.name,
      exchange:  p.exchange,
      country:   p.country,
      sector:    p.sector,
      industry:  p.industry,
      currency:  p.currency,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'ticker' });

    const fwdYieldPct = p.price && p.fwdDivAnnualLocal
      ? (p.fwdDivAnnualLocal / p.price) * 100
      : null;

    await admin.from('instrument_fundamentals').upsert({
      ticker:               p.ticker,
      fwd_div_annual_local: p.fwdDivAnnualLocal,
      fwd_yield_pct:        fwdYieldPct,
      beta:                 p.beta,
      updated_at:           new Date().toISOString(),
    }, { onConflict: 'ticker' });

    // If FMP returned a price and we have no fresh quote, seed it.
    if (p.price != null) {
      await admin.from('instrument_quotes').upsert({
        ticker:     p.ticker,
        price:      p.price,
        as_of:      new Date().toISOString(),
      }, { onConflict: 'ticker' });
    }
    return p;
  } catch {
    return null;
  }
}

/**
 * Backfill weekly closes into instrument_history for performance/charts.
 *
 * The gate is "is there a row within the last 14 days?". If yes the ticker
 * is considered current — no refresh. If no, we fetch a fresh weekly window
 * and upsert; `onConflict: ticker,date` means existing weeks are untouched
 * and only the newly-published bars are written. Two weeks of slack covers
 * both holiday-shortened weeks and the gap between "today" and "last
 * Friday's close" without firing the API every visit.
 */
export async function enrichWeeklyHistory(tickers: string[], weeks = 104): Promise<void> {
  if (tickers.length === 0) return;
  const admin = supabaseAdmin();

  const cutoff14d = new Date();
  cutoff14d.setDate(cutoff14d.getDate() - 14);
  const cutoff14dStr = cutoff14d.toISOString().slice(0, 10);

  // Tickers with any row in the last 14 days are considered current.
  const { data: freshRows } = await admin
    .from('instrument_history')
    .select('ticker')
    .in('ticker', tickers)
    .gte('date', cutoff14dStr);

  const isFresh = new Set((freshRows ?? []).map((r) => r.ticker as string));

  await Promise.all(
    tickers.map(async (t) => {
      if (isFresh.has(t)) return;

      try {
        const rows = await singleflight(`weekly:${t}`, () => dispatchWeeklyHistory(t, weeks));
        if (rows.length === 0) return;
        await admin.from('instrument_history').upsert(
          rows.map((r) => ({ ticker: t, date: r.date, close: r.close })),
          { onConflict: 'ticker,date' },
        );
      } catch {
        /* leave gaps; chart handles missing data */
      }
    }),
  );
}

async function enrichQuote(ticker: string): Promise<void> {
  try {
    const q = await dispatchQuote(ticker);
    const admin = supabaseAdmin();
    await admin.from('instrument_quotes').upsert({
      ticker:     q.ticker,
      price:      q.price,
      change_pct: q.change_pct,
      as_of:      q.as_of,
    }, { onConflict: 'ticker' });
  } catch {
    /* swallow */
  }
}
