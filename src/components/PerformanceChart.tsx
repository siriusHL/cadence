'use client';

import { useMemo, useState } from 'react';
import { type PerformancePoint, type BenchmarkPoint } from '@/lib/portfolio';

export interface BenchmarkLine {
  id: string;
  name: string;
  color: string;
  series: BenchmarkPoint[];
}

interface Props {
  series: PerformancePoint[];
  benchmarks?: BenchmarkLine[];
}

type RangeKey = '3M' | '6M' | 'YTD' | '1Y' | '2Y' | 'All';

const RANGE_WEEKS: Record<RangeKey, number | 'ytd' | 'all'> = {
  '3M':  13, '6M': 26, 'YTD': 'ytd', '1Y': 52, '2Y': 104, 'All': 'all',
};

const PORTFOLIO_COLOR_UP   = 'oklch(0.55 0.10 175)';
const PORTFOLIO_COLOR_DOWN = 'oklch(0.50 0.16 25)';

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

/** Look up a benchmark return at the given date, falling back to the
 *  nearest-prior point. Returns null if no point exists at or before the date. */
function benchmarkValueAt(series: BenchmarkPoint[], date: string): number | null {
  let last: number | null = null;
  for (const p of series) {
    if (p.date > date) break;
    last = p.returnPct;
  }
  return last;
}

export function PerformanceChart({ series, benchmarks = [] }: Props) {
  const [range, setRange] = useState<RangeKey>('1Y');

  const slice = useMemo(() => {
    if (series.length === 0) return [];
    const cfg = RANGE_WEEKS[range];
    if (cfg === 'all') return series;
    if (cfg === 'ytd') {
      const ytdStart = `${new Date().getFullYear()}-01-01`;
      return series.filter((p) => p.date >= ytdStart);
    }
    return series.slice(-cfg);
  }, [series, range]);

  if (series.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#86868b', fontSize: 13 }}>
        Building performance history… data will populate shortly.
      </div>
    );
  }
  if (slice.length < 2) {
    const latest = series[series.length - 1];
    const latestStr = new Date(latest.date).toLocaleDateString('en', {
      month: 'short', day: '2-digit', year: 'numeric',
    });
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 16 }}>
          <div className="seg">
            {(Object.keys(RANGE_WEEKS) as RangeKey[]).map((r) => (
              <button key={r} type="button" onClick={() => setRange(r)} className={range === r ? 'on' : ''}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding: 32, textAlign: 'center', color: '#86868b', fontSize: 13, lineHeight: 1.5 }}>
          No data in this range.
          <div style={{ marginTop: 4, fontSize: 12, color: '#86868b' }}>
            Most recent weekly snapshot is from {latestStr}.
          </div>
        </div>
      </div>
    );
  }

  // ── Rebase portfolio relative to slice start ─────────────────────────
  const portBase = slice[0].returnPct;
  const portRebased = slice.map((p) => p.returnPct - portBase);
  const portLast = portRebased[portRebased.length - 1];
  const portColor = portLast >= 0 ? PORTFOLIO_COLOR_UP : PORTFOLIO_COLOR_DOWN;

  // ── Build benchmark lines aligned to the portfolio's slice dates ─────
  // For each portfolio date we look up the benchmark value at that date
  // (or nearest-prior). The base is the value at the first slice date.
  const benchmarkRebased = benchmarks
    .map((b) => {
      if (b.series.length < 2) return null;
      const sliceStartDate = slice[0].date;
      const benchBase = benchmarkValueAt(b.series, sliceStartDate);
      if (benchBase == null) return null;
      const values: (number | null)[] = slice.map((p) => {
        const v = benchmarkValueAt(b.series, p.date);
        return v == null ? null : v - benchBase;
      });
      // Need at least 2 non-null points to draw something.
      const validCount = values.filter((v) => v != null).length;
      if (validCount < 2) return null;
      const last = [...values].reverse().find((v) => v != null) ?? 0;
      return { ...b, values, last };
    })
    .filter((b): b is BenchmarkLine & { values: (number | null)[]; last: number } => b != null);

  // ── Y-axis range across portfolio + benchmarks ───────────────────────
  const allValues = [
    ...portRebased,
    ...benchmarkRebased.flatMap((b) => b.values.filter((v): v is number => v != null)),
  ];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const padPct = Math.max(2, (max - min) * 0.15);
  const yMin = Math.floor((min - padPct) / 5) * 5;
  const yMax = Math.ceil((max + padPct) / 5) * 5;
  const yRange = yMax - yMin || 1;

  const yTicks = [yMax, (yMax + yMin) / 2, yMin].filter((v) => v >= yMin && v <= yMax);
  if (yMin < 0 && yMax > 0) yTicks.push(0);

  const yAxisWidth = 50;
  const chartHeight = 220;

  const xs = (i: number) => (i / (slice.length - 1)) * 100;
  const ys = (v: number) => ((yMax - v) / yRange) * 100;

  const portLinePath = portRebased
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xs(i).toFixed(3)} ${ys(v).toFixed(3)}`)
    .join(' ');
  const portAreaPath =
    `${portLinePath} L ${xs(portRebased.length - 1).toFixed(3)} 100 L 0 100 Z`;

  // Build benchmark paths, splitting at nulls (carries gaps).
  function buildPath(values: (number | null)[]): string {
    let path = '';
    let started = false;
    values.forEach((v, i) => {
      if (v == null) { started = false; return; }
      path += `${started ? ' L' : 'M'} ${xs(i).toFixed(3)} ${ys(v).toFixed(3)}`;
      started = true;
    });
    return path;
  }

  const firstDate = new Date(slice[0].date);
  const lastDate = new Date(slice[slice.length - 1].date);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'baseline' }}>
          <span style={{ fontSize: 28, fontWeight: 600, color: portColor, letterSpacing: '-0.02em' }} className="num">
            {fmtPct(portLast)}
          </span>
          <span style={{ fontSize: 12, color: '#86868b' }}>
            {firstDate.toLocaleDateString('en', { month: 'short', day: '2-digit', year: '2-digit' })} → {lastDate.toLocaleDateString('en', { month: 'short', day: '2-digit', year: '2-digit' })}
          </span>
        </div>
        <div className="seg">
          {(Object.keys(RANGE_WEEKS) as RangeKey[]).map((r) => (
            <button key={r} type="button" onClick={() => setRange(r)} className={range === r ? 'on' : ''}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      {benchmarkRebased.length > 0 && (
        <div style={{ display: 'flex', gap: 16, fontSize: 11.5, color: '#6e6e73' }}>
          <LegendChip color={portColor} label="Your portfolio" value={fmtPct(portLast)} />
          {benchmarkRebased.map((b) => (
            <LegendChip key={b.id} color={b.color} label={b.name} value={fmtPct(b.last)} />
          ))}
        </div>
      )}

      {/* Chart */}
      <div style={{ position: 'relative', height: chartHeight + 24, display: 'flex' }}>
        {/* Y-axis */}
        <div style={{ width: yAxisWidth, height: chartHeight, position: 'relative', flexShrink: 0 }}>
          {yTicks.map((v, i) => {
            const pct = (yMax - v) / yRange;
            return (
              <div key={i} className="num" style={{
                position: 'absolute', right: 8, top: `${pct * 100}%`,
                transform: 'translateY(-50%)',
                fontSize: 10.5, color: v === 0 ? '#1d1d1f' : '#86868b',
                fontWeight: v === 0 ? 600 : 500,
              }}>
                {fmtPct(v)}
              </div>
            );
          })}
        </div>

        {/* Plot area */}
        <div style={{ position: 'relative', flex: 1, height: chartHeight + 24 }}>
          {/* Grid */}
          <div style={{ position: 'absolute', inset: '0 0 24px 0', pointerEvents: 'none' }}>
            {yTicks.map((v, i) => {
              const pct = (yMax - v) / yRange;
              return (
                <div key={i} style={{
                  position: 'absolute', left: 0, right: 0,
                  top: `${pct * 100}%`,
                  height: 1,
                  background: v === 0 ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.05)',
                }} />
              );
            })}
          </div>

          {/* SVG lines + area */}
          <svg
            style={{ position: 'absolute', inset: '0 0 24px 0', width: '100%', height: chartHeight }}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={portColor} stopOpacity="0.18" />
                <stop offset="100%" stopColor={portColor} stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Benchmarks behind portfolio so the user line stays on top */}
            {benchmarkRebased.map((b) => (
              <path
                key={b.id}
                d={buildPath(b.values)}
                fill="none"
                stroke={b.color}
                strokeWidth="1.4"
                strokeDasharray="4 3"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                style={{ strokeWidth: 1.4 }}
                opacity="0.85"
              />
            ))}

            <path d={portAreaPath} fill="url(#perfGrad)" />
            <path
              d={portLinePath}
              fill="none"
              stroke={portColor}
              strokeWidth="0.35"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              style={{ strokeWidth: 2 }}
            />
          </svg>

          {/* Endpoint dots — portfolio + benchmark terminals */}
          <Dot top={ys(portLast)} color={portColor} primary />
          {benchmarkRebased.map((b) => (
            <Dot key={b.id} top={ys(b.last)} color={b.color} />
          ))}

          {/* X-axis labels */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: 20, display: 'flex', justifyContent: 'space-between',
            fontSize: 10.5, color: '#86868b', fontWeight: 500,
          }}>
            <span>{firstDate.toLocaleDateString('en', { month: 'short', year: '2-digit' })}</span>
            <span>{lastDate.toLocaleDateString('en', { month: 'short', year: '2-digit' })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendChip({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        display: 'inline-block', width: 14, height: 2,
        background: color, verticalAlign: 'middle', borderRadius: 1,
      }} />
      <span style={{ color: '#1d1d1f', fontWeight: 500 }}>{label}</span>
      <span className="num" style={{ color }}>{value}</span>
    </span>
  );
}

function Dot({ top, color, primary }: { top: number; color: string; primary?: boolean }) {
  const size = primary ? 9 : 7;
  return (
    <div style={{
      position: 'absolute',
      left: '100%', top: `${top}%`,
      transform: 'translate(-50%, -50%)',
      width: size, height: size,
      borderRadius: '50%',
      background: primary ? '#fff' : color,
      border: primary ? `2px solid ${color}` : `1.5px solid #fff`,
      pointerEvents: 'none',
      zIndex: primary ? 2 : 1,
    }} />
  );
}
