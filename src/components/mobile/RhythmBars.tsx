// Tiny bar chart used in the mobile Dashboard's "Income rhythm" card.
// Pure SVG, no client JS — receives the rhythm series + `nowIndex` and
// renders 18 bars: solid for received (past), dashed outline for projected
// (future), highlighted accent for the current month.

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
}

export function RhythmBars({ months, nowIndex, height = 96, condensed = false }: Props) {
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
                  background: isFuture ? 'transparent' : isNow ? 'var(--accent-soft)' : 'var(--text)',
                  border: isFuture ? '1px dashed var(--border-strong)' : '0',
                  opacity: isFuture ? 0.55 : isNow ? 1 : 0.86,
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
                // Hide every other label except the "now" anchor so it doesn't crowd
                opacity: i % 2 === 0 || i === nowIndex ? 1 : 0,
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
