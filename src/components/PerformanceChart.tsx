'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
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
  '3M': 13, '6M': 26, 'YTD': 'ytd', '1Y': 52, '2Y': 104, 'All': 'all',
};

const PORTFOLIO_COLOR_UP   = 'oklch(0.55 0.10 175)';
const PORTFOLIO_COLOR_DOWN = 'oklch(0.50 0.16 25)';

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

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
  const [scrubIdx, setScrubIdx] = useState<number | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);

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

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!plotRef.current || slice.length < 2) return;
    const rect = plotRef.current.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setScrubIdx(Math.round(relX * (slice.length - 1)));
  }, [slice.length]);

  const handleMouseLeave = useCallback(() => setScrubIdx(null), []);

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
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

  const portBase = slice[0].returnPct;
  const portRebased = slice.map((p) => p.returnPct - portBase);
  const portLast = portRebased[portRebased.length - 1];
  const portColor = portLast >= 0 ? PORTFOLIO_COLOR_UP : PORTFOLIO_COLOR_DOWN;

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
      const validCount = values.filter((v) => v != null).length;
      if (validCount < 2) return null;
      const last = [...values].reverse().find((v) => v != null) ?? 0;
      return { ...b, values, last };
    })
    .filter((b): b is BenchmarkLine & { values: (number | null)[]; last: number } => b != null);

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

  // Scrubber values
  const scrubPortVal = scrubIdx != null ? portRebased[scrubIdx] : null;
  const scrubDate = scrubIdx != null
    ? new Date(slice[scrubIdx].date).toLocaleDateString('en', { month: 'short', day: '2-digit', year: '2-digit' })
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} className="cdn-chart-wrap">
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'baseline' }}>
          <span
            style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', transition: 'color 300ms ease' }}
            className="num"
          >
            <span style={{ color: scrubPortVal != null ? (scrubPortVal >= 0 ? PORTFOLIO_COLOR_UP : PORTFOLIO_COLOR_DOWN) : portColor }}>
              {fmtPct(scrubPortVal ?? portLast)}
            </span>
          </span>
          <span style={{ fontSize: 12, color: '#86868b', transition: 'opacity 200ms ease', opacity: scrubIdx != null ? 0 : 1 }}>
            {firstDate.toLocaleDateString('en', { month: 'short', day: '2-digit', year: '2-digit' })} → {lastDate.toLocaleDateString('en', { month: 'short', day: '2-digit', year: '2-digit' })}
          </span>
        </div>
        <div className="seg">
          {(Object.keys(RANGE_WEEKS) as RangeKey[]).map((r) => (
            <button key={r} type="button" onClick={() => { setRange(r); setScrubIdx(null); }} className={range === r ? 'on' : ''}>
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
        <div
          ref={plotRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ position: 'relative', flex: 1, height: chartHeight + 24, cursor: 'crosshair' }}
        >
          {/* Grid */}
          <div style={{ position: 'absolute', inset: '0 0 24px 0', pointerEvents: 'none' }}>
            {yTicks.map((v, i) => {
              const pct = (yMax - v) / yRange;
              return (
                <div key={i} style={{
                  position: 'absolute', left: 0, right: 0, top: `${pct * 100}%`,
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

            {benchmarkRebased.map((b) => (
              <path
                key={b.id}
                d={buildPath(b.values)}
                fill="none"
                stroke={b.color}
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
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              style={{ strokeWidth: 2 }}
            />
          </svg>

          {/* Endpoint dots */}
          <Dot top={ys(portLast)} color={portColor} primary />
          {benchmarkRebased.map((b) => (
            <Dot key={b.id} top={ys(b.last)} color={b.color} />
          ))}

          {/* Scrubber crosshair + moving dot */}
          {scrubIdx != null && scrubPortVal != null && (
            <>
              {/* Vertical line */}
              <div style={{
                position: 'absolute',
                left: `${xs(scrubIdx)}%`,
                top: 0, bottom: '24px',
                width: 1,
                background: 'rgba(0,0,0,0.14)',
                pointerEvents: 'none',
                transition: 'left 60ms ease',
              }} />

              {/* Portfolio dot at scrub position */}
              <div style={{
                position: 'absolute',
                left: `${xs(scrubIdx)}%`,
                top: `${ys(scrubPortVal)}%`,
                transform: 'translate(-50%, -50%)',
                width: 10, height: 10,
                borderRadius: '50%',
                background: '#fff',
                border: `2.5px solid ${portColor}`,
                boxShadow: `0 0 0 3px ${portColor}28`,
                pointerEvents: 'none',
                zIndex: 4,
                transition: 'left 60ms ease, top 60ms ease',
              }} />

              {/* Benchmark dots at scrub position */}
              {benchmarkRebased.map((b) => {
                const val = b.values[scrubIdx];
                if (val == null) return null;
                return (
                  <div key={b.id} style={{
                    position: 'absolute',
                    left: `${xs(scrubIdx)}%`,
                    top: `${ys(val)}%`,
                    transform: 'translate(-50%, -50%)',
                    width: 7, height: 7,
                    borderRadius: '50%',
                    background: b.color,
                    border: '1.5px solid #fff',
                    pointerEvents: 'none',
                    zIndex: 3,
                    transition: 'left 60ms ease, top 60ms ease',
                  }} />
                );
              })}

              {/* Scrubber tooltip */}
              {(() => {
                const leftPct = xs(scrubIdx);
                const flipLeft = leftPct > 62;
                return (
                  <div
                    className="cdn-tip"
                    style={{
                      left: flipLeft ? undefined : `calc(${leftPct}% + 14px)`,
                      right: flipLeft ? `calc(${100 - leftPct}% + 14px)` : undefined,
                      top: 8,
                    }}
                  >
                    <div className="cdn-tip-header">
                      <span style={{ fontWeight: 600, fontSize: 12 }}>{scrubDate}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div className="cdn-tip-row">
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.78)' }}>
                          <span style={{ width: 10, height: 2, background: portColor, display: 'inline-block', borderRadius: 1 }} />
                          Portfolio
                        </span>
                        <span className="num" style={{ fontWeight: 600, color: scrubPortVal >= 0 ? 'oklch(0.72 0.10 175)' : 'oklch(0.72 0.16 25)' }}>
                          {fmtPct(scrubPortVal)}
                        </span>
                      </div>
                      {benchmarkRebased.map((b) => {
                        const val = b.values[scrubIdx];
                        if (val == null) return null;
                        return (
                          <div key={b.id} className="cdn-tip-row">
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.78)' }}>
                              <span style={{ width: 10, height: 2, background: b.color, display: 'inline-block', borderRadius: 1 }} />
                              {b.name}
                            </span>
                            <span className="num" style={{ color: 'rgba(255,255,255,0.82)' }}>{fmtPct(val)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </>
          )}

          {/* X-axis labels */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: 20, display: 'flex', justifyContent: 'space-between',
            fontSize: 10.5, color: '#86868b', fontWeight: 500,
          }}>
            <span>{firstDate.toLocaleDateString('en', { month: 'short', year: '2-digit' })}</span>
            <span style={{ opacity: scrubIdx != null && scrubIdx > slice.length * 0.75 ? 0 : 1, transition: 'opacity 150ms' }}>
              {lastDate.toLocaleDateString('en', { month: 'short', year: '2-digit' })}
            </span>
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
