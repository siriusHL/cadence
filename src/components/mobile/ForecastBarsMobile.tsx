// Mobile equivalent of the desktop ForecastChart — shows a fixed 12-month
// forward window as bars + a cumulative line overlay. No interactivity
// (the desktop's hover/click-to-open per-month detail modal doesn't
// translate to a touch surface this narrow). The bar value labels are
// dropped on purpose: at ~21px per column on a 360px phone they overlap
// adjacent bars; the cumulative total to the right gives the headline
// number instead.

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface ForecastBarsMonth {
  month: number;   // 0-11
  year: number;
  total: number;   // expected income for the month, base currency
}

interface Props {
  months: ForecastBarsMonth[];
  /** Chart height in px (excludes the label row below). Default 140. */
  height?: number;
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString('en-IE');
}

/** Round up to a "nice" axis ceiling so the bars don't peg the top. */
function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const norm = v / exp;
  const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return niceNorm * exp;
}

export function ForecastBarsMobile({ months, height = 140 }: Props) {
  if (months.length === 0) return null;

  // Running total for the cumulative line.
  const cums: number[] = [];
  let runningTotal = 0;
  for (const m of months) {
    runningTotal += m.total;
    cums.push(runningTotal);
  }

  const barMax = niceCeil(Math.max(1, Math.max(...months.map((m) => m.total)) * 1.2));
  const cumMax = niceCeil(Math.max(1, (cums[cums.length - 1] ?? 1) * 1.05));
  const finalCum = cums[cums.length - 1] ?? 0;

  // y-axis ticks for the bars scale (left side).
  const yTicks = [0, barMax / 2, barMax];

  const LABEL_ROW_H = 22;
  const Y_AXIS_W = 34;

  return (
    <div style={{ width: '100%' }}>
      {/* Legend + cumulative total */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 11,
          color: 'var(--text-muted)',
          marginBottom: 10,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: 2,
              background: 'oklch(0.55 0.10 175)',
            }}
          />
          Monthly
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span
            style={{
              width: 14,
              height: 2,
              background: 'oklch(0.40 0.06 235)',
              borderRadius: 1,
            }}
          />
          Cumulative
        </span>
        <span style={{ flex: 1 }} />
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            color: 'oklch(0.40 0.06 235)',
            whiteSpace: 'nowrap',
          }}
        >
          €{fmt(finalCum)} total
        </span>
      </div>

      {/* Chart body */}
      <div
        style={{
          position: 'relative',
          height: height + LABEL_ROW_H,
          display: 'flex',
        }}
      >
        {/* Left y-axis */}
        <div
          style={{
            width: Y_AXIS_W,
            height,
            position: 'relative',
            flexShrink: 0,
          }}
        >
          {yTicks.map((v, i) => {
            const pct = (barMax - v) / (barMax || 1);
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  right: 4,
                  top: `${pct * 100}%`,
                  transform: 'translateY(-50%)',
                  fontSize: 9.5,
                  color: 'var(--text-dim)',
                  fontWeight: 500,
                }}
              >
                €{fmt(v)}
              </div>
            );
          })}
        </div>

        {/* Plot area */}
        <div
          style={{
            position: 'relative',
            flex: 1,
            height: height + LABEL_ROW_H,
          }}
        >
          {/* Grid lines */}
          <div
            style={{
              position: 'absolute',
              inset: `0 0 ${LABEL_ROW_H}px 0`,
              pointerEvents: 'none',
            }}
          >
            {yTicks.map((_, i) => {
              const pct = i / (yTicks.length - 1);
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: `${(1 - pct) * 100}%`,
                    height: 1,
                    background: 'var(--surface-2)',
                  }}
                />
              );
            })}
          </div>

          {/* Bars */}
          <div
            style={{
              position: 'absolute',
              inset: `0 0 ${LABEL_ROW_H}px 0`,
              display: 'grid',
              gridTemplateColumns: `repeat(${months.length}, 1fr)`,
              gap: 3,
              alignItems: 'end',
            }}
          >
            {months.map((m) => {
              const h = (m.total / barMax) * height;
              return (
                <div
                  key={`${m.year}-${m.month}`}
                  style={{ display: 'flex', alignItems: 'flex-end', minWidth: 0 }}
                  title={`${MONTH_SHORT[m.month]} ${m.year} · €${fmt(m.total)}`}
                >
                  <div
                    style={{
                      width: '100%',
                      height: Math.max(2, h),
                      background: 'oklch(0.55 0.10 175)',
                      borderRadius: '3px 3px 0 0',
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Cumulative line (SVG overlay, separate scale on right). */}
          <svg
            style={{
              position: 'absolute',
              inset: `0 0 ${LABEL_ROW_H}px 0`,
              width: '100%',
              height,
              pointerEvents: 'none',
            }}
            preserveAspectRatio="none"
            viewBox={`0 0 ${months.length} ${height}`}
          >
            {(() => {
              const points = cums.map((v, i) => ({
                x: i + 0.5,
                y: height - (v / cumMax) * height,
              }));
              const path = points
                .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(3)} ${p.y.toFixed(2)}`)
                .join(' ');
              return (
                <path
                  d={path}
                  fill="none"
                  stroke="oklch(0.40 0.06 235)"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ strokeWidth: 2 }}
                />
              );
            })()}
          </svg>

          {/* Cumulative endpoints */}
          <div
            style={{
              position: 'absolute',
              inset: `0 0 ${LABEL_ROW_H}px 0`,
              pointerEvents: 'none',
            }}
          >
            {cums.map((v, i) => {
              const leftPct = ((i + 0.5) / months.length) * 100;
              const topPct = (1 - v / cumMax) * 100;
              const isLast = i === cums.length - 1;
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    transform: 'translate(-50%, -50%)',
                    width: isLast ? 7 : 4,
                    height: isLast ? 7 : 4,
                    borderRadius: '50%',
                    background: 'var(--surface)',
                    border: '1.5px solid oklch(0.40 0.06 235)',
                  }}
                />
              );
            })}
          </div>

          {/* Month labels — every-other-month on a 12-bar mobile width to
              avoid crowding; first and last always shown so the time range
              is clear at a glance. */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              display: 'grid',
              gridTemplateColumns: `repeat(${months.length}, 1fr)`,
              gap: 3,
              height: LABEL_ROW_H,
            }}
          >
            {months.map((m, i) => {
              const isFirst = i === 0;
              const isLast = i === months.length - 1;
              const showLabel = isFirst || isLast || i % 2 === 0;
              return (
                <div
                  key={`${m.year}-${m.month}-l`}
                  style={{
                    textAlign: 'center',
                    fontSize: 9.5,
                    fontWeight: 500,
                    color: 'var(--text-dim)',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    paddingTop: 4,
                    opacity: showLabel ? 1 : 0,
                  }}
                >
                  {MONTH_SHORT[m.month]}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
