// Lazy enrichment of the shared instrument cache.
// Called on screens that need full data (name, price, dividend) per ticker.
// Refreshes only what's stale; runs writes via the service-role admin client.

import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  fetchProfile, fetchDividendHistory, frequencyToPerYear, inferPayoutFreq,
  type RawProfile,
} from '@/lib/marketdata/fmp';
import { fetchQuote, fetchWeeklyHistory } from '@/lib/marketdata/twelvedata';
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

const PROFILE_TTL_DAYS = 7;
const DIVIDENDS_TTL_DAYS = 7;
const QUOTE_TTL_MIN    = 60;          // 1h for Free auto-enrich

function olderThan(iso: string | null | undefined, ms: number): boolean {
  if (!iso) return true;
  return Date.now() - new Date(iso).getTime() > ms;
}

/**
 * Ensure the given tickers have fresh profile + dividend + price data.
 * No-op for tickers whose cache rows are recent enough. Errors per ticker
 * are swallowed — partial enrichment is better than blocking the page.
 */
export async function enrichInstruments(tickers: string[]): Promise<void> {
  if (tickers.length === 0) return;
  const admin = supabaseAdmin();

  // Latest dividend row per ticker (used to decide whether dividend cache is stale).
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

  const profileMs   = PROFILE_TTL_DAYS * 86_400_000;
  const dividendsMs = DIVIDENDS_TTL_DAYS * 86_400_000;
  const quoteMs     = QUOTE_TTL_MIN * 60_000;

  await Promise.all(
    tickers.map(async (t) => {
      const inst  = instByT.get(t);
      const quote = quoteByT.get(t);
      const fund  = fundByT.get(t);

      const needsProfile =
        !inst || !inst.name || olderThan(inst.updated_at, profileMs) ||
        !fund || olderThan(fund.updated_at, profileMs);
      const needsDividends =
        !divsByT.has(t) ||
        !inst || !inst.payout_freq || olderThan(inst.updated_at, dividendsMs);
      const needsQuote = !quote || olderThan(quote.as_of, quoteMs);

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
    const rows = await fetchDividendHistory(ticker);
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
    const profile = await fetchProfile(ticker);
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
    const p = await fetchProfile(ticker);
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
 * Cheap to cache, dramatically cuts API usage on repeat loads.
 */
export async function enrichWeeklyHistory(tickers: string[], weeks = 104): Promise<void> {
  if (tickers.length === 0) return;
  const admin = supabaseAdmin();

  // For each ticker, only call upstream if our cache lacks the most recent weeks.
  // Cheap query: count rows in instrument_history for the last `weeks` weeks.
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - weeks * 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const { data: counts } = await admin
    .from('instrument_history')
    .select('ticker, date')
    .in('ticker', tickers)
    .gte('date', cutoffStr);

  const countsByT = new Map<string, number>();
  for (const r of counts ?? []) {
    countsByT.set(r.ticker, (countsByT.get(r.ticker) ?? 0) + 1);
  }

  await Promise.all(
    tickers.map(async (t) => {
      // Skip if we already have most of the weekly grid for this ticker.
      const expected = weeks * 0.85; // allow for holidays / non-trading weeks
      if ((countsByT.get(t) ?? 0) >= expected) return;

      try {
        const rows = await singleflight(`weekly:${t}`, () => fetchWeeklyHistory(t, weeks));
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
    const q = await fetchQuote(ticker);
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
