import { withAuth, json } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { TIERS } from '@/lib/tiers';
import { singleflight, isFresh } from '@/lib/cache';
import { fetchQuote } from '@/lib/marketdata/twelvedata';

export const GET = withAuth<{ ticker: string }>({}, async ({ tier, params }) => {
  const ticker = params.ticker.toUpperCase();
  const maxAgeMin = TIERS[tier].quoteFreshnessMin;

  // 1. Warm cache: Postgres
  const supabase = await getSupabaseServer();
  const { data: cached } = await supabase
    .from('instrument_quotes')
    .select('ticker, price, change_pct, as_of')
    .eq('ticker', ticker)
    .maybeSingle();

  if (cached && isFresh(cached.as_of, maxAgeMin)) {
    return json({ data: cached, meta: { stale: false, source: 'cache' } });
  }

  // 2. Upstream — coalesce concurrent callers
  try {
    const fresh = await singleflight(`q:${ticker}`, () => fetchQuote(ticker));

    // Persist via service role so the cache survives across users / tiers
    await supabaseAdmin().from('instruments').upsert({ ticker }, { onConflict: 'ticker' });
    await supabaseAdmin().from('instrument_quotes').upsert({
      ticker,
      price: fresh.price,
      change_pct: fresh.change_pct,
      as_of: fresh.as_of,
    });

    return json({ data: fresh, meta: { stale: false, source: 'fresh' } });
  } catch (e) {
    // Upstream failed — serve stale if we have it, else 503
    if (cached) {
      return json({ data: cached, meta: { stale: true, source: 'cache', warning: String(e) } });
    }
    return json({ error: 'upstream_unavailable' }, 503);
  }
});
