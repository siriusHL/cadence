import { withAuth, json } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { singleflight } from '@/lib/cache';
import { fetchEodOnDate } from '@/lib/marketdata/twelvedata';

/**
 * GET /api/instruments/:ticker/price-on?date=YYYY-MM-DD
 *
 * Returns the closing price for `ticker` on the requested date.
 * Cache-first: `instrument_history` rows never change once written, so a hit
 * costs zero upstream API budget. Weekends/holidays roll back to the previous
 * trading day; `actual_date` reflects what the price is really from.
 */
export const GET = withAuth<{ ticker: string }>({}, async ({ params, req }) => {
  const date = new URL(req.url).searchParams.get('date');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return json({ error: 'invalid_date', expected: 'YYYY-MM-DD' }, 400);
  }
  const ticker = params.ticker.toUpperCase();

  const supabase = await getSupabaseServer();

  // 1) Exact hit
  const { data: exact } = await supabase
    .from('instrument_history')
    .select('date, close')
    .eq('ticker', ticker)
    .eq('date', date)
    .maybeSingle();
  if (exact) {
    return json({
      data: { ticker, requested_date: date, actual_date: exact.date, close: Number(exact.close) },
      meta: { source: 'cache' },
    });
  }

  // 2) Nearest previous trading day within 7 days (handles weekend/holiday)
  const start = new Date(date);
  start.setDate(start.getDate() - 6);
  const { data: nearby } = await supabase
    .from('instrument_history')
    .select('date, close')
    .eq('ticker', ticker)
    .gte('date', start.toISOString().slice(0, 10))
    .lte('date', date)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (nearby) {
    return json({
      data: { ticker, requested_date: date, actual_date: nearby.date, close: Number(nearby.close) },
      meta: { source: 'cache_nearby' },
    });
  }

  // 3) Miss → upstream. Coalesce concurrent callers for the same (ticker, date).
  try {
    const fresh = await singleflight(`eod:${ticker}:${date}`, () => fetchEodOnDate(ticker, date));
    if (!fresh) return json({ error: 'no_data_for_date' }, 404);
    await supabaseAdmin().from('instrument_history').upsert({
      ticker:   fresh.ticker,
      date:     fresh.date,
      close:    fresh.close,
    }, { onConflict: 'ticker,date' });
    return json({
      data: { ticker, requested_date: date, actual_date: fresh.date, close: fresh.close },
      meta: { source: 'fresh' },
    });
  } catch (e) {
    return json({ error: 'upstream_unavailable', detail: String(e) }, 503);
  }
});
