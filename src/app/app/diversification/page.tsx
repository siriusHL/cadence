import { getSupabaseServer } from '@/lib/supabase/server';
import { getActivePortfolio } from '@/lib/activePortfolio';
import { getHoldingsView } from '@/lib/portfolio';
import { enrichInstruments } from '@/lib/marketdata/enrich';
import { EmptyState } from '@/components/EmptyState';
import {
  DiversificationView,
  type DiversificationPos,
} from '@/components/DiversificationView';
import { DiversificationMobile } from '@/components/mobile/DiversificationMobile';

export default async function DiversificationScreen() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const portfolio = await getActivePortfolio(supabase, user!.id);

  if (!portfolio) {
    return (
      <EmptyState
        title="No portfolio yet"
        body="Add a holding to see your sector, geography, and currency mix."
        ctaLabel="Add a holding"
        ctaHref="/app/add"
      />
    );
  }

  const held = (await getHoldingsView(supabase, portfolio.id)).filter((h) => h.quantity > 0);
  if (held.length === 0) {
    return (
      <EmptyState
        icon="🧭"
        title="Nothing to diversify yet"
        body="Once you have active positions, Cadence will break them down by sector, country, and currency — and flag any concentration risk."
        ctaLabel="Add a holding"
        ctaHref="/app/add"
      />
    );
  }

  await enrichInstruments(held.map((h) => h.ticker));

  const tickers = held.map((h) => h.ticker);
  const { data: instRows } = await supabase
    .from('instruments')
    .select('ticker, country')
    .in('ticker', tickers);
  const countryByT = new Map(
    (instRows ?? []).map((r) => [r.ticker, (r.country ?? null) as string | null]),
  );

  const positions: DiversificationPos[] = held.map((h) => ({
    ticker: h.ticker,
    name: h.name,
    sector: h.sector ?? 'Unknown',
    country: countryByT.get(h.ticker) ?? 'Unknown',
    currency: h.currency ?? 'EUR',
    value: (h.price ?? 0) * h.quantity,
    fwdIncome: (h.fwdDivAnnualLocal ?? 0) * h.quantity,
  }));

  const avatarInitials = (user?.email ?? 'U').slice(0, 2).toUpperCase();

  return (
    <>
      <div className="cdn-desktop-only">
        <DiversificationView positions={positions} />
      </div>
      <div className="cdn-mobile-only">
        <DiversificationMobile
          positions={positions.map((p) => ({
            ticker: p.ticker,
            sector: p.sector,
            country: p.country,
            currency: p.currency,
            value: p.value,
          }))}
          portfolioName={portfolio.name}
          avatarInitials={avatarInitials}
        />
      </div>
    </>
  );
}
