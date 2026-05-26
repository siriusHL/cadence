'use client';

// Mobile Diversification — V2b chassis (Pro tier).
// Mirrors templates/pro-pages.jsx DiversificationPage:
//   pro-hero-mob: "N positions across X sectors · Y countries · Z currencies"
//   .segtop-pro tab strip (Sector / Country / Currency)
//   Donut chart with metadata sidebar (largest slice name + pct)
//   Legend rows: swatch · name · value · pct
//   Concentration check: HHI / Top 5 / Top 10 / Single largest

import { useState, useMemo } from 'react';
import { MobileShell } from '@/components/mobile/MobileShell';

function fmt(n: number, digits = 0): string {
  return n.toLocaleString('en-IE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

const PALETTE = [
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

export interface DiversificationMobilePos {
  ticker: string;
  sector: string;
  country: string;
  currency: string;
  value: number;
}

export interface DiversificationMobileProps {
  positions: DiversificationMobilePos[];
  portfolioName: string;
  avatarInitials: string;
}

type View = 'sector' | 'country' | 'currency';

interface Segment {
  name: string;
  value: number;
  pct: number;
  color: string;
}

export function DiversificationMobile({
  positions,
  portfolioName,
  avatarInitials,
}: DiversificationMobileProps) {
  const [view, setView] = useState<View>('sector');

  const totalValue = useMemo(
    () => positions.reduce((s, p) => s + p.value, 0),
    [positions],
  );

  const segments: Segment[] = useMemo(() => {
    const key = (p: DiversificationMobilePos) =>
      view === 'sector' ? p.sector : view === 'country' ? p.country : p.currency;
    const map = new Map<string, number>();
    for (const p of positions) {
      const k = key(p) || 'Unknown';
      map.set(k, (map.get(k) ?? 0) + p.value);
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({
        name,
        value,
        pct: totalValue > 0 ? (value / totalValue) * 100 : 0,
        color: PALETTE[i % PALETTE.length],
      }));
  }, [positions, view, totalValue]);

  const sectorCount   = useMemo(() => new Set(positions.map((p) => p.sector)).size,   [positions]);
  const countryCount  = useMemo(() => new Set(positions.map((p) => p.country)).size,  [positions]);
  const currencyCount = useMemo(() => new Set(positions.map((p) => p.currency)).size, [positions]);

  // Concentration metrics (HHI, top-5, top-10, single largest)
  const concentration = useMemo(() => {
    const weights = positions
      .map((p) => (totalValue > 0 ? (p.value / totalValue) * 100 : 0))
      .sort((a, b) => b - a);
    const hhi = weights.reduce((s, w) => s + w * w, 0);
    const top5 = weights.slice(0, 5).reduce((s, w) => s + w, 0);
    const top10 = weights.slice(0, 10).reduce((s, w) => s + w, 0);
    const single = weights[0] ?? 0;
    return { hhi, top5, top10, single };
  }, [positions, totalValue]);

  const concRows = [
    {
      label: 'HHI · concentration',
      value: concentration.hhi.toFixed(0),
      status: concentration.hhi < 1500 ? 'ok' : concentration.hhi < 2500 ? 'warn' : 'danger',
      note: concentration.hhi < 1500
        ? 'Well-diversified (below 1500)'
        : concentration.hhi < 2500
        ? 'Moderate concentration'
        : 'Concentrated (above 2500)',
    },
    {
      label: 'Top 5 weight',
      value: concentration.top5.toFixed(1) + '%',
      status: concentration.top5 < 40 ? 'ok' : concentration.top5 < 70 ? 'warn' : 'danger',
      note: 'Target < 40%',
    },
    {
      label: 'Top 10 weight',
      value: concentration.top10.toFixed(1) + '%',
      status: concentration.top10 < 60 ? 'ok' : concentration.top10 < 85 ? 'warn' : 'danger',
      note: 'Target < 60%',
    },
    {
      label: 'Single largest',
      value: concentration.single.toFixed(1) + '%',
      status: concentration.single < 10 ? 'ok' : concentration.single < 15 ? 'warn' : 'danger',
      note: 'Target < 10%',
    },
  ] as const;
  const warnings = concRows.filter((r) => r.status !== 'ok').length;

  return (
    <MobileShell
      currentTab="more"
      portfolioName={portfolioName}
      avatarInitials={avatarInitials}
      chassis="v2b"
    >
      {/* Hero */}
      <div className="pro-hero-mob cdn-anim" style={{ '--i': 0 } as React.CSSProperties}>
        <div className="eyebrow">Diversification</div>
        <h1>
          {positions.length} position{positions.length === 1 ? '' : 's'}{' '}
          <span className="light">across</span>
        </h1>
        <div className="sub">
          <b>{sectorCount} sector{sectorCount === 1 ? '' : 's'}</b> ·{' '}
          <b>{countryCount} countr{countryCount === 1 ? 'y' : 'ies'}</b> ·{' '}
          <b>{currencyCount} currenc{currencyCount === 1 ? 'y' : 'ies'}</b>
        </div>
      </div>

      {/* View segmented tabs */}
      <div className="segtop-pro cdn-anim" style={{ '--i': 1 } as React.CSSProperties}>
        {[
          { id: 'sector' as const,   label: 'Sector' },
          { id: 'country' as const,  label: 'Country' },
          { id: 'currency' as const, label: 'Currency' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            className={'seg' + (view === t.id ? ' is-active' : '')}
            onClick={() => setView(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Donut + legend */}
      {segments.length > 0 && (
        <div className="pcard cdn-anim" style={{ '--i': 2 } as React.CSSProperties}>
          <div className="pcard-h">
            <div className="t">Breakdown</div>
            <span className="more">€{fmt(Math.round(totalValue))} total</span>
          </div>
          <div className="donut-wrap">
            <Donut segments={segments} size={120} />
            <div className="donut-meta">
              <div className="v">{segments[0].pct.toFixed(1)}%</div>
              <div className="l">{segments[0].name}</div>
              <div className="l" style={{ marginTop: 6 }}>largest</div>
            </div>
          </div>
          <div style={{ marginTop: 6 }}>
            {segments.map((s) => (
              <div className="legend-row" key={s.name}>
                <span className="swatch" style={{ background: s.color }} />
                <span className="name">{s.name}</span>
                <span className="val">€{fmt(Math.round(s.value))}</span>
                <span className="pct">{s.pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Concentration check */}
      <div className="pcard cdn-anim" style={{ '--i': 3 } as React.CSSProperties}>
        <div className="pcard-h">
          <div className="t">Concentration check</div>
          <span className="more">
            {warnings === 0 ? 'all clear' : `${warnings} warning${warnings === 1 ? '' : 's'}`}
          </span>
        </div>
        <div>
          {concRows.map((r) => (
            <div className="conc-row" key={r.label}>
              <span className={'dot ' + r.status} />
              <div className="body">
                <div className="label">{r.label}</div>
                <div className="note">{r.note}</div>
              </div>
              <div className="v">{r.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 80 }} />
    </MobileShell>
  );
}

// Pure SVG donut. Avoids the closure-mutation pattern from the template
// (`let offset = 0; segments.map(... offset += len)`) which the React lint
// rule flags as render-time reassignment. Precompute cumulative offsets via
// reduce so the map callback is pure.
function Donut({ segments, size = 120 }: { segments: Segment[]; size?: number }) {
  const r = (size - 16) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const c = 2 * Math.PI * r;
  const lens = segments.map((s) => (s.pct / 100) * c);
  // cumulative[i] = sum of lens[0..i-1]
  const cumulative = lens.reduce<number[]>((acc) => {
    acc.push(acc.length === 0 ? 0 : acc[acc.length - 1] + lens[acc.length - 1]);
    return acc;
  }, []);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={14} />
      {segments.map((s, i) => {
        const len = lens[i];
        const dash = `${len} ${c - len}`;
        return (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={14}
            strokeDasharray={dash}
            strokeDashoffset={-cumulative[i]}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
      })}
    </svg>
  );
}
