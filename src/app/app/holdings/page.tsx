import { getSupabaseServer } from '@/lib/supabase/server';
import { getActivePortfolio } from '@/lib/activePortfolio';
import { getHoldingsView } from '@/lib/portfolio';
import { enrichInstruments } from '@/lib/marketdata/enrich';
import { EmptyState } from '@/components/EmptyState';
import { HoldingsTable, type HoldingRow } from '@/components/HoldingsTable';
import { AddHoldingTrigger } from '@/components/AddHoldingTrigger';
import { ImportCsvButton } from '@/components/ImportCsvButton';
import { can, type Tier } from '@/lib/tiers';

interface InstrumentMeta {
  ticker: string;
  payout_freq: number | null;
  country: string | null;
}
interface QuoteMeta {
  ticker: string;
  change_pct: number | null;
}

export default async function HoldingsScreen() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('tier')
    .eq('user_id', user!.id)
    .maybeSingle();
  const tier = (sub?.tier ?? 'free') as Tier;
  const canImport = can(tier, 'csvImport');
  const portfolio = await getActivePortfolio(supabase, user!.id);

  if (!portfolio) {
    return (
      <EmptyState
        title="No portfolio yet"
        body="Add your first holding to unlock the Holdings table."
        ctaLabel="Add a holding"
        ctaHref="/app/add"
        secondaryAction={canImport ? <ImportCsvButton variant="ghost" /> : undefined}
      />
    );
  }

  const holdings = (await getHoldingsView(supabase, portfolio.id)).filter((h) => h.quantity > 0);
  if (holdings.length === 0) {
    return (
      <div className="cdn-pro">
        <div className="pro-hero">
          <div>
            <div className="eyebrow">Your positions</div>
            <h1>
              No active holdings <span className="light">yet</span>
            </h1>
            <div className="sub">
              Add your first buy transaction and it&rsquo;ll appear here in a dense, sortable table.
            </div>
          </div>
          <div className="right-meta" style={{ alignItems: 'flex-end', gap: 10 }}>
            <AddHoldingTrigger />
            {canImport && <ImportCsvButton variant="ghost" />}
          </div>
        </div>
      </div>
    );
  }

  // Ensure quote/fundamental caches are fresh
  await enrichInstruments(holdings.map((h) => h.ticker));

  // Join in payout_freq + change_pct + country (not surfaced by getHoldingsView)
  const tickers = holdings.map((h) => h.ticker);
  const [{ data: instRows }, { data: quoteRows }] = await Promise.all([
    supabase
      .from('instruments')
      .select('ticker, payout_freq, country')
      .in('ticker', tickers),
    supabase
      .from('instrument_quotes')
      .select('ticker, change_pct')
      .in('ticker', tickers),
  ]);

  const freqByT = new Map(
    (instRows as InstrumentMeta[] ?? []).map((r) => [r.ticker, r.payout_freq]),
  );
  const countryByT = new Map(
    (instRows as InstrumentMeta[] ?? []).map((r) => [r.ticker, r.country]),
  );
  const changeByT = new Map(
    (quoteRows as QuoteMeta[] ?? []).map((r) => [r.ticker, r.change_pct != null ? Number(r.change_pct) : null]),
  );

  const rows: HoldingRow[] = holdings.map((h) => ({
    ticker:            h.ticker,
    name:              h.name,
    sector:            h.sector,
    country:           countryByT.get(h.ticker) ?? null,
    currency:          h.currency,
    quantity:          h.quantity,
    price:             h.price,
    changePct:         changeByT.get(h.ticker) ?? null,
    costBasisLocal:    h.costBasisLocal,
    fwdYieldPct:       h.fwdYieldPct,
    yieldOnCostPct:    h.costBasisLocal > 0 && h.fwdDivAnnualLocal
      ? (h.fwdDivAnnualLocal / h.costBasisLocal) * 100
      : null,
    fwdDivAnnualLocal: h.fwdDivAnnualLocal,
    payoutFreq:        freqByT.get(h.ticker) ?? null,
  }));

  // Hero data
  const totalValue = rows.reduce((s, r) => s + (r.price ?? 0) * r.quantity, 0);
  const countries = new Set(rows.map((r) => r.country).filter(Boolean));
  const cadenceCounts = { monthly: 0, quarterly: 0, semi: 0, annual: 0, other: 0 };
  for (const r of rows) {
    if (r.payoutFreq === 12) cadenceCounts.monthly++;
    else if (r.payoutFreq === 4) cadenceCounts.quarterly++;
    else if (r.payoutFreq === 2) cadenceCounts.semi++;
    else if (r.payoutFreq === 1) cadenceCounts.annual++;
    else cadenceCounts.other++;
  }
  const cadenceParts: string[] = [];
  if (cadenceCounts.monthly)   cadenceParts.push(`${cadenceCounts.monthly} monthly`);
  if (cadenceCounts.quarterly) cadenceParts.push(`${cadenceCounts.quarterly} quarterly`);
  if (cadenceCounts.semi)      cadenceParts.push(`${cadenceCounts.semi} semi-annual`);
  if (cadenceCounts.annual)    cadenceParts.push(`${cadenceCounts.annual} annual`);

  return (
    <div className="cdn-pro">
      <div className="pro-hero">
        <div>
          <div className="eyebrow">Your positions</div>
          <h1>
            {rows.length} stock{rows.length === 1 ? '' : 's'}{' '}
            <span className="light">paying you</span>
          </h1>
          <div className="sub">
            <b>€{Math.round(totalValue).toLocaleString('en-IE')}</b> across {countries.size} countr{countries.size === 1 ? 'y' : 'ies'}
            {cadenceParts.length > 0 && <> · {cadenceParts.join(', ')} payer{cadenceParts.length === 1 ? '' : 's'}</>}.
          </div>
        </div>
        <div className="right-meta" style={{ alignItems: 'flex-end', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <AddHoldingTrigger />
            {canImport && <ImportCsvButton variant="ghost" />}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span className="live">Live prices · synced just now</span>
            <span>{rows.length} positions</span>
          </div>
        </div>
      </div>

      <HoldingsTable rows={rows} />
    </div>
  );
}
