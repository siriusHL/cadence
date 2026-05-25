import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getActivePortfolio, } from '@/lib/activePortfolio';
import { getHoldingsView, getPortfolioSummary } from '@/lib/portfolio';
import { enrichInstruments } from '@/lib/marketdata/enrich';
import { canAccessScreen, type Tier } from '@/lib/tiers';
import { EmptyState } from '@/components/EmptyState';
import { DripSimulator } from '@/components/DripSimulator';

export const dynamic = 'force-dynamic';

export default async function DripScreen() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('tier')
    .eq('user_id', user!.id)
    .maybeSingle();
  const tier = (sub?.tier ?? 'free') as Tier;

  if (!canAccessScreen(tier, 'drip')) redirect('/upgrade');

  const portfolio = await getActivePortfolio(supabase, user!.id);
  if (!portfolio) {
    return (
      <EmptyState
        title="No portfolio yet"
        body="Add a holding to simulate how dividend reinvestment compounds over time."
        ctaLabel="Add a holding"
        ctaHref="/app/add"
      />
    );
  }

  const holdings = await getHoldingsView(supabase, portfolio.id);
  await enrichInstruments(holdings.map((h) => h.ticker));
  // Re-fetch after enrichment so the summary reflects fresh quotes/fundamentals.
  const summary = await getPortfolioSummary(supabase, portfolio.id);

  if (summary.totalValue <= 0 || summary.forwardAnnualIncome <= 0) {
    return (
      <EmptyState
        icon="📈"
        title="Not enough data yet"
        body="DRIP needs at least one dividend-paying holding with a market value to simulate compounding."
        ctaLabel="Add a holding"
        ctaHref="/app/add"
      />
    );
  }

  return (
    <DripSimulator
      baseValue={summary.totalValue}
      baseIncome={summary.forwardAnnualIncome}
      baseCost={summary.costBasis || summary.totalValue}
    />
  );
}
