'use client';

import { useState, useMemo } from 'react';
import { type MonthOverview } from '@/lib/portfolio';
import { EventDetailModal, EventHoverHint } from '@/components/EventDetailModal';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

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
  /**
   * Optional cumulative portfolio P/L (value − cost) sampled at end-of-month.
   * Same length and index alignment as `months`. `null` entries are skipped
   * (months before any trade, or future months without data).
   */
  plLine?: (number | null)[];
}

function fmt(n: number, digits = 0): string {
  return n.toLocaleString('en-IE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

interface HoverState { idx: number; x: number; y: number; }

export function IncomeRhythmChart({ months, nowIndex, plLine }: Props) {
  const [range, setRange] = useState<RangeKey>('18M');
  const [hover, setHover] = useState<HoverState | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  // Slice the full month array based on the selected range
  const { slice, slicePL, nowIndexInSlice, sliceStart } = useMemo(() => {
    const cfg = RANGES[range];
    const start = Math.max(0, nowIndex - cfg.past + 1);
    const end = Math.min(months.length, nowIndex + cfg.future + 1);
    return {
      slice: months.slice(start, end),
      slicePL: plLine ? plLine.slice(start, end) : null,
      nowIndexInSlice: nowIndex - start,
      sliceStart: start,
    };
  }, [months, nowIndex, range, plLine]);

  // Y-scale must include both the bar maxes and the P/L line range — bars stay
  // non-negative but cumulative P/L can dip below zero in a drawdown.
  const { yTop, yBottom } = useMemo(() => {
    const barMax = Math.max(...slice.map((m) => Math.max(m.received, m.expected)), 0);
    const plValues = slicePL?.filter((v): v is number => v != null) ?? [];
    const plMax = plValues.length > 0 ? Math.max(...plValues) : 0;
    const plMin = plValues.length > 0 ? Math.min(...plValues) : 0;
    const rawTop = Math.max(barMax, plMax) * 1.18;
    const rawBottom = Math.min(0, plMin) * 1.18;
    return {
      yTop: Math.max(1, niceCeil(rawTop)),
      yBottom: rawBottom < 0 ? -niceCeil(-rawBottom) : 0,
    };
  }, [slice, slicePL]);

  // Y-ticks: include zero when the axis goes negative.
  const yTicks = useMemo(() => {
    if (yBottom < 0) return [yBottom, 0, yTop];
    return [0, yTop / 2, yTop];
  }, [yBottom, yTop]);

  /** Project a € value into 0–100% of chart height (0 = top of chart). */
  const yPct = (v: number): number => {
    const range = yTop - yBottom;
    if (range <= 0) return 100;
    return ((yTop - v) / range) * 100;
  };
  const zeroLinePct = yPct(0);

  const chartHeight = 170;
  const yAxisWidth = 38;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Toolbar: legend + range selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-muted)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: 'oklch(0.55 0.10 175)' }} /> Received
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-muted)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: 'oklch(0.55 0.10 175 / 0.22)' }} /> Expected
          </span>
          {slicePL && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-muted)' }}>
              <span
                aria-hidden
                style={{
                  display: 'inline-block',
                  width: 14,
                  height: 2,
                  background: 'oklch(0.42 0.14 30)',
                  borderRadius: 1,
                }}
              />{' '}
              Cumulative P/L
            </span>
          )}
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
          {yTicks.map((v, i) => (
            <div
              key={i}
              className="num"
              style={{
                position: 'absolute',
                right: 6,
                top: `${yPct(v)}%`,
                transform: 'translateY(-50%)',
                fontSize: 10,
                color: v === 0 && yBottom < 0 ? 'var(--text-muted)' : 'var(--text-dim)',
                fontWeight: 500,
              }}
            >
              {v < 0 ? '−€' : '€'}{fmt(Math.abs(v))}
            </div>
          ))}
        </div>

        {/* Bars area */}
        <div style={{ position: 'relative', flex: 1, height: chartHeight + 22 }}>
          {/* Horizontal grid lines */}
          <div style={{ position: 'absolute', inset: `0 0 22px 0`, pointerEvents: 'none' }}>
            {yTicks.map((v, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: 0, right: 0,
                  top: `${yPct(v)}%`,
                  height: 1,
                  background: v === 0 && yBottom < 0
                    ? 'rgba(0,0,0,0.12)'
                    : 'rgba(0,0,0,0.05)',
                }}
              />
            ))}
          </div>

          {/* Bars — re-keyed by range so the entrance replays on range change. */}
          {(() => {
            const totalStaggerWindow = 700;
            const perBar = Math.min(30, totalStaggerWindow / Math.max(1, slice.length));
            const yRange = yTop - yBottom;
            // The bars area maps yTop→0% and yBottom→100% from the top of the
            // 'inset: 0 0 22px 0' box. zeroLinePct is the % from the top where
            // €0 sits — bars grow upward from that line.
            return (
              <div
                key={`bars-${range}`}
                className="irc-bars"
                style={{ position: 'absolute', inset: `0 0 22px 0`, display: 'flex', gap: 3 }}
              >
                {slice.map((m, i) => {
                  const received = m.received;
                  const expected = m.expected;
                  const top = Math.max(received, expected);
                  const totalH = yRange > 0 ? (top / yRange) * 100 : 0;
                  const solidPortion = top > 0 ? (received / top) * totalH : 0;
                  const fadedPortion = Math.max(0, totalH - solidPortion);
                  const isHovered = hover?.idx === i;
                  const isDim = hover != null && !isHovered;
                  const barDelay = 220 + i * perBar;
                  const hasEvents = m.byTicker.length > 0;

                  const openMonth = () => {
                    if (!hasEvents) return;
                    setHover(null);
                    setSelected(i);
                  };

                  return (
                    <div
                      key={`${m.year}-${m.month}`}
                      role={hasEvents ? 'button' : undefined}
                      tabIndex={hasEvents ? 0 : -1}
                      aria-label={
                        hasEvents
                          ? `${MONTH_LONG[m.month]} ${m.year} — €${fmt(received + expected, 2)} from ${m.byTicker.length} payment${m.byTicker.length === 1 ? '' : 's'}. Click for details.`
                          : `${MONTH_LONG[m.month]} ${m.year} — no payments`
                      }
                      onMouseEnter={(ev) => {
                        if (!hasEvents) return;
                        const r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
                        setHover({ idx: i, x: r.left + r.width / 2, y: r.top });
                      }}
                      onMouseLeave={() => setHover((cur) => (cur && cur.idx === i ? null : cur))}
                      onClick={openMonth}
                      onKeyDown={(ev) => {
                        if (!hasEvents) return;
                        if (ev.key === 'Enter' || ev.key === ' ') {
                          ev.preventDefault();
                          openMonth();
                        }
                      }}
                      className={`irc-col${isHovered ? ' is-hovered' : ''}${isDim ? ' is-dim' : ''}`}
                      style={{
                        flex: 1,
                        position: 'relative',
                        height: '100%',
                        minWidth: 4,
                        cursor: hasEvents ? 'pointer' : 'default',
                        outline: 'none',
                      }}
                    >
                      <div
                        className="irc-bar-stack"
                        style={{
                          position: 'absolute',
                          left: 0, right: 0,
                          bottom: `${100 - zeroLinePct}%`,
                          height: `${totalH}%`,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'flex-end',
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

          {/* Cumulative P/L line overlay — same y-scale as the bars. */}
          {slicePL && slicePL.some((v) => v != null) && (
            <PLLine
              key={`pl-${range}`}
              values={slicePL}
              yPct={yPct}
            />
          )}

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
                  color: i > nowIndexInSlice ? 'var(--text-dim)' : 'var(--text-muted)',
                  fontWeight: 500,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }}>
                  {show ? `${MONTH_NAMES[m.month]}${slice.length > 18 ? ` ${String(m.year).slice(2)}` : ''}` : ''}
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* Slim hover hint with the click affordance. Hidden while the modal
          is open. */}
      {hover != null && selected == null && slice[hover.idx]?.byTicker.length > 0 && (
        <EventHoverHint
          title={`${MONTH_LONG[slice[hover.idx].month]} ${slice[hover.idx].year}`}
          total={slice[hover.idx].received + slice[hover.idx].expected}
          count={slice[hover.idx].byTicker.length}
          anchorX={hover.x}
          anchorY={hover.y}
          side="top"
        />
      )}

      {selected != null && slice[selected]?.byTicker.length > 0 && (
        <EventDetailModal
          title={`${MONTH_LONG[slice[selected].month]} ${slice[selected].year}`}
          total={slice[selected].received + slice[selected].expected}
          rows={slice[selected].byTicker.map((line) => ({
            key: line.ticker,
            ticker: line.ticker,
            name: line.name,
            amount: line.received + line.expected,
            isEstimate: line.expected > 0 && line.received === 0,
          }))}
          onClose={() => setSelected(null)}
        />
      )}
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
          fontSize: 10, fontWeight: 500, color: 'var(--text-dim)',
          pointerEvents: 'none',
        }}
      >
        Now
      </div>
    </>
  );
}

/**
 * Cumulative P/L line, layered over the bars on the same y-axis. Renders one
 * path per contiguous run of non-null values so gaps (months with no data)
 * stay as gaps instead of being interpolated.
 */
function PLLine({
  values,
  yPct,
}: {
  values: (number | null)[];
  yPct: (v: number) => number;
}) {
  // Build segments — contiguous runs of points with values. The line area
  // spans 0 -> 100% horizontally; each point sits at the centre of its month
  // column.
  const segments: { x: number; y: number; v: number }[][] = [];
  let current: { x: number; y: number; v: number }[] = [];
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v == null) {
      if (current.length > 0) segments.push(current);
      current = [];
      continue;
    }
    const x = ((i + 0.5) / values.length) * 100;
    current.push({ x, y: yPct(v), v });
  }
  if (current.length > 0) segments.push(current);
  if (segments.length === 0) return null;

  const lastPoint = segments.at(-1)?.at(-1);

  return (
    <svg
      aria-hidden
      style={{
        position: 'absolute',
        inset: '0 0 22px 0',
        width: '100%',
        height: 'calc(100% - 22px)',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      {segments.map((seg, segIdx) => {
        if (seg.length < 2) {
          // Single-point segment — render just the dot below.
          return null;
        }
        const d = seg
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
          .join(' ');
        return (
          <path
            key={segIdx}
            d={d}
            fill="none"
            stroke="oklch(0.42 0.14 30)"
            strokeWidth={1.6}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            className="irc-pl-line"
            style={{ animationDelay: `${320 + segIdx * 80}ms` }}
          />
        );
      })}
      {lastPoint && (
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={2.6}
          fill="oklch(0.42 0.14 30)"
          stroke="#fff"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          className="irc-pl-dot"
        />
      )}
    </svg>
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
