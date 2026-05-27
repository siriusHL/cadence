'use client';

import { useMemo, useState } from 'react';
import { DonutCard } from './DonutCard';
import { SectorDetailTable } from './SectorDetailTable';
import { ConcentrationCheck } from './ConcentrationCheck';
import { InfoTooltip } from './InfoTooltip';

export interface DiversificationPos {
  ticker: string;
  name: string | null;
  sector: string;
  country: string;
  currency: string;
  value: number;
  fwdIncome: number;
}

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

type Weighting = 'value' | 'income';

interface Group {
  key: string;
  value: number;
  income: number;
  positions: number;
}

export function DiversificationView({ positions }: { positions: DiversificationPos[] }) {
  const [weighting, setWeighting] = useState<Weighting>('value');
  const [payersOnly, setPayersOnly] = useState(false);
  const [minYieldPct, setMinYieldPct] = useState(0);

  const filtered = useMemo(() => {
    return positions.filter((p) => {
      const yieldPct = p.value > 0 ? (p.fwdIncome / p.value) * 100 : 0;
      if (payersOnly && p.fwdIncome <= 0) return false;
      if (minYieldPct > 0 && yieldPct < minYieldPct) return false;
      return true;
    });
  }, [positions, payersOnly, minYieldPct]);

  const view = useMemo(() => {
    const totalValue = filtered.reduce((s, p) => s + p.value, 0);
    const totalIncome = filtered.reduce((s, p) => s + p.fwdIncome, 0);
    const weightOf = (p: DiversificationPos) =>
      weighting === 'value' ? p.value : p.fwdIncome;
    const totalWeight = weighting === 'value' ? totalValue : totalIncome;

    const hhi = filtered.reduce(
      (s, p) =>
        s +
        Math.pow(totalWeight > 0 ? (weightOf(p) / totalWeight) * 100 : 0, 2),
      0,
    );
    const sortedDesc = [...filtered].sort((a, b) => weightOf(b) - weightOf(a));
    const sumTopN = (n: number) =>
      sortedDesc.slice(0, n).reduce((s, p) => s + weightOf(p), 0);
    const top5Pct = totalWeight > 0 ? (sumTopN(5) / totalWeight) * 100 : 0;
    const top10Pct = totalWeight > 0 ? (sumTopN(10) / totalWeight) * 100 : 0;
    const effectiveN = hhi > 0 ? 10000 / hhi : 0;
    const largest = sortedDesc[0];
    const largestPct =
      largest && totalWeight > 0 ? (weightOf(largest) / totalWeight) * 100 : 0;

    const rollup = (by: (p: DiversificationPos) => string): Group[] => {
      const map = new Map<string, Group>();
      for (const p of filtered) {
        const k = by(p);
        const g =
          map.get(k) ?? { key: k, value: 0, income: 0, positions: 0 };
        g.value += p.value;
        g.income += p.fwdIncome;
        g.positions += 1;
        map.set(k, g);
      }
      return [...map.values()].sort((a, b) =>
        weighting === 'value' ? b.value - a.value : b.income - a.income,
      );
    };

    const bySector = rollup((p) => p.sector);
    const byCountry = rollup((p) => p.country);
    const byCurrency = rollup((p) => p.currency);

    // Currencies stay weighted by forward income — matches the dividend lens.
    const ccyByIncome = [...byCurrency]
      .map((g) => ({
        key: g.key,
        value: totalIncome > 0 ? (g.income / totalIncome) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
    const eurIncomePct =
      ccyByIncome.find((c) => c.key === 'EUR')?.value ?? 0;

    const groupPct = (g: Group) =>
      totalWeight > 0
        ? ((weighting === 'value' ? g.value : g.income) / totalWeight) * 100
        : 0;

    const sectorDonut = bySector.map((g) => ({
      key: g.key,
      value: groupPct(g),
    }));
    const geoDonut = byCountry.map((g) => ({
      key: g.key,
      value: groupPct(g),
    }));

    const concGood = hhi < 1500;
    const concColor =
      hhi < 1500
        ? 'oklch(0.36 0.08 165)'
        : hhi < 2500
          ? 'oklch(0.55 0.10 75)'
          : 'oklch(0.50 0.16 25)';
    const headline = concGood
      ? 'Well spread'
      : hhi < 2500
        ? 'Moderately concentrated'
        : 'Highly concentrated';

    const sectorsTail = bySector.slice(6);
    const sectorsTailPct = sectorsTail.reduce((s, g) => s + groupPct(g), 0);
    const geoTail = Math.max(0, byCountry.length - 6);

    return {
      totalValue,
      totalIncome,
      hhi,
      top5Pct,
      top10Pct,
      effectiveN,
      largest,
      largestPct,
      bySector,
      byCountry,
      byCurrency,
      sectorDonut,
      geoDonut,
      ccyByIncome,
      eurIncomePct,
      concGood,
      concColor,
      headline,
      sectorsTail,
      sectorsTailPct,
      geoTail,
    };
  }, [filtered, weighting]);

  const hiddenCount = positions.length - filtered.length;
  const weightingTag = weighting === 'value' ? 'by value' : 'by forward income';

  const isEmpty = filtered.length === 0;
  const emptyMessage = useMemo(() => {
    if (!isEmpty) return null;
    const yields = positions
      .filter((p) => p.fwdIncome > 0 && p.value > 0)
      .map((p) => (p.fwdIncome / p.value) * 100);
    const maxYield = yields.length > 0 ? Math.max(...yields) : 0;
    const payerCount = yields.length;

    if (payersOnly && payerCount === 0) {
      return {
        headline: 'No dividend payers',
        sub: 'None of your positions have a forward dividend on record. Turn off "Dividend payers only" to see the full breakdown.',
      };
    }
    if (payersOnly && minYieldPct > 0) {
      return {
        headline: `No payers above ${minYieldPct.toFixed(1)}%`,
        sub: `Your highest-yielding payer is ${maxYield.toFixed(2)}%. Lower the threshold or clear the filters.`,
      };
    }
    if (minYieldPct > 0) {
      return {
        headline: `No positions yielding ≥ ${minYieldPct.toFixed(1)}%`,
        sub: `Your highest-yielding position is ${maxYield.toFixed(2)}%. Lower the min-yield slider to bring positions back in.`,
      };
    }
    return {
      headline: 'No positions match your filters',
      sub: 'Loosen the filters above to see your portfolio breakdown.',
    };
  }, [isEmpty, positions, payersOnly, minYieldPct]);

  return (
    <div className="cdn-pro">
      <div className="pro-hero">
        <div>
          <div className="eyebrow">
            Diversification · {weightingTag}
            <InfoTooltip label="How spread out your holdings are across sectors, countries, and currencies. Diversification reduces the impact of any single stock, industry, or region having a bad year. Switch 'Weight by' between Value and Forward income to view either lens." />
          </div>
          {emptyMessage ? (
            <>
              <h1>{emptyMessage.headline}</h1>
              <div className="sub">{emptyMessage.sub}</div>
            </>
          ) : (
            <>
              <h1>
                {view.headline}{' '}
                <span className="light">
                  across {view.byCountry.length} countr
                  {view.byCountry.length === 1 ? 'y' : 'ies'}
                </span>
              </h1>
              <div className="sub">
                HHI
                <InfoTooltip label="Herfindahl-Hirschman Index: a 0–10,000 concentration score. One stock holding everything = 10,000. 100 equal positions = 100. Below 1,500 is well diversified; above 2,500 is concentrated." />
                {' '}of{' '}
                <b style={{ color: view.concColor }}>{view.hhi.toFixed(0)}</b>{' '}
                {view.concGood
                  ? 'is comfortably below'
                  : view.hhi < 2500
                    ? 'sits around'
                    : 'is well above'}{' '}
                the 1500 concentration threshold.{' '}
                {view.largest && (
                  <>
                    Single largest position is{' '}
                    <b>
                      {view.largest.ticker} at {view.largestPct.toFixed(1)}%
                    </b>
                    .
                  </>
                )}
              </div>
            </>
          )}
        </div>
        <div className="right-meta">
          <span className="live">
            {filtered.length} position{filtered.length === 1 ? '' : 's'} ·{' '}
            {view.bySector.length} sector
            {view.bySector.length === 1 ? '' : 's'}
          </span>
          <span>
            {view.byCurrency.length} currenc
            {view.byCurrency.length === 1 ? 'y' : 'ies'} ·{' '}
            {view.eurIncomePct.toFixed(0)}% EUR
          </span>
          <span>
            Effective N ={' '}
            {isEmpty ? '—' : view.effectiveN.toFixed(1)}
            <InfoTooltip label="Effective number of positions: roughly how many equal-sized holdings your portfolio behaves like. If you have 30 stocks but a few of them dominate, your Effective N might be only 8 — a warning that you're less diversified than the position count suggests." />
          </span>
        </div>
      </div>

      <FilterBar
        weighting={weighting}
        setWeighting={setWeighting}
        payersOnly={payersOnly}
        setPayersOnly={setPayersOnly}
        minYieldPct={minYieldPct}
        setMinYieldPct={setMinYieldPct}
        hiddenCount={hiddenCount}
        totalCount={positions.length}
      />

      <div className="row-3">
        <DonutCard
          title="Sectors"
          tag={`GICS · ${weightingTag}`}
          info="How your money is split across industries (tech, healthcare, financials, etc.). GICS is the industry-standard classification used by S&P. Heavy weighting in one sector means your portfolio rises and falls with that sector's fate."
          data={view.sectorDonut}
          colors={SECTOR_COLORS}
          centerValue={view.bySector.length}
          centerLabel="buckets"
          legendCount={6}
          tail={
            view.sectorsTail.length > 0
              ? { count: view.sectorsTail.length, pct: view.sectorsTailPct }
              : null
          }
          index={0}
        />
        <DonutCard
          title="Geography"
          tag={`Domicile · ${weightingTag}`}
          info="Where your holdings are legally headquartered (their 'domicile'), not where they do business. A US-domiciled tech giant may earn most of its revenue in Europe and Asia — geography here is about regulatory exposure, not customer base."
          data={view.geoDonut}
          colors={GEO_COLORS}
          centerValue={view.byCountry.length}
          centerLabel="buckets"
          legendCount={6}
          tail={view.geoTail > 0 ? { count: view.geoTail } : null}
          index={1}
        />
        <DonutCard
          title="Currencies"
          tag="By forward income"
          info="Which currencies pay your dividends. High non-EUR share = your income is exposed to exchange-rate swings (a strong dollar boosts USD dividends in euros; a weak dollar shrinks them)."
          data={view.ccyByIncome}
          colors={CCY_COLORS}
          centerValue={view.byCurrency.length}
          centerLabel="buckets"
          legendCount={view.ccyByIncome.length}
          index={2}
        />
      </div>

      <div className="row-2" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        <SectorDetailTable
          sectors={view.bySector}
          colors={SECTOR_COLORS}
          totalValue={view.totalValue}
          totalIncome={view.totalIncome}
          benchmark={SECTOR_BENCH}
          index={3}
        />
        <ConcentrationCheck
          hhi={view.hhi}
          concColor={view.concColor}
          top5Pct={view.top5Pct}
          top10Pct={view.top10Pct}
          largestPct={view.largestPct}
          largestColor={
            view.largestPct < 10
              ? 'oklch(0.48 0.08 165)'
              : view.largestPct < 15
                ? 'oklch(0.55 0.10 75)'
                : 'oklch(0.50 0.16 25)'
          }
          index={4}
        />
      </div>
    </div>
  );
}

const MIN_YIELD_MAX = 15;

function FilterBar({
  weighting,
  setWeighting,
  payersOnly,
  setPayersOnly,
  minYieldPct,
  setMinYieldPct,
  hiddenCount,
  totalCount,
}: {
  weighting: Weighting;
  setWeighting: (w: Weighting) => void;
  payersOnly: boolean;
  setPayersOnly: (b: boolean) => void;
  minYieldPct: number;
  setMinYieldPct: (n: number) => void;
  hiddenCount: number;
  totalCount: number;
}) {
  const filtersActive = payersOnly || minYieldPct > 0;
  const sliderProgress = (minYieldPct / MIN_YIELD_MAX) * 100;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
        padding: '10px 14px',
        margin: '0 0 16px',
        background: 'var(--surface-2)',
        borderRadius: 12,
        fontSize: 12,
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        aria-label="Sectors and geography weighting"
      >
        <span style={{ color: 'var(--text-dim)' }}>Weight by</span>
        <div className="seg">
          <button
            type="button"
            className={weighting === 'value' ? 'on' : ''}
            onClick={() => setWeighting('value')}
          >
            Value
          </button>
          <button
            type="button"
            className={weighting === 'income' ? 'on' : ''}
            onClick={() => setWeighting('income')}
          >
            Forward income
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setPayersOnly(!payersOnly)}
        aria-pressed={payersOnly}
        style={{
          appearance: 'none',
          font: 'inherit',
          fontSize: 11.5,
          fontWeight: 500,
          padding: '4px 12px',
          minHeight: 22,
          borderRadius: 999,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          transition: 'background 120ms, color 120ms, border-color 120ms',
          background: payersOnly ? 'oklch(0.55 0.10 175)' : 'transparent',
          color: payersOnly ? '#fff' : 'var(--text-muted)',
          border: payersOnly
            ? '1px solid oklch(0.55 0.10 175)'
            : '1px solid var(--border)',
          boxShadow: payersOnly ? '0 1px 2px rgba(0,0,0,.08)' : 'none',
        }}
      >
        <span
          aria-hidden
          style={{
            display: 'inline-block',
            width: 12,
            textAlign: 'center',
            opacity: payersOnly ? 1 : 0.5,
          }}
        >
          {payersOnly ? '✓' : '+'}
        </span>
        Dividend payers only
      </button>

      <label
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          color: 'var(--text-muted)',
        }}
      >
        <span>Min yield</span>
        <input
          type="range"
          className="drip-slider"
          min={0}
          max={MIN_YIELD_MAX}
          step={0.1}
          value={minYieldPct}
          onChange={(e) => setMinYieldPct(Number(e.target.value))}
          aria-label="Minimum dividend yield"
          style={{
            width: 140,
            margin: 0,
            ['--progress' as string]: `${sliderProgress}%`,
          }}
        />
        <span
          className="num"
          style={{
            color: minYieldPct > 0 ? 'var(--text)' : 'var(--text-dim)',
            fontVariantNumeric: 'tabular-nums',
            minWidth: 38,
            textAlign: 'right',
          }}
        >
          {minYieldPct.toFixed(1)}%
        </span>
      </label>

      <div style={{ marginLeft: 'auto', color: 'var(--text-dim)' }}>
        {filtersActive ? (
          <>
            {totalCount - hiddenCount} of {totalCount} positions
            {hiddenCount > 0 && (
              <>
                {' '}
                ·{' '}
                <button
                  type="button"
                  onClick={() => {
                    setPayersOnly(false);
                    setMinYieldPct(0);
                  }}
                  style={{
                    appearance: 'none',
                    background: 'transparent',
                    border: 0,
                    padding: 0,
                    font: 'inherit',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  clear
                </button>
              </>
            )}
          </>
        ) : (
          <>{totalCount} positions</>
        )}
      </div>
    </div>
  );
}
