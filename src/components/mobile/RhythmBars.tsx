// Tiny bar chart used in the mobile Dashboard's "Income rhythm" card and
// the Dividends tab. Pure SVG, no client JS — receives the rhythm series
// + `nowIndex` and renders bars sized to either received (past) or
// expected (future) income.
//
// Two render modes:
//   • default (rhythm view): same visual language as the desktop
//     IncomeRhythmChart — every bar is the teal accent colour, stacked
//     as solid received (bottom) + faded expected (top, same hue at 22%
//     opacity). A dashed vertical "Now" line plus label marks the
//     boundary between past and future, just like desktop.
//   • solid mode: every bar is filled in `--text` — past at full opacity,
//     future at reduced opacity, current month accent-tinted. Used by
//     the calendar Year view where the dashed/solid switch reads as
//     "empty/missing" rather than "projected".

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Match the desktop IncomeRhythmChart exactly — keep the two callers
// visually consistent at desktop vs phone.
const ACCENT_SOLID = 'oklch(0.55 0.10 175)';
const ACCENT_FADED = 'oklch(0.55 0.10 175 / 0.22)';

export interface RhythmMonth {
  month: number;   // 0-11
  year: number;
  received: number;
  expected: number;
}

interface Props {
  months: RhythmMonth[];
  nowIndex: number;
  height?: number;
  condensed?: boolean;
  /** Render every bar as a single filled rectangle (no received/expected
   *  stack, no Now divider). Used by the Year calendar view where the
   *  desktop-style stack would read as missing data. */
  solid?: boolean;
  /** Show every month label instead of every-other-month + nowIndex.
   *  Pairs with `solid` for the Year view's 12-month strip. */
  showAllLabels?: boolean;
}

export function RhythmBars({
  months,
  nowIndex,
  height = 96,
  condensed = false,
  solid = false,
  showAllLabels = false,
}: Props) {
  if (months.length === 0) return null;
  // Scale to the larger of received/expected per month, headroom-padded
  // 18% like desktop so the tallest bar doesn't kiss the ceiling.
  const max =
    Math.max(...months.map((m) => Math.max(m.received, m.expected)), 0) || 1;
  const scaleTop = max * 1.18;
  const gap = condensed ? 2 : 3;

  // Right edge of the now-bar as a % of the chart width, matching desktop.
  // ((nowIndex + 1) / totalBars) * 100 = where the next bar starts.
  const showNowLine = !solid && nowIndex >= 0 && nowIndex < months.length;
  const nowLeftPct = showNowLine
    ? ((nowIndex + 1) / months.length) * 100
    : 0;

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: `repeat(${months.length}, 1fr)`,
          gap,
          height,
          alignItems: 'end',
          padding: '6px 0 4px',
        }}
      >
        {months.map((m, i) => {
          const isFuture = i > nowIndex;
          const isNow = i === nowIndex;

          // ── default (desktop-parity) rhythm view ─────────────────
          // Stack solid received + faded expected so each bar shows
          // confirmed money at the bottom and projected money as the
          // fade on top — exactly like the desktop IncomeRhythmChart.
          if (!solid) {
            const top = Math.max(m.received, m.expected);
            const totalH = (top / scaleTop) * (height - 12);
            const solidH = top > 0 ? (m.received / top) * totalH : 0;
            const fadedH = Math.max(0, totalH - solidH);
            const titleVal = top;
            const label = MONTH_SHORT[m.month] + (isNow ? ' (now)' : '');
            return (
              <div
                key={`${m.year}-${m.month}`}
                title={`${label} · €${Math.round(titleVal).toLocaleString('en-IE')}`}
                style={{ display: 'flex', alignItems: 'flex-end', minWidth: 0 }}
              >
                <div
                  style={{
                    width: '100%',
                    height: Math.max(2, totalH),
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    transition: 'height 240ms cubic-bezier(0.22,1,0.36,1)',
                  }}
                >
                  {fadedH > 0 && (
                    <div
                      style={{
                        height: fadedH,
                        background: ACCENT_FADED,
                        borderRadius: '3px 3px 0 0',
                      }}
                    />
                  )}
                  {solidH > 0 && (
                    <div
                      style={{
                        height: solidH,
                        background: ACCENT_SOLID,
                        // Round the top only when there's no faded portion above.
                        borderRadius: fadedH > 0 ? '0' : '3px 3px 0 0',
                      }}
                    />
                  )}
                </div>
              </div>
            );
          }

          // ── solid mode (Year calendar view) — unchanged behaviour ─
          const v = isFuture ? m.expected : m.received;
          const h = Math.max(2, (v / max) * (height - 12));
          const label = MONTH_SHORT[m.month] + (isNow ? ' (now)' : '');
          const background = isNow ? 'var(--accent-soft)' : 'var(--text)';
          const opacity = isFuture ? 0.45 : isNow ? 1 : 0.86;
          return (
            <div
              key={`${m.year}-${m.month}`}
              title={`${label} · €${Math.round(v).toLocaleString('en-IE')}`}
              style={{ display: 'flex', alignItems: 'flex-end', minWidth: 0 }}
            >
              <div
                style={{
                  width: '100%',
                  height: h,
                  borderRadius: 3,
                  background,
                  opacity,
                  transition: 'height 240ms cubic-bezier(0.22,1,0.36,1)',
                }}
              />
            </div>
          );
        })}

        {/* "Now" vertical line + label — only in default mode, mirrors
            the desktop IncomeRhythmChart's NowMarker. */}
        {showNowLine && (
          <>
            <div
              aria-hidden
              style={{
                position: 'absolute',
                left: `${nowLeftPct}%`,
                top: 0,
                bottom: 4,
                width: 1,
                borderLeft: '1px dashed rgba(0,0,0,0.20)',
                pointerEvents: 'none',
              }}
            />
            <div
              aria-hidden
              style={{
                position: 'absolute',
                left: `calc(${nowLeftPct}% + 4px)`,
                top: 2,
                fontSize: 9,
                fontWeight: 500,
                color: 'var(--text-dim)',
                pointerEvents: 'none',
                letterSpacing: '0.02em',
              }}
            >
              Now
            </div>
          </>
        )}
      </div>

      {!condensed && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${months.length}, 1fr)`,
            gap,
            marginTop: 4,
          }}
        >
          {months.map((m, i) => (
            <div
              key={`${m.year}-${m.month}-l`}
              style={{
                fontSize: 8.5,
                color: 'var(--text-dim)',
                textAlign: 'center',
                fontWeight: 500,
                letterSpacing: '0.02em',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                opacity: showAllLabels || (i - nowIndex) % 2 === 0 ? 1 : 0,
              }}
            >
              {MONTH_SHORT[m.month]}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
