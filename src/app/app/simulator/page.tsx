import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getActivePortfolio } from '@/lib/activePortfolio';
import { getHoldingsView, getPortfolioSummary } from '@/lib/portfolio';
import { enrichInstruments } from '@/lib/marketdata/enrich';
import { canAccessScreen, type Tier } from '@/lib/tiers';
import { EmptyState } from '@/components/EmptyState';
import { IncomeSimulator } from '@/components/IncomeSimulator';
import {
  estimateDividendTaxRate, RESIDENCE_MODELS,
  type TaxResidence,
} from '@/lib/tax';

export const dynamic = 'force-dynamic';

export default async function SimulatorScreen() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: sub }, { data: profile }] = await Promise.all([
    supabase.from('subscriptions').select('tier').eq('user_id', user!.id).maybeSingle(),
    supabase.from('profiles').select('income_target, tax_country').eq('id', user!.id).maybeSingle(),
  ]);
  const tier = (sub?.tier ?? 'free') as Tier;

  if (!canAccessScreen(tier, 'simulator')) redirect('/upgrade');

  const incomeTarget = Number(profile?.income_target ?? 30000);
  const residenceCode = (profile?.tax_country ?? null) as string | null;
  const residence: TaxResidence | null = residenceCode && residenceCode in RESIDENCE_MODELS
    ? (residenceCode as TaxResidence)
    : null;
  const portfolio = await getActivePortfolio(supabase, user!.id);
  if (!portfolio) {
    return (
      <EmptyState
        title="No portfolio yet"
        body="Add a holding to simulate how reinvested dividends compound over time."
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
        body="The simulator needs at least one dividend-paying holding with a market value to project compounding."
        ctaLabel="Add a holding"
        ctaHref="/app/add"
      />
    );
  }

  const dividendTaxRate = residence
    ? estimateDividendTaxRate(residence, summary.forwardAnnualIncome, summary.totalValue)
    : 0;

  return (
    <IncomeSimulator
      baseValue={summary.totalValue}
      baseIncome={summary.forwardAnnualIncome}
      baseCost={summary.costBasis || summary.totalValue}
      incomeTarget={incomeTarget}
      taxResidence={residence}
      dividendTaxRate={dividendTaxRate}
    />
  );
}
