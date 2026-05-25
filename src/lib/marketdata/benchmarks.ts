// Benchmark configuration + weekly-history backfill.
//
// We compare the user's portfolio against a small fixed set of indices on
// the Performance screen. Storing weekly closes in `benchmark_history`
// (parallel to `instrument_history`) keeps benchmarks out of the holdings
// lookup paths while sharing the same upstream provider plumbing.
//
// Each entry maps a stable internal id (used as the row key) to an upstream
// ticker the dispatcher knows how to fetch. We pick accumulating ETFs as
// total-return proxies — their NAV already reinvests dividends, which
// matches the way we measure portfolio total return.

import { supabaseAdmin } from '@/lib/supabase/admin';
import { dispatchWeeklyHistory } from '@/lib/marketdata/dispatch';
import { singleflight } from '@/lib/cache';

export interface BenchmarkConfig {
  id: string;          // stable slug used in benchmark_history.benchmark_id
  name: string;        // display label
  ticker: string;      // upstream symbol fed to dispatchWeeklyHistory
  color: string;       // chart line color
  note?: string;       // optional caveat shown in chart legend / tooltip
}

export const BENCHMARKS: BenchmarkConfig[] = [
  {
    id:     'EUROPE',
    name:   'MSCI Europe',
    // IEUR — iShares Core MSCI Europe ETF, NYSE-listed in USD. European
    // UCITS variants (e.g. EXSA.DE) are paywalled on the Twelve Data free
    // tier, so we use the US-listed cousin. USD-quoted, distributing —
    // good enough as a price-return proxy until we upgrade providers.
    ticker: 'IEUR',
    color:  '#86868b',
    note:   'USD-quoted via NYSE',
  },
  {
    id:     'SP500',
    name:   'S&P 500',
    // SPY — SPDR S&P 500 ETF, NYSE-listed. USD-quoted, distributing.
    // Equivalent to IVV/VOO for our purposes; SPY has the most reliable
    // free-tier coverage across providers.
    ticker: 'SPY',
    color:  'oklch(0.55 0.10 235)',
  },
];

/**
 * Backfill weekly closes for every configured benchmark.
 *
 * Same gating logic as enrichWeeklyHistory for instruments: a benchmark
 * with any row in the last 14 days is considered current; otherwise we
 * fetch a fresh window and upsert (existing dates are untouched).
 */
export async function enrichBenchmarkHistory(weeks = 104): Promise<void> {
  const admin = supabaseAdmin();
  const ids = BENCHMARKS.map((b) => b.id);

  const cutoff14d = new Date();
  cutoff14d.setDate(cutoff14d.getDate() - 14);
  const cutoff14dStr = cutoff14d.toISOString().slice(0, 10);

  const { data: freshRows } = await admin
    .from('benchmark_history')
    .select('benchmark_id')
    .in('benchmark_id', ids)
    .gte('date', cutoff14dStr);

  const isFresh = new Set((freshRows ?? []).map((r) => r.benchmark_id as string));

  await Promise.all(
    BENCHMARKS.map(async (b) => {
      if (isFresh.has(b.id)) return;
      try {
        const rows = await singleflight(
          `benchmark-weekly:${b.id}`,
          () => dispatchWeeklyHistory(b.ticker, weeks),
        );
        if (rows.length === 0) return;
        await admin.from('benchmark_history').upsert(
          rows.map((r) => ({ benchmark_id: b.id, date: r.date, value: r.close })),
          { onConflict: 'benchmark_id,date' },
        );
      } catch {
        /* leave gaps; chart degrades gracefully when a benchmark is empty */
      }
    }),
  );
}
