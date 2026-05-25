import { getSupabaseServer } from '@/lib/supabase/server';
import { getPrimaryPortfolio, getHoldingsView } from '@/lib/portfolio';
import { enrichInstruments } from '@/lib/marketdata/enrich';
import { EmptyState } from '@/components/EmptyState';
import { DonutCard } from '@/components/DonutCard';
import { SectorDetailTable } from '@/components/SectorDetailTable';
import { ConcentrationCheck } from '@/components/ConcentrationCheck';

// STOXX-600-ish sector benchmark for the "vs benchmark" column.
const SECTOR_BENCH: Record<string, number> = {
  'Technology': 11,
  'Healthcare': 13,
  'Consumer Defensive': 11,
  'Consumer Cyclical': 10,
  'Financial Services': 17,
  'Industrials': 14,
  'Communication Services': 4,
  'Energy': 5,
  'Real Estate': 3,
  'Utilities': 4,
  'Basic Materials': 8,
};

const SECTOR_COLORS = [
  'oklch(0.55 0.10 175)',
  'oklch(0.60 0.09 145)',
  'oklch(0.62 0.10 110)',
  'oklch(0.62 0.10 85)',
  'oklch(0.65 0.10 60)',
  'oklch(0.62 0.10 35)',
  'oklch(0.55 0.09 320)',
  'oklch(0.55 0.08 270)',
  'oklch(0.58 0.08 235)',
  'oklch(0.55 0.08 200)',
];
const GEO_COLORS = [
  'oklch(0.42 0.07 175)',
  'oklch(0.55 0.10 200)',
  'oklch(0.58 0.10 220)',
  'oklch(0.62 0.09 240)',
  'oklch(0.60 0.08 260)',
  'oklch(0.58 0.08 195)',
  'oklch(0.62 0.08 180)',
  'oklch(0.55 0.08 150)',
];
const CCY_COLORS = [
  'oklch(0.55 0.10 175)',
  'oklch(0.62 0.10 110)',
  'oklch(0.60 0.10 50)',
  'oklch(0.55 0.10 320)',
  'oklch(0.55 0.10 250)',
  'oklch(0.60 0.08 200)',
];

export default async function DiversificationScreen() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const portfolio = await getPrimaryPortfolio(supabase, user!.id);

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

  interface Pos {
    ticker: string;
    name: string | null;
    sector: string;
    country: string;
    currency: string;
    value: number;
    fwdIncome: number;
  }
  const positions: Pos[] = held.map((h) => ({
    ticker: h.ticker,
    name: h.name,
    sector: h.sector ?? 'Unknown',
    country: countryByT.get(h.ticker) ?? 'Unknown',
    currency: h.currency ?? 'EUR',
    value: (h.price ?? 0) * h.quantity,
    fwdIncome: (h.fwdDivAnnualLocal ?? 0) * h.quantity,
  }));

  const totalValue = positions.reduce((s, p) => s + p.value, 0);
  const totalIncome = positions.reduce((s, p) => s + p.fwdIncome, 0);

  // HHI on value share (%²)
  const hhi = positions.reduce(
    (s, p) => s + Math.pow(totalValue > 0 ? (p.value / totalValue) * 100 : 0, 2),
    0,
  );
  const sortedDesc = [...positions].sort((a, b) => b.value - a.value);
  const sumTopN = (n: number) => sortedDesc.slice(0, n).reduce((s, p) => s + p.value, 0);
  const top5Pct = totalValue > 0 ? (sumTopN(5) / totalValue) * 100 : 0;
  const top10Pct = totalValue > 0 ? (sumTopN(10) / totalValue) * 100 : 0;
  const effectiveN = hhi > 0 ? 10000 / hhi : 0;
  const largest = sortedDesc[0];
  const largestPct = largest && totalValue > 0 ? (largest.value / totalValue) * 100 : 0;

  interface Group { key: string; value: number; income: number; positions: number; }
  function rollup(by: (p: Pos) => string): Group[] {
    const map = new Map<string, Group>();
    for (const p of positions) {
      const k = by(p);
      const g = map.get(k) ?? { key: k, value: 0, income: 0, positions: 0 };
      g.value += p.value;
      g.income += p.fwdIncome;
      g.positions += 1;
      map.set(k, g);
    }
    return [...map.values()].sort((a, b) => b.value - a.value);
  }

  const bySector = rollup((p) => p.sector);
  const byCountry = rollup((p) => p.country);
  const byCurrency = rollup((p) => p.currency);

  // Currency donut weights itself by forward income (matches template intent)
  const ccyByIncome = [...byCurrency]
    .map((g) => ({
      key: g.key,
      value: totalIncome > 0 ? (g.income / totalIncome) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
  const eurIncomePct = ccyByIncome.find((c) => c.key === 'EUR')?.value ?? 0;

  // Donut data — fractions of value
  const sectorDonut = bySector.map((g) => ({
    key: g.key,
    value: totalValue > 0 ? (g.value / totalValue) * 100 : 0,
  }));
  const geoDonut = byCountry.map((g) => ({
    key: g.key,
    value: totalValue > 0 ? (g.value / totalValue) * 100 : 0,
  }));

  // "Well spread" verdict
  const concGood = hhi < 1500;
  const concColor = hhi < 1500 ? 'oklch(0.36 0.08 165)'
    : hhi < 2500 ? 'oklch(0.55 0.10 75)'
    : 'oklch(0.50 0.16 25)';
  const headline = concGood
    ? 'Well spread'
    : hhi < 2500 ? 'Moderately concentrated' : 'Highly concentrated';

  const sectorsTail = bySector.slice(6);
  const sectorsTailPct = sectorsTail.reduce(
    (s, g) => s + (totalValue > 0 ? (g.value / totalValue) * 100 : 0),
    0,
  );
  const geoTail = Math.max(0, byCountry.length - 6);

  return (
    <div className="cdn-pro">
      <div className="pro-hero">
        <div>
          <div className="eyebrow">Diversification · by value</div>
          <h1>
            {headline}{' '}
            <span className="light">
              across {byCountry.length} countr{byCountry.length === 1 ? 'y' : 'ies'}
            </span>
          </h1>
          <div className="sub">
            HHI of <b style={{ color: concColor }}>{hhi.toFixed(0)}</b>{' '}
            {concGood ? 'is comfortably below' : hhi < 2500 ? 'sits around' : 'is well above'}{' '}
            the 1500 concentration threshold.{' '}
            {largest && <>Single largest position is <b>{largest.ticker} at {largestPct.toFixed(1)}%</b>.</>}
          </div>
        </div>
        <div className="right-meta">
          <span className="live">{positions.length} positions · {bySector.length} sectors</span>
          <span>{byCurrency.length} currenc{byCurrency.length === 1 ? 'y' : 'ies'} · {eurIncomePct.toFixed(0)}% EUR</span>
          <span>Effective N = {effectiveN.toFixed(1)}</span>
        </div>
      </div>

      {/* Three donut cards */}
      <div className="row-3">
        <DonutCard
          title="Sectors"
          tag="GICS · by value"
          data={sectorDonut}
          colors={SECTOR_COLORS}
          centerValue={bySector.length}
          centerLabel="buckets"
          legendCount={6}
          tail={sectorsTail.length > 0 ? { count: sectorsTail.length, pct: sectorsTailPct } : null}
          index={0}
        />
        <DonutCard
          title="Geography"
          tag="Domicile"
          data={geoDonut}
          colors={GEO_COLORS}
          centerValue={byCountry.length}
          centerLabel="buckets"
          legendCount={6}
          tail={geoTail > 0 ? { count: geoTail } : null}
          index={1}
        />
        <DonutCard
          title="Currencies"
          tag="By forward income"
          data={ccyByIncome}
          colors={CCY_COLORS}
          centerValue={byCurrency.length}
          centerLabel="buckets"
          legendCount={ccyByIncome.length}
          index={2}
        />
      </div>

      {/* Sector detail vs benchmark + Concentration check */}
      <div className="row-2" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        <SectorDetailTable
          sectors={bySector}
          colors={SECTOR_COLORS}
          totalValue={totalValue}
          totalIncome={totalIncome}
          benchmark={SECTOR_BENCH}
          index={3}
        />
        <ConcentrationCheck
          hhi={hhi}
          concColor={concColor}
          top5Pct={top5Pct}
          top10Pct={top10Pct}
          largestPct={largestPct}
          largestColor={
            largestPct < 10
              ? 'oklch(0.48 0.08 165)'
              : largestPct < 15
                ? 'oklch(0.55 0.10 75)'
                : 'oklch(0.50 0.16 25)'
          }
          index={4}
        />
      </div>
    </div>
  );
}
