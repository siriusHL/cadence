'use client';

import { useId, useMemo, useState } from 'react';

export interface ForecastMonth {
  /** 0-11 */
  month: number;
  year: number;
  total: number;
}

interface Props {
  months: ForecastMonth[];
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmt(n: number, digits = 0): string {
  return n.toLocaleString('en-IE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Round up to a nice number for the axis. */
function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const norm = v / exp;
  const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return niceNorm * exp;
}

type RangeKey = '6M' | '12M' | '24M';

export function ForecastChart({ months }: Props) {
  const [range, setRange] = useState<RangeKey>('12M');
  const reactId = useId();
  const clipId = `fc-clip-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const slice = useMemo(() => {
    const n = range === '6M' ? 6 : range === '12M' ? 12 : 24;
    return months.slice(0, n);
  }, [months, range]);

  const cums = useMemo(() => {
    return slice.reduce<number[]>((acc, m) => {
      const prev = acc[acc.length - 1] ?? 0;
      acc.push(prev + m.total);
      return acc;
    }, []);
  }, [slice]);

  const barMax = useMemo(() => {
    const m = Math.max(...slice.map((s) => s.total), 0);
    return niceCeil(Math.max(1, m * 1.2));
  }, [slice]);
  const cumMax = useMemo(() => {
    const m = cums[cums.length - 1] ?? 1;
    return niceCeil(Math.max(1, m * 1.05));
  }, [cums]);

  const yTicks = [0, barMax / 2, barMax];

  const yAxisWidth = 44;
  const rightAxisWidth = 56;
  const chartHeight = 200;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#6e6e73' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: 'oklch(0.55 0.10 175)' }} /> Monthly
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#6e6e73' }}>
            <span style={{ width: 14, height: 2, background: 'oklch(0.40 0.06 235)', borderRadius: 1 }} /> Cumulative
          </span>
        </div>
        <div className="seg">
          {(['6M', '12M', '24M'] as RangeKey[]).map((r) => (
            <button key={r} type="button" onClick={() => setRange(r)} className={range === r ? 'on' : ''}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ position: 'relative', height: chartHeight + 26, display: 'flex' }}>
        {/* Left y-axis (bars scale) */}
        <div style={{ width: yAxisWidth, height: chartHeight, position: 'relative', flexShrink: 0 }}>
          {yTicks.map((v, i) => {
            const pct = (yTicks[yTicks.length - 1] - v) / (yTicks[yTicks.length - 1] || 1);
            return (
              <div
                key={i}
                className="num"
                style={{
                  position: 'absolute', right: 8, top: `${pct * 100}%`,
                  transform: 'translateY(-50%)',
                  fontSize: 10.5, color: '#86868b', fontWeight: 500,
                }}
              >
                €{fmt(v)}
              </div>
            );
          })}
        </div>

        {/* Plot area */}
        <div style={{ position: 'relative', flex: 1, height: chartHeight + 26 }}>
          {/* Grid */}
          <div style={{ position: 'absolute', inset: '0 0 26px 0', pointerEvents: 'none' }}>
            {yTicks.map((_, i) => {
              const pct = i / (yTicks.length - 1);
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute', left: 0, right: 0,
                    top: `${(1 - pct) * 100}%`,
                    height: 1, background: 'rgba(0,0,0,0.05)',
                  }}
                />
              );
            })}
          </div>

          {/* Bars — staggered scaleY from baseline, re-keyed by range. */}
          {(() => {
            const totalStaggerWindow = 600;
            const perBar = Math.min(40, totalStaggerWindow / Math.max(1, slice.length));
            return (
              <div
                key={`fc-bars-${range}`}
                style={{ position: 'absolute', inset: '0 0 26px 0', display: 'flex', alignItems: 'flex-end', gap: 4 }}
              >
                {slice.map((m, i) => {
                  const h = (m.total / barMax) * 100;
                  const barDelay = 220 + i * perBar;
                  const labelDelay = barDelay + 480;
                  return (
                    <div
                      key={`${m.year}-${m.month}`}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}
                    >
                      {m.total > 0 && (
                        <div
                          className="fc-value-label"
                          style={{
                            textAlign: 'center', fontSize: 10.5, color: '#1d1d1f',
                            fontWeight: 500, marginBottom: 4,
                            animationDelay: `${labelDelay}ms`,
                          }}
                        >
                          €{Math.round(m.total)}
                        </div>
                      )}
                      <div
                        className="fc-bar"
                        style={{
                          height: `${h}%`,
                          background: 'oklch(0.55 0.10 175)',
                          borderRadius: '4px 4px 0 0',
                          animationDelay: `${barDelay}ms`,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Cumulative line (SVG overlay) — wipes in left-to-right after bars land. */}
          <svg
            key={`fc-cum-${range}`}
            style={{ position: 'absolute', inset: '0 0 26px 0', pointerEvents: 'none', width: '100%', height: chartHeight }}
            preserveAspectRatio="none"
            viewBox={`0 0 ${slice.length} ${chartHeight}`}
          >
            <defs>
              <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
                <rect
                  x="0" y="0" width={slice.length} height={chartHeight}
                  className="fc-clip-rect"
                />
              </clipPath>
            </defs>
            {(() => {
              if (cums.length === 0) return null;
              const points = cums.map((v, i) => ({
                x: (i + 0.5),
                y: chartHeight - (v / cumMax) * chartHeight,
              }));
              const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(3)} ${p.y.toFixed(2)}`).join(' ');
              return (
                <g clipPath={`url(#${clipId})`}>
                  <path
                    d={path}
                    fill="none"
                    stroke="oklch(0.40 0.06 235)"
                    strokeWidth="0.04"
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ strokeWidth: 2 }}
                  />
                </g>
              );
            })()}
          </svg>

          {/* Cumulative endpoints as dots — fade in once the line has drawn through. */}
          <div
            key={`fc-dots-${range}`}
            className="fc-dots"
            style={{ position: 'absolute', inset: '0 0 26px 0', pointerEvents: 'none' }}
          >
            {cums.map((v, i) => {
              const leftPct = ((i + 0.5) / slice.length) * 100;
              const topPct = (1 - (v / cumMax)) * 100;
              const isLast = i === cums.length - 1;
              // Dots come in along with the line wipe.
              const dotDelay = 700 + (i / Math.max(1, cums.length - 1)) * 900;
              return (
                <div
                  key={i}
                  className="fc-dot"
                  style={{
                    position: 'absolute',
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    transform: 'translate(-50%, -50%)',
                    width: isLast ? 8 : 5,
                    height: isLast ? 8 : 5,
                    borderRadius: '50%',
                    background: '#fff',
                    border: '1.8px solid oklch(0.40 0.06 235)',
                    animationDelay: `${dotDelay}ms`,
                  }}
                />
              );
            })}
          </div>

          {/* Month labels */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            display: 'flex', gap: 4, height: 22,
          }}>
            {slice.map((m, i) => {
              const stride = slice.length <= 12 ? 1 : slice.length <= 18 ? 2 : 3;
              const show = i % stride === 0 || i === slice.length - 1;
              return (
                <div key={`${m.year}-${m.month}-l`} style={{
                  flex: 1, textAlign: 'center',
                  fontSize: 10.5, color: '#6e6e73', fontWeight: 500,
                  overflow: 'hidden', whiteSpace: 'nowrap',
                }}>
                  {show ? `${MONTH_NAMES[m.month]}${slice.length > 12 ? ` ${String(m.year).slice(2)}` : ''}` : ''}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right axis — cumulative scale + final label */}
        <div style={{ width: rightAxisWidth, height: chartHeight, position: 'relative', flexShrink: 0 }}>
          <div style={{ position: 'absolute', left: 8, top: 0, fontSize: 10, color: 'oklch(0.40 0.06 235)', fontWeight: 500 }}>
            Cum.
          </div>
          {cums.length > 0 && (
            <div className="num" style={{
              position: 'absolute',
              left: 8,
              top: `${(1 - cums[cums.length - 1] / cumMax) * 100}%`,
              transform: 'translateY(-50%)',
              fontSize: 11.5, fontWeight: 600,
              color: 'oklch(0.40 0.06 235)',
            }}>
              €{fmt(cums[cums.length - 1])}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
