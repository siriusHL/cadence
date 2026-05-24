import { getSupabaseServer } from '@/lib/supabase/server';
import { getPrimaryPortfolio, getHoldingsView } from '@/lib/portfolio';
import { enrichInstruments } from '@/lib/marketdata/enrich';
import { EmptyState } from '@/components/EmptyState';
import { Donut } from '@/components/Donut';

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

  const visibleSectors = bySector.slice(0, 6);
  const sectorsTail = bySector.slice(6);
  const sectorsTailPct = sectorsTail.reduce(
    (s, g) => s + (totalValue > 0 ? (g.value / totalValue) * 100 : 0),
    0,
  );
  const visibleGeo = byCountry.slice(0, 6);
  const geoTail = byCountry.length - visibleGeo.length;

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
        <div className="pcard">
          <div className="pcard-h">
            <div className="t">Sectors</div>
            <span className="tag">GICS · by value</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <Donut
              data={sectorDonut}
              colors={SECTOR_COLORS}
              size={130}
              thickness={20}
              centerValue={bySector.length}
              centerLabel="buckets"
            />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {visibleSectors.map((s, i) => {
                const pct = totalValue > 0 ? (s.value / totalValue) * 100 : 0;
                return (
                  <LegendRow
                    key={s.key}
                    color={SECTOR_COLORS[i % SECTOR_COLORS.length]}
                    label={s.key}
                    value={`${pct.toFixed(1)}%`}
                  />
                );
              })}
              {sectorsTail.length > 0 && (
                <div style={{ fontSize: 10.5, color: '#86868b', marginTop: 4 }}>
                  + {sectorsTail.length} more · {sectorsTailPct.toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pcard">
          <div className="pcard-h">
            <div className="t">Geography</div>
            <span className="tag">Domicile</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <Donut
              data={geoDonut}
              colors={GEO_COLORS}
              size={130}
              thickness={20}
              centerValue={byCountry.length}
              centerLabel="buckets"
            />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {visibleGeo.map((g, i) => {
                const pct = totalValue > 0 ? (g.value / totalValue) * 100 : 0;
                return (
                  <LegendRow
                    key={g.key}
                    color={GEO_COLORS[i % GEO_COLORS.length]}
                    label={g.key}
                    value={`${pct.toFixed(1)}%`}
                  />
                );
              })}
              {geoTail > 0 && (
                <div style={{ fontSize: 10.5, color: '#86868b', marginTop: 4 }}>
                  + {geoTail} more
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pcard">
          <div className="pcard-h">
            <div className="t">Currencies</div>
            <span className="tag">By forward income</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <Donut
              data={ccyByIncome}
              colors={CCY_COLORS}
              size={130}
              thickness={20}
              centerValue={byCurrency.length}
              centerLabel="buckets"
            />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {ccyByIncome.map((c, i) => (
                <LegendRow
                  key={c.key}
                  color={CCY_COLORS[i % CCY_COLORS.length]}
                  label={c.key}
                  value={`${c.value.toFixed(1)}%`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sector detail vs benchmark + Concentration check */}
      <div className="row-2" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        <div className="pcard flush" style={{ overflow: 'hidden' }}>
          <div className="pcard-h" style={{ padding: '20px 22px 8px', margin: 0 }}>
            <div className="t">Sector detail · vs benchmark</div>
            <span className="tag">+ / − pp</span>
          </div>
          <div style={{ maxHeight: 320, overflow: 'auto' }}>
            <table className="pt">
              <thead>
                <tr>
                  <th>Sector</th>
                  <th className="r">% value</th>
                  <th className="r">% income</th>
                  <th className="r">Yield</th>
                  <th style={{ width: 200 }}>vs STOXX 600</th>
                </tr>
              </thead>
              <tbody>
                {bySector.map((s, i) => {
                  const valuePct = totalValue > 0 ? (s.value / totalValue) * 100 : 0;
                  const incomePct = totalIncome > 0 ? (s.income / totalIncome) * 100 : 0;
                  const yieldPct = s.value > 0 ? (s.income / s.value) * 100 : 0;
                  const bench = SECTOR_BENCH[s.key] ?? 5;
                  const diff = valuePct - bench;
                  return (
                    <tr key={s.key}>
                      <td className="ticker">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            style={{
                              width: 10, height: 10, borderRadius: 3,
                              background: SECTOR_COLORS[i % SECTOR_COLORS.length],
                              flexShrink: 0,
                            }}
                          />
                          {s.key}
                        </div>
                      </td>
                      <td className="r b">{valuePct.toFixed(1)}%</td>
                      <td className="r muted">{incomePct.toFixed(1)}%</td>
                      <td className="r">{yieldPct.toFixed(2)}%</td>
                      <td>
                        <BenchBar diff={diff} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="pcard">
          <div className="pcard-h">
            <div className="t">Concentration check</div>
            <span className="tag">thresholds</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Metric
              label="HHI"
              value={hhi.toFixed(0)}
              pct={(hhi / 2500) * 100}
              caption="2500 (high)"
              color={concColor}
              tip={
                <>
                  <b>Herfindahl-Hirschman Index.</b> Sum of each position&rsquo;s squared
                  weight (in %). One stock holding everything scores <span className="mono">10,000</span>;
                  {' '}100 equal positions score <span className="mono">100</span>. Below{' '}
                  <span className="mono">1,500</span> is well-diversified, above{' '}
                  <span className="mono">2,500</span> is concentrated. You: <b>{hhi.toFixed(0)}</b>.
                </>
              }
            />
            <Metric
              label="Top 5 weight"
              value={`${top5Pct.toFixed(1)}%`}
              pct={top5Pct}
              caption="Target < 40%"
              color="#1d1d1f"
            />
            <Metric
              label="Top 10 weight"
              value={`${top10Pct.toFixed(1)}%`}
              pct={top10Pct}
              caption="Target < 60%"
              color="#1d1d1f"
            />
            <Metric
              label="Single largest"
              value={`${largestPct.toFixed(1)}%`}
              pct={largestPct * 5}
              caption="Target < 10%"
              color={
                largestPct < 10 ? 'oklch(0.48 0.08 165)'
                  : largestPct < 15 ? 'oklch(0.55 0.10 75)'
                  : 'oklch(0.50 0.16 25)'
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5 }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
      <span
        style={{
          flex: 1, color: '#1d1d1f',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <span
        className="num"
        style={{
          fontWeight: 500, fontVariantNumeric: 'tabular-nums',
          minWidth: 44, textAlign: 'right',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function BenchBar({ diff }: { diff: number }) {
  const magnitude = Math.min(50, Math.abs(diff) * 3);
  const positive = diff >= 0;
  const color = positive ? 'oklch(0.55 0.10 175)' : 'oklch(0.50 0.16 25)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 140 }}>
      <div
        style={{
          flex: 1, height: 12, background: 'rgba(0,0,0,0.04)', borderRadius: 6,
          position: 'relative',
        }}
      >
        <span
          style={{
            position: 'absolute', left: '50%', top: 0, bottom: 0,
            width: 1, background: 'rgba(0,0,0,0.15)',
          }}
        />
        <span
          style={{
            position: 'absolute', top: 2, bottom: 2,
            [positive ? 'left' : 'right']: '50%',
            width: `${magnitude}%`,
            background: color,
            borderRadius: 4,
          }}
        />
      </div>
      <span
        className={'num ' + (positive ? 'up' : 'down')}
        style={{
          fontSize: 11, fontWeight: 500, minWidth: 46, textAlign: 'right',
          color, fontVariantNumeric: 'tabular-nums',
        }}
      >
        {positive ? '+' : ''}{diff.toFixed(1)}pp
      </span>
    </div>
  );
}

function InfoTip({ children }: { children: React.ReactNode }) {
  return (
    <span className="info" tabIndex={0} role="button" aria-label="What does this mean?">
      i
      <span className="pop" role="tooltip">{children}</span>
    </span>
  );
}

function Metric({
  label, value, pct, caption, color, tip,
}: {
  label: string;
  value: string;
  pct: number;
  caption: string;
  color: string;
  tip?: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 12, color: '#1d1d1f', fontWeight: 500 }}>
          {label}
          {tip && <InfoTip>{tip}</InfoTip>}
        </span>
        <span
          className="num"
          style={{
            fontSize: 18, fontWeight: 600, color,
            letterSpacing: '-0.015em', fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </span>
      </div>
      <div className="pbar" style={{ marginTop: 6 }}>
        <i style={{ width: `${Math.min(100, pct)}%`, background: color }} />
      </div>
      <div style={{ fontSize: 10.5, color: '#86868b', marginTop: 3 }}>{caption}</div>
    </div>
  );
}
