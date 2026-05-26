import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getActivePortfolio } from '@/lib/activePortfolio';
import { getHoldingsView, getPerformanceSeries } from '@/lib/portfolio';
import { getTaxSummary, DEFAULT_RESIDENCE, type TaxResidence } from '@/lib/tax';
import { getActiveAlerts, filterAlertsByPrefs } from '@/lib/alerts';

/**
 * Lightweight count endpoint for the nav badge. Re-uses the same engine the
 * Alerts page renders, but skips upstream enrichment (data freshness is the
 * Alerts page's job; the badge can lag by a few hours without harm).
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
    supabase
      .from('profiles')
      .select('tax_country, notify_dividend_events, notify_concentration, notify_tax_opportunities, notify_drawdown')
      .eq('id', user.id)
      .maybeSingle(),
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

  const residence = (profile?.tax_country as TaxResidence | null) ?? DEFAULT_RESIDENCE;
  const fiscalYear = new Date().getFullYear();

  const [taxSummary, performanceSeries] = await Promise.all([
    getTaxSummary(supabase, portfolio.id, fiscalYear, residence),
    getPerformanceSeries(supabase, portfolio.id, 104),
  ]);

  const allAlerts = await getActiveAlerts({
    supabase,
    portfolioId: portfolio.id,
    holdings,
    taxSummary,
    performanceSeries,
  });
  const alerts = filterAlertsByPrefs(allAlerts, {
    dividend_events:   profile?.notify_dividend_events   ?? true,
    concentration:     profile?.notify_concentration     ?? true,
    tax_opportunities: profile?.notify_tax_opportunities ?? true,
    drawdown:          profile?.notify_drawdown          ?? true,
  });

  const negative = alerts.filter(
    (a) => a.severity === 'negative' || a.severity === 'warning',
  ).length;

  return NextResponse.json({ total: alerts.length, negative });
}
