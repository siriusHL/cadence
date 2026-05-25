'use client';

import { useState, useMemo } from 'react';
import { type MonthOverview } from '@/lib/portfolio';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type RangeKey = '6M' | '1Y' | '18M' | '3Y';
const RANGES: Record<RangeKey, { past: number; future: number }> = {
  '6M':  { past:  6, future: 0 },
  '1Y':  { past: 12, future: 0 },
  '18M': { past: 12, future: 6 },
  '3Y':  { past: 30, future: 6 },
};

interface Props {
  /** Full window of months — typically 36 past + 6 future. */
  months: MonthOverview[];
  /** Index of the current month inside `months`. */
  nowIndex: number;
}

function fmt(n: number, digits = 0): string {
  return n.toLocaleString('en-IE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function IncomeRhythmChart({ months, nowIndex }: Props) {
  const [range, setRange] = useState<RangeKey>('18M');
  const [hover, setHover] = useState<number | null>(null);

  // Slice the full month array based on the selected range
  const { slice, nowIndexInSlice, sliceStart } = useMemo(() => {
    const cfg = RANGES[range];
    const start = Math.max(0, nowIndex - cfg.past + 1);
    const end = Math.min(months.length, nowIndex + cfg.future + 1);
    return {
      slice: months.slice(start, end),
      nowIndexInSlice: nowIndex - start,
      sliceStart: start,
    };
  }, [months, nowIndex, range]);

  // Scale to slice max — empty slices fall back to 1 to avoid divide-by-zero
  const maxBar = useMemo(() => {
    const m = Math.max(...slice.map((m) => Math.max(m.received, m.expected)), 0);
    return Math.max(1, m * 1.18);
  }, [slice]);

  // 3 y-axis ticks: 0, max/2, max — rounded to a nice number
  const yTicks = useMemo(() => {
    const top = niceCeil(maxBar);
    return [0, top / 2, top];
  }, [maxBar]);

  const chartHeight = 170;
  const yAxisWidth = 38;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Toolbar: legend + range selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#6e6e73' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: 'oklch(0.55 0.10 175)' }} /> Received
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#6e6e73' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: 'oklch(0.55 0.10 175 / 0.22)' }} /> Expected
          </span>
        </div>
        <div className="seg">
          {(Object.keys(RANGES) as RangeKey[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={range === r ? 'on' : ''}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart with y-axis + grid + bars */}
      <div style={{ position: 'relative', height: chartHeight + 22, display: 'flex' }}>
        {/* Y-axis labels */}
        <div style={{
          width: yAxisWidth,
          height: chartHeight,
          position: 'relative',
          flexShrink: 0,
        }}>
          {yTicks.map((v, i) => {
            // Top is 100% (max), bottom is 0%
            const pct = (yTicks[yTicks.length - 1] - v) / (yTicks[yTicks.length - 1] || 1);
            return (
              <div
                key={i}
                className="num"
                style={{
                  position: 'absolute',
                  right: 6,
                  top: `${pct * 100}%`,
                  transform: 'translateY(-50%)',
                  fontSize: 10,
                  color: '#86868b',
                  fontWeight: 500,
                }}
              >
                €{fmt(v)}
              </div>
            );
          })}
        </div>

        {/* Bars area */}
        <div style={{ position: 'relative', flex: 1, height: chartHeight + 22 }}>
          {/* Horizontal grid lines */}
          <div style={{ position: 'absolute', inset: `0 0 22px 0`, pointerEvents: 'none' }}>
            {yTicks.map((_, i) => {
              const pct = i / (yTicks.length - 1);
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: 0, right: 0,
                    top: `${(1 - pct) * 100}%`,
                    height: 1,
                    background: 'rgba(0,0,0,0.05)',
                  }}
                />
              );
            })}
          </div>

          {/* Bars — re-keyed by range so the entrance replays on range change. */}
          {(() => {
            const totalStaggerWindow = 700;
            const perBar = Math.min(30, totalStaggerWindow / Math.max(1, slice.length));
            return (
              <div
                key={`bars-${range}`}
                className="irc-bars"
                style={{ position: 'absolute', inset: `0 0 22px 0`, display: 'flex', alignItems: 'flex-end', gap: 3 }}
              >
                {slice.map((m, i) => {
                  const received = m.received;
                  const expected = m.expected;
                  const top = Math.max(received, expected);
                  const top100 = yTicks[yTicks.length - 1] || 1;
                  const totalH = (top / top100) * 100;
                  const solidPortion = top > 0 ? (received / top) * totalH : 0;
                  const fadedPortion = Math.max(0, totalH - solidPortion);
                  const isHovered = hover === i;
                  const isDim = hover != null && !isHovered;
                  const barDelay = 220 + i * perBar;

                  return (
                    <div
                      key={`${m.year}-${m.month}`}
                      onMouseEnter={() => setHover(i)}
                      onMouseLeave={() => setHover((cur) => (cur === i ? null : cur))}
                      className={`irc-col${isHovered ? ' is-hovered' : ''}${isDim ? ' is-dim' : ''}`}
                      style={{
                        flex: 1, display: 'flex', flexDirection: 'column',
                        justifyContent: 'flex-end',
                        height: '100%',
                        minWidth: 4,
                        cursor: m.byTicker.length > 0 ? 'pointer' : 'default',
                      }}
                    >
                      <div
                        className="irc-bar-stack"
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'flex-end',
                          width: '100%',
                          height: `${totalH}%`,
                          animationDelay: `${barDelay}ms`,
                        }}
                      >
                        <div
                          className="irc-bar irc-bar-faded"
                          style={{
                            height: totalH > 0 ? `${(fadedPortion / totalH) * 100}%` : '0%',
                            background: isHovered
                              ? 'oklch(0.55 0.10 175 / 0.40)'
                              : 'oklch(0.55 0.10 175 / 0.22)',
                            borderRadius: '3px 3px 0 0',
                          }}
                        />
                        <div
                          className="irc-bar irc-bar-solid"
                          style={{
                            height: totalH > 0 ? `${(solidPortion / totalH) * 100}%` : '0%',
                            background: isHovered ? 'oklch(0.46 0.13 175)' : 'oklch(0.55 0.10 175)',
                            borderRadius: fadedPortion > 0 ? '0' : '3px 3px 0 0',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* "Now" divider — keyed by range so it fades in alongside the bars. */}
          {nowIndexInSlice >= 0 && nowIndexInSlice < slice.length && (
            <NowMarker
              key={`now-${range}`}
              totalBars={slice.length}
              nowIndexInSlice={nowIndexInSlice}
              chartHeight={chartHeight}
            />
          )}

          {/* Month labels along the bottom — adaptive density */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            display: 'flex', gap: 3, height: 18,
          }}>
            {slice.map((m, i) => {
              const labelEvery = labelStride(slice.length);
              const show = i % labelEvery === 0 || i === slice.length - 1;
              return (
                <div key={`${m.year}-${m.month}-l`} style={{
                  flex: 1, textAlign: 'center', minWidth: 4,
                  fontSize: 10,
                  color: i > nowIndexInSlice ? '#86868b' : '#6e6e73',
                  fontWeight: 500,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }}>
                  {show ? `${MONTH_NAMES[m.month]}${slice.length > 18 ? ` ${String(m.year).slice(2)}` : ''}` : ''}
                </div>
              );
            })}
          </div>

          {/* Hover tooltip */}
          {hover != null && slice[hover].byTicker.length > 0 && (
            <Tooltip
              month={slice[hover]}
              hoverIdx={hover}
              totalBars={slice.length}
              nowIndexInSlice={nowIndexInSlice}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function NowMarker({ totalBars, nowIndexInSlice, chartHeight }: {
  totalBars: number; nowIndexInSlice: number; chartHeight: number;
}) {
  // Right edge of the now-bar
  const leftPct = ((nowIndexInSlice + 1) / totalBars) * 100;
  return (
    <>
      <div
        aria-hidden
        className="irc-now-line"
        style={{
          position: 'absolute',
          left: `${leftPct}%`,
          top: 0,
          height: chartHeight,
          width: 1,
          borderLeft: '1px dashed rgba(0,0,0,0.20)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        className="irc-now-label"
        style={{
          position: 'absolute',
          left: `calc(${leftPct}% + 4px)`,
          top: 0,
          fontSize: 10, fontWeight: 500, color: '#86868b',
          pointerEvents: 'none',
        }}
      >
        Now
      </div>
    </>
  );
}

function Tooltip({ month, hoverIdx, totalBars, nowIndexInSlice }: {
  month: MonthOverview; hoverIdx: number; totalBars: number; nowIndexInSlice: number;
}) {
  const total = month.received + month.expected;
  const isPast = hoverIdx <= nowIndexInSlice;
  const leftPct = (hoverIdx + 0.5) * (100 / totalBars);
  return (
    <div
      style={{
        position: 'absolute',
        left: `${leftPct}%`,
        bottom: 'calc(100% - 24px)',
        transform: 'translateX(-50%)',
        background: '#1d1d1f',
        color: '#fff',
        padding: '10px 14px',
        borderRadius: 12,
        minWidth: 220,
        maxWidth: 280,
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        fontSize: 12,
        zIndex: 10,
        pointerEvents: 'none',
      }}
    >
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>
          {MONTH_NAMES[month.month]} {String(month.year).slice(2)}{isPast ? '' : ' · est.'}
        </span>
        <span className="num" style={{ fontWeight: 600 }}>€{fmt(total, 2)}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {month.byTicker.slice(0, 8).map((line) => {
          const amt = line.received + line.expected;
          const isExpectedLine = line.expected > 0 && line.received === 0;
          return (
            <div key={line.ticker} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <b style={{ color: '#fff' }}>{line.ticker}</b>
                {line.name && <span style={{ color: 'rgba(255,255,255,0.55)' }}> · {line.name}</span>}
              </span>
              <span className="num" style={{ flexShrink: 0, color: isExpectedLine ? 'rgba(255,255,255,0.65)' : '#fff' }}>
                €{fmt(amt, 2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Round up to a nice number for axis: 50, 100, 200, 250, 500, 1k, 2k, 5k, etc. */
function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const norm = v / exp;
  const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return niceNorm * exp;
}

/** Decide how many bars to skip between month labels — keeps labels readable */
function labelStride(n: number): number {
  if (n <= 6) return 1;
  if (n <= 12) return 1;
  if (n <= 18) return 2;
  if (n <= 24) return 3;
  return 4;
}
