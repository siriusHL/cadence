import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getActivePortfolio } from '@/lib/activePortfolio';
import { getHoldingsView, getPerformanceSeries } from '@/lib/portfolio';
import { enrichInstruments, enrichWeeklyHistory } from '@/lib/marketdata/enrich';
import { getTaxSummary, DEFAULT_RESIDENCE, type TaxResidence } from '@/lib/tax';
import { getActiveAlerts } from '@/lib/alerts';

/**
 * Count endpoint for the nav badge. Mirrors the Alerts page exactly — same
 * enrichment and the same 52-week performance window — so the badge number
 * always matches the page's "N alerts to review". The badge fetches async
 * outside initial paint, so the enrichment cost delays only when the badge
 * appears, not page render.
 *
 * Returns:
 *   total    — every active alert across all severities
 *   negative — count of negative + warning severities (drives badge colour)
 */
export async function GET() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ total: 0, negative: 0 }, { status: 401 });
  }

  const [{ data: profile }, portfolio] = await Promise.all([
    supabase.from('profiles').select('tax_country').eq('id', user.id).maybeSingle(),
    getActivePortfolio(supabase, user.id),
  ]);
  if (!portfolio) {
    return NextResponse.json({ total: 0, negative: 0 });
  }

  const holdings = (await getHoldingsView(supabase, portfolio.id))
    .filter((h) => h.quantity > 0);
  if (holdings.length === 0) {
    return NextResponse.json({ total: 0, negative: 0 });
  }

  const tickers = holdings.map((h) => h.ticker);
  await Promise.all([
    enrichInstruments(tickers),
    enrichWeeklyHistory(tickers, 52),
  ]);

  const residence = (profile?.tax_country as TaxResidence | null) ?? DEFAULT_RESIDENCE;
  const fiscalYear = new Date().getFullYear();

  const [taxSummary, performanceSeries] = await Promise.all([
    getTaxSummary(supabase, portfolio.id, fiscalYear, residence),
    getPerformanceSeries(supabase, portfolio.id, 52),
  ]);

  const { active } = await getActiveAlerts({
    supabase,
    portfolioId: portfolio.id,
    holdings,
    taxSummary,
    performanceSeries,
    userId: user.id,
  });

  const negative = active.filter(
    (a) => a.severity === 'negative' || a.severity === 'warning',
  ).length;

  return NextResponse.json({ total: active.length, negative });
}
