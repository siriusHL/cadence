// Tiny bar chart used in the mobile Dashboard's "Income rhythm" card and
// the Dividends tab. Pure SVG, no client JS — receives the rhythm series
// + `nowIndex` and renders bars sized to either received (past) or
// expected (future) income.
//
// Two render modes:
//   • default (rhythm view): past months filled solid, current month
//     accent-tinted, future months drawn as dashed outlines so the
//     projection is clearly distinguished from realized income.
//   • solid mode: every bar is filled — past at full opacity, future at
//     lower opacity, current month still accent-tinted. Used by the
//     calendar Year view where the dashed/solid switch reads as
//     "empty/missing" rather than "projected".

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
  /** Render projection (future) bars as filled solids at reduced opacity
   *  instead of dashed outlines. Use for calendar/year views where the
   *  dashed style reads as missing data. */
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
  const max = Math.max(
    ...months.map((m) => Math.max(m.received, m.expected)),
  ) || 1;

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${months.length}, 1fr)`,
          gap: condensed ? 2 : 3,
          height,
          alignItems: 'end',
          padding: '6px 0 4px',
        }}
      >
        {months.map((m, i) => {
          const isFuture = i > nowIndex;
          const isNow = i === nowIndex;
          const v = isFuture ? m.expected : m.received;
          const h = Math.max(2, (v / max) * (height - 12));
          const label = MONTH_SHORT[m.month] + (i === nowIndex ? ' (now)' : '');
          // Background + border style depends on render mode.
          let background: string;
          let border: string;
          let opacity: number;
          if (solid) {
            // Calendar view — everything is filled. Past = full text color,
            // future = same color at reduced opacity (still clearly a "bar"),
            // now = accent tint.
            background = isNow ? 'var(--accent-soft)' : 'var(--text)';
            border = '0';
            opacity = isFuture ? 0.45 : isNow ? 1 : 0.86;
          } else {
            // Rhythm view — past solid, future dashed outline.
            background = isFuture ? 'transparent' : isNow ? 'var(--accent-soft)' : 'var(--text)';
            border = isFuture ? '1px dashed var(--border-strong)' : '0';
            opacity = isFuture ? 0.55 : isNow ? 1 : 0.86;
          }
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
                  border,
                  opacity,
                  transition: 'height 240ms cubic-bezier(0.22,1,0.36,1)',
                }}
              />
            </div>
          );
        })}
      </div>
      {!condensed && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${months.length}, 1fr)`,
            gap: 3,
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
                // Space labels every-other-bar *relative to the now anchor*,
                // not relative to index 0. This keeps the now label visible
                // without crowding it against its neighbours — the previous
                // rule (`i % 2 === 0 || i === nowIndex`) showed Apr+May+Jun
                // back-to-back when nowIndex landed on an odd index.
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
