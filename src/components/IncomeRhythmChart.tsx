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
   * Optional portfolio cumulative return % sampled at end-of-month, same
   * length and index alignment as `months`. The chart rebases to 0 at the
   * first non-null point in the visible slice — so the line always starts at
   * 0% on the left edge and grows from there (same idea as the Performance
   * screen). `null` entries become gaps.
   */
  plReturnLine?: (number | null)[];
}

function fmt(n: number, digits = 0): string {
  return n.toLocaleString('en-IE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

interface HoverState { idx: number; x: number; y: number; }

export function IncomeRhythmChart({ months, nowIndex, plReturnLine }: Props) {
  const [range, setRange] = useState<RangeKey>('18M');
  const [hover, setHover] = useState<HoverState | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  // Slice the full month array based on the selected range. The return-% line
  // is rebased to 0 at the first non-null point in the visible slice — the
  // curve always starts at 0% on the left edge and grows from there, matching
  // the Performance screen's rebasing convention.
  const { slice, slicePL, nowIndexInSlice, sliceStart } = useMemo(() => {
    const cfg = RANGES[range];
    const start = Math.max(0, nowIndex - cfg.past + 1);
    const end = Math.min(months.length, nowIndex + cfg.future + 1);
    const rawSlice = plReturnLine ? plReturnLine.slice(start, end) : null;
    let rebased: (number | null)[] | null = null;
    if (rawSlice) {
      const firstNonNull = rawSlice.find((v) => v != null);
      const base = firstNonNull ?? 0;
      rebased = rawSlice.map((v) => (v == null ? null : v - base));
    }
    return {
      slice: months.slice(start, end),
      slicePL: rebased,
      nowIndexInSlice: nowIndex - start,
      sliceStart: start,
    };
  }, [months, nowIndex, range, plReturnLine]);

  // Dual scales — bars on the left axis (€), cumulative-return line on the
  // right (%). The line can dip below 0%; right axis extends as needed.
  const { barTop, plTop, plBottom } = useMemo(() => {
    const barMax = Math.max(...slice.map((m) => Math.max(m.received, m.expected)), 0);
    const plValues = slicePL?.filter((v): v is number => v != null) ?? [];
    const plMax = plValues.length > 0 ? Math.max(...plValues) : 0;
    const plMin = plValues.length > 0 ? Math.min(...plValues) : 0;
    // Pad by 15%, round to nearest 5pp for the % axis so labels stay tidy.
    const rawPLTop = Math.max(plMax * 1.15, 0);
    const rawPLBottom = Math.min(plMin * 1.15, 0);
    return {
      barTop: Math.max(1, niceCeil(barMax * 1.18)),
      plTop: Math.max(5, Math.ceil(rawPLTop / 5) * 5),
      plBottom: rawPLBottom < 0 ? Math.floor(rawPLBottom / 5) * 5 : 0,
    };
  }, [slice, slicePL]);

  // Left-axis ticks (bars, €) and right-axis ticks (line, %) — three each.
  const barTicks = useMemo(() => [0, barTop / 2, barTop], [barTop]);
  const plTicks = useMemo(() => {
    if (plBottom < 0) return [plBottom, 0, plTop];
    return [0, plTop / 2, plTop];
  }, [plBottom, plTop]);

  /** Project a bar € value into 0–100% of chart height (0 = top, 100 = bottom). */
  const barYPct = (v: number): number => ((barTop - v) / barTop) * 100;
  /** Project a return % onto the same vertical scale, using the right axis. */
  const plRange = plTop - plBottom;
  const plYPct = (v: number): number =>
    plRange > 0 ? ((plTop - v) / plRange) * 100 : 100;
  const hasPL = slicePL?.some((v) => v != null) ?? false;
  const lastPLValue = (() => {
    if (!slicePL) return null;
    for (let i = slicePL.length - 1; i >= 0; i--) {
      if (slicePL[i] != null) return slicePL[i] as number;
    }
    return null;
  })();

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
          {hasPL && (
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
              Cumulative return
              {lastPLValue != null && (
                <span
                  className="num"
                  style={{
                    color:
                      lastPLValue >= 0
                        ? 'oklch(0.42 0.14 30)'
                        : 'oklch(0.50 0.16 25)',
                    fontWeight: 600,
                  }}
                >
                  {lastPLValue >= 0 ? '+' : ''}
                  {lastPLValue.toFixed(2)}%
                </span>
              )}
              <span style={{ color: 'var(--text-dim)', fontSize: 10.5 }}>
                · since {RANGES[range].past}M ago, right axis
              </span>
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
        {/* Left y-axis labels — bar scale */}
        <div style={{
          width: yAxisWidth,
          height: chartHeight,
          position: 'relative',
          flexShrink: 0,
        }}>
          {barTicks.map((v, i) => (
            <div
              key={i}
              className="num"
              style={{
                position: 'absolute',
                right: 6,
                top: `${barYPct(v)}%`,
                transform: 'translateY(-50%)',
                fontSize: 10,
                color: 'var(--text-dim)',
                fontWeight: 500,
              }}
            >
              €{fmt(v)}
            </div>
          ))}
        </div>

        {/* Bars area */}
        <div style={{ position: 'relative', flex: 1, height: chartHeight + 22 }}>
          {/* Horizontal grid lines — aligned to the bar-scale ticks. */}
          <div style={{ position: 'absolute', inset: `0 0 22px 0`, pointerEvents: 'none' }}>
            {barTicks.map((v, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: 0, right: 0,
                  top: `${barYPct(v)}%`,
                  height: 1,
                  background: 'rgba(0,0,0,0.05)',
                }}
              />
            ))}
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
                  const totalH = (top / barTop) * 100;
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
                        flex: 1, display: 'flex', flexDirection: 'column',
                        justifyContent: 'flex-end',
                        height: '100%',
                        minWidth: 4,
                        cursor: hasEvents ? 'pointer' : 'default',
                        outline: 'none',
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

          {/* Cumulative P/L line overlay — uses right-axis (P/L) scale. */}
          {hasPL && slicePL && (
            <PLLine
              key={`pl-${range}`}
              values={slicePL}
              yPct={plYPct}
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

          {/* Trailing-P/L dot — HTML element (so it stays circular regardless
              of aspect ratio) inside a wrapper with the same inset as the
              SVG line, so plYPct can be used directly. */}
          {hasPL && slicePL && (() => {
            for (let i = slicePL.length - 1; i >= 0; i--) {
              const v = slicePL[i];
              if (v == null) continue;
              const leftPct = ((i + 0.5) / slicePL.length) * 100;
              const topPct = plYPct(v);
              return (
                <div
                  key={`pl-dot-wrap-${range}`}
                  aria-hidden
                  style={{
                    position: 'absolute',
                    inset: '0 0 22px 0',
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    className="irc-pl-dot"
                    style={{
                      position: 'absolute',
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      width: 8,
                      height: 8,
                      marginLeft: -4,
                      marginTop: -4,
                      borderRadius: '50%',
                      background: 'oklch(0.42 0.14 30)',
                      border: '1.5px solid #fff',
                      boxShadow: '0 0 0 0.5px rgba(0,0,0,0.10)',
                    }}
                  />
                </div>
              );
            }
            return null;
          })()}

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

        {/* Right y-axis labels — cumulative P/L scale. Only when P/L data
            is present, so the chart stays unchanged for portfolios without
            a performance series. */}
        {hasPL && (
          <div style={{
            width: yAxisWidth,
            height: chartHeight,
            position: 'relative',
            flexShrink: 0,
          }}>
            {plTicks.map((v, i) => (
              <div
                key={i}
                className="num"
                style={{
                  position: 'absolute',
                  left: 6,
                  top: `${plYPct(v)}%`,
                  transform: 'translateY(-50%)',
                  fontSize: 10,
                  color: v === 0 && plBottom < 0
                    ? 'var(--text-muted)'
                    : 'oklch(0.42 0.14 30 / 0.85)',
                  fontWeight: 500,
                }}
              >
                {v > 0 ? '+' : ''}{v.toFixed(0)}%
              </div>
            ))}
          </div>
        )}
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
