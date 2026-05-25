'use client';

import { useMemo, useState } from 'react';
import { type YearEvent } from '@/lib/portfolio';

interface Props {
  events: YearEvent[];
  year: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmt(n: number, digits = 0): string {
  return n.toLocaleString('en-IE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

interface Cell {
  sum: number;
  events: YearEvent[];
}

interface HoverState {
  m: number; d: number;
  x: number; y: number;       // viewport coords of the hovered cell's top-center
}

export function YearHeatmap({ events, year }: Props) {
  const [hover, setHover] = useState<HoverState | null>(null);

  const { grid, maxDay, monthTotals } = useMemo(() => {
    // 12 months × 31 days. month/day are 1-indexed.
    const grid: Cell[][] = Array.from({ length: 12 }, () =>
      Array.from({ length: 31 }, () => ({ sum: 0, events: [] })),
    );
    for (const ev of events) {
      const d = new Date(ev.exDate);
      grid[d.getMonth()][d.getDate() - 1].sum += ev.grossLocal;
      grid[d.getMonth()][d.getDate() - 1].events.push(ev);
    }
    let max = 0;
    const totals = Array(12).fill(0);
    for (let m = 0; m < 12; m++) {
      for (let d = 0; d < 31; d++) {
        const s = grid[m][d].sum;
        if (s > max) max = s;
        totals[m] += s;
      }
    }
    return { grid, maxDay: max || 1, monthTotals: totals };
  }, [events]);

  const today = new Date();
  const isCurrentYear = today.getFullYear() === year;
  const todayMonth = today.getMonth();
  const todayDate = today.getDate();

  return (
    <div style={{ position: 'relative' }}>
      <table style={{
        width: '100%', borderCollapse: 'separate', borderSpacing: 2,
        fontVariantNumeric: 'tabular-nums',
      }}>
        <thead>
          <tr>
            <th style={{ width: 36 }}></th>
            {Array.from({ length: 31 }, (_, i) => (
              <th
                key={i}
                style={{
                  fontSize: 9, padding: '2px 0',
                  fontWeight: 500, color: '#86868b', textAlign: 'center',
                }}
              >
                {i + 1}
              </th>
            ))}
            <th style={{
              width: 70, textAlign: 'right',
              fontSize: 10.5, color: '#86868b', fontWeight: 500, paddingLeft: 8,
            }}>
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {MONTH_NAMES.map((mn, mi) => (
            <tr key={mn}>
              <td style={{ fontSize: 11.5, color: '#1d1d1f', fontWeight: 500, paddingRight: 6 }}>
                {mn}
              </td>
              {Array.from({ length: 31 }, (_, di) => {
                const cell = grid[mi][di];
                const isToday = isCurrentYear && mi === todayMonth && (di + 1) === todayDate;
                const pct = cell.sum > 0 ? Math.max(15, Math.min(100, (cell.sum / maxDay) * 100)) : 0;
                const bg = cell.sum > 0
                  ? `color-mix(in oklab, oklch(0.55 0.10 175) ${pct}%, rgba(0,0,0,0.04))`
                  : 'rgba(0,0,0,0.04)';
                return (
                  <td key={di} style={{ padding: 0 }}>
                    <div style={{ position: 'relative', width: 17, height: 17, margin: '0 auto' }}>
                      <div
                        onMouseEnter={(ev) => {
                          if (cell.sum <= 0) return;
                          const r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
                          setHover({ m: mi, d: di, x: r.right, y: r.top + r.height / 2 });
                        }}
                        onMouseLeave={() => setHover((cur) => (cur && cur.m === mi && cur.d === di ? null : cur))}
                        style={{
                          width: 17, height: 17,
                          borderRadius: 4,
                          background: bg,
                          border: isToday
                            ? '1px solid oklch(0.55 0.10 175)'
                            : 'none',
                          cursor: cell.sum > 0 ? 'pointer' : 'default',
                          transition: 'transform 100ms',
                          transform: hover && hover.m === mi && hover.d === di ? 'scale(1.4)' : 'scale(1)',
                        }}
                      />
                      {isToday && (
                        <span
                          aria-label="Today"
                          title="Today"
                          style={{
                            position: 'absolute',
                            left: '50%', top: 'calc(100% + 2px)',
                            transform: 'translateX(-50%)',
                            width: 3, height: 3,
                            borderRadius: '50%',
                            background: 'oklch(0.55 0.10 175)',
                          }}
                        />
                      )}
                    </div>
                  </td>
                );
              })}
              <td className="num" style={{
                textAlign: 'right', fontSize: 11.5, fontWeight: 500,
                color: monthTotals[mi] > 0 ? '#1d1d1f' : '#c7c7cc',
                paddingLeft: 8,
              }}>
                {monthTotals[mi] > 0 ? `€${fmt(monthTotals[mi])}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {hover && grid[hover.m][hover.d].events.length > 0 && (
        <HoverPopover
          cell={grid[hover.m][hover.d]}
          month={hover.m}
          day={hover.d + 1}
          year={year}
          anchorX={hover.x}
          anchorY={hover.y}
        />
      )}
    </div>
  );
}

function HoverPopover({
  cell, month, day, year, anchorX, anchorY,
}: { cell: Cell; month: number; day: number; year: number; anchorX: number; anchorY: number }) {
  // Dock to the side of the cell so it doesn't block the rows above/below.
  // Default: right of the cell with a small gap. Flip to the left if the
  // tooltip would overflow the viewport on the right.
  const TOOLTIP_MAX_W = 280;
  const GAP = 10;
  const flipLeft =
    typeof window !== 'undefined' && anchorX + GAP + TOOLTIP_MAX_W > window.innerWidth - 16;
  return (
    <div
      className="cdn-tip"
      style={{
        position: 'fixed',
        left: flipLeft ? anchorX - GAP - 17 : anchorX + GAP,
        top: anchorY,
        transform: flipLeft ? 'translate(-100%, -50%)' : 'translate(0, -50%)',
        zIndex: 1000,
      }}
    >
      <div className="cdn-tip-header">
        <span style={{ fontWeight: 600, fontSize: 13 }}>
          {MONTH_NAMES[month]} {day}, {year}
        </span>
        <span className="num" style={{ fontWeight: 600 }}>€{fmt(cell.sum, 2)}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {cell.events.slice(0, 8).map((e) => (
          <div key={e.ticker + e.exDate} className="cdn-tip-row">
            <span style={{ color: 'rgba(255,255,255,0.82)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <b style={{ color: '#fff' }}>{e.ticker}</b>
              {e.name && <span style={{ color: 'rgba(255,255,255,0.46)' }}> · {e.name}</span>}
            </span>
            <span className="num" style={{
              flexShrink: 0,
              color: e.isProjected ? 'rgba(255,255,255,0.58)' : '#fff',
            }}>
              €{fmt(e.grossLocal, 2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
