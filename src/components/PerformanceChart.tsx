'use client';

import { useMemo, useState } from 'react';
import { type PerformancePoint } from '@/lib/portfolio';

interface Props {
  series: PerformancePoint[];
}

type RangeKey = '3M' | '6M' | 'YTD' | '1Y' | '2Y' | 'All';

const RANGE_WEEKS: Record<RangeKey, number | 'ytd' | 'all'> = {
  '3M':  13, '6M': 26, 'YTD': 'ytd', '1Y': 52, '2Y': 104, 'All': 'all',
};

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

export function PerformanceChart({ series }: Props) {
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

  // Rebase: show return % relative to the first point of the slice (window return).
  const base = slice[0].returnPct;
  const rebased = slice.map((p) => p.returnPct - base);
  const last = rebased[rebased.length - 1];

  const min = Math.min(...rebased);
  const max = Math.max(...rebased);
  // Pad the axis so the line isn't pinned to the edges
  const padPct = Math.max(2, (max - min) * 0.15);
  const yMin = Math.floor((min - padPct) / 5) * 5;
  const yMax = Math.ceil((max + padPct) / 5) * 5;
  const yRange = yMax - yMin || 1;

  const yTicks = [yMax, (yMax + yMin) / 2, yMin].filter((v) => v >= yMin && v <= yMax);
  // Include 0 if it's in range
  if (yMin < 0 && yMax > 0) yTicks.push(0);

  const yAxisWidth = 50;
  const chartHeight = 220;

  const xs = (i: number) => (i / (slice.length - 1)) * 100;
  const ys = (v: number) => ((yMax - v) / yRange) * 100;

  // SVG line path in 0–100 viewBox
  const linePath = rebased
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xs(i).toFixed(3)} ${ys(v).toFixed(3)}`)
    .join(' ');
  // Area underneath line
  const areaPath =
    `${linePath} L ${xs(rebased.length - 1).toFixed(3)} 100 L 0 100 Z`;
  const lineColor = last >= 0 ? 'oklch(0.55 0.10 175)' : 'oklch(0.50 0.16 25)';

  const firstDate = new Date(slice[0].date);
  const lastDate = new Date(slice[slice.length - 1].date);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'baseline' }}>
          <span style={{ fontSize: 28, fontWeight: 600, color: lineColor, letterSpacing: '-0.02em' }} className="num">
            {fmtPct(last)}
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

          {/* SVG line + area */}
          <svg
            style={{ position: 'absolute', inset: '0 0 24px 0', width: '100%', height: chartHeight }}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={lineColor} stopOpacity="0.18" />
                <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#perfGrad)" />
            <path
              d={linePath}
              fill="none"
              stroke={lineColor}
              strokeWidth="0.35"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              style={{ strokeWidth: 2 }}
            />
          </svg>

          {/* Endpoint dot */}
          <div style={{
            position: 'absolute',
            left: '100%', top: `${ys(last)}%`,
            transform: 'translate(-50%, -50%)',
            width: 9, height: 9,
            borderRadius: '50%',
            background: '#fff',
            border: `2px solid ${lineColor}`,
            pointerEvents: 'none',
          }} />

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
