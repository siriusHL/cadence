'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { type YearEvent } from '@/lib/portfolio';
import { TickerLogo } from '@/components/TickerLogo';

interface Props {
  events: YearEvent[];
  year: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const ONBOARDED_KEY = 'cdn-calendar-onboarded';

function fmt(n: number, digits = 0): string {
  return n.toLocaleString('en-IE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

interface Cell {
  sum: number;
  events: YearEvent[];
}

interface CellId { m: number; d: number; }

export function YearHeatmap({ events, year }: Props) {
  // Cell currently open in the modal. null = no modal.
  const [selected, setSelected] = useState<CellId | null>(null);
  // Cell currently hovered — drives the slim "Click for details" hint.
  const [hover, setHover] = useState<{ m: number; d: number; x: number; y: number } | null>(null);
  // Tracks whether the user dismissed the pulse during *this* session,
  // separate from the persisted localStorage flag below — so dismissPulse
  // gives an immediate UI update without waiting for a re-read.
  const [dismissedHere, setDismissedHere] = useState(false);

  // Persisted-onboarded read via useSyncExternalStore — hydration-safe
  // (server returns `true`, then client snapshots actual localStorage after
  // hydration). No setState-in-effect needed.
  const persistedOnboarded = useSyncExternalStore(
    (cb) => {
      if (typeof window === 'undefined') return () => {};
      window.addEventListener('storage', cb);
      return () => window.removeEventListener('storage', cb);
    },
    () => {
      try {
        return window.localStorage.getItem(ONBOARDED_KEY) === '1';
      } catch {
        return true;
      }
    },
    () => true, // SSR: pretend onboarded so first paint has no pulse.
  );

  const { grid, maxDay, monthTotals, biggestCell } = useMemo(() => {
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
    let biggest: { m: number; d: number; sum: number } | null = null;
    for (let m = 0; m < 12; m++) {
      for (let d = 0; d < 31; d++) {
        const s = grid[m][d].sum;
        if (s > max) max = s;
        totals[m] += s;
        if (s > 0 && (!biggest || s > biggest.sum)) biggest = { m, d, sum: s };
      }
    }
    return {
      grid,
      maxDay: max || 1,
      monthTotals: totals,
      biggestCell: biggest ? { m: biggest.m, d: biggest.d } : null,
    };
  }, [events]);

  // Derive pulse target during render: pulse only the heaviest-paying cell,
  // only when the user has neither been onboarded persistently NOR dismissed
  // it during this session.
  const showPulse = !persistedOnboarded && !dismissedHere;
  const pulseAt: CellId | null = showPulse ? biggestCell : null;

  const dismissPulse = () => {
    setDismissedHere(true);
    try {
      window.localStorage.setItem(ONBOARDED_KEY, '1');
    } catch {
      // localStorage blocked (private mode) — pulse just won't be remembered
      // across reloads, which is acceptable degradation.
    }
  };

  const openCell = (m: number, d: number) => {
    if (grid[m][d].sum <= 0) return;
    dismissPulse();
    setHover(null);
    setSelected({ m, d });
  };

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
                  fontWeight: 500, color: 'var(--text-dim)', textAlign: 'center',
                }}
              >
                {i + 1}
              </th>
            ))}
            <th style={{
              width: 70, textAlign: 'right',
              fontSize: 10.5, color: 'var(--text-dim)', fontWeight: 500, paddingLeft: 8,
            }}>
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {MONTH_NAMES.map((mn, mi) => (
            <tr key={mn}>
              <td style={{ fontSize: 11.5, color: 'var(--text)', fontWeight: 500, paddingRight: 6 }}>
                {mn}
              </td>
              {Array.from({ length: 31 }, (_, di) => {
                const cell = grid[mi][di];
                const isToday = isCurrentYear && mi === todayMonth && (di + 1) === todayDate;
                const pct = cell.sum > 0 ? Math.max(15, Math.min(100, (cell.sum / maxDay) * 100)) : 0;
                const bg = cell.sum > 0
                  ? `color-mix(in oklab, oklch(0.55 0.10 175) ${pct}%, rgba(0,0,0,0.04))`
                  : 'rgba(0,0,0,0.04)';
                const isPulsing = pulseAt != null && pulseAt.m === mi && pulseAt.d === di;
                const hasEvents = cell.sum > 0;
                return (
                  <td key={di} style={{ padding: 0 }}>
                    <div style={{ position: 'relative', width: 17, height: 17, margin: '0 auto' }}>
                      <button
                        type="button"
                        aria-label={
                          hasEvents
                            ? `${MONTH_LONG[mi]} ${di + 1} — €${fmt(cell.sum, 2)} (${cell.events.length} payment${cell.events.length === 1 ? '' : 's'}). Click for details.`
                            : `${MONTH_LONG[mi]} ${di + 1} — no payments`
                        }
                        disabled={!hasEvents}
                        onMouseEnter={(ev) => {
                          if (!hasEvents) return;
                          const r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
                          setHover({ m: mi, d: di, x: r.right, y: r.top + r.height / 2 });
                        }}
                        onMouseLeave={() =>
                          setHover((cur) => (cur && cur.m === mi && cur.d === di ? null : cur))
                        }
                        onClick={() => openCell(mi, di)}
                        className={`heatmap-cell${isPulsing ? ' is-pulsing' : ''}${hasEvents ? ' has-events' : ''}`}
                        style={{
                          width: 17, height: 17,
                          borderRadius: 4,
                          background: bg,
                          border: isToday
                            ? '1px solid oklch(0.55 0.10 175)'
                            : 'none',
                          padding: 0,
                          cursor: hasEvents ? 'pointer' : 'default',
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
                            pointerEvents: 'none',
                          }}
                        />
                      )}
                    </div>
                  </td>
                );
              })}
              <td className="num" style={{
                textAlign: 'right', fontSize: 11.5, fontWeight: 500,
                color: monthTotals[mi] > 0 ? 'var(--text)' : 'var(--text-dim)',
                paddingLeft: 8,
              }}>
                {monthTotals[mi] > 0 ? `€${fmt(monthTotals[mi])}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Slim hover hint with the click affordance. Only renders when no
          modal is open so it never visually competes with the dialog. */}
      {hover && !selected && grid[hover.m][hover.d].events.length > 0 && (
        <HoverHint
          cell={grid[hover.m][hover.d]}
          month={hover.m}
          day={hover.d + 1}
          year={year}
          anchorX={hover.x}
          anchorY={hover.y}
        />
      )}

      {selected && (
        <DayModal
          cell={grid[selected.m][selected.d]}
          month={selected.m}
          day={selected.d + 1}
          year={year}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function HoverHint({
  cell, month, day, year, anchorX, anchorY,
}: {
  cell: Cell;
  month: number;
  day: number;
  year: number;
  anchorX: number;
  anchorY: number;
}) {
  if (typeof document === 'undefined') return null;
  const TOOLTIP_MAX_W = 220;
  const GAP = 10;
  const CELL = 17;
  const flipLeft =
    anchorX + GAP + TOOLTIP_MAX_W > window.innerWidth - 16;

  const style: React.CSSProperties = {
    position: 'fixed',
    top: anchorY,
    zIndex: 1100,
    pointerEvents: 'none', // never blocks clicks on the underlying cell
    maxWidth: TOOLTIP_MAX_W,
  };
  if (flipLeft) {
    style.left = anchorX - CELL - GAP;
    style.transform = 'translate(-100%, -50%)';
  } else {
    style.left = anchorX + GAP;
    style.transform = 'translateY(-50%)';
  }

  return createPortal(
    <div className="cdn-hover-hint" style={style} role="tooltip">
      <div className="t">
        {MONTH_NAMES[month]} {day}, {year}
      </div>
      <div className="meta">
        €{fmt(cell.sum, 2)} · {cell.events.length} payment{cell.events.length === 1 ? '' : 's'}
      </div>
      <div className="cta">Click to see all →</div>
    </div>,
    document.body,
  );
}

function DayModal({
  cell, month, day, year, onClose,
}: {
  cell: Cell;
  month: number;
  day: number;
  year: number;
  onClose: () => void;
}) {
  // ESC to close + lock body scroll while the modal is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const count = cell.events.length;

  // Portal to <body> so the modal escapes any ancestor stacking context
  // (the .scroll wrapper's keyframe-transform was capturing position:fixed
  // and pushing the modal off-centre).
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="cdn-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        className="cdn-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cdn-modal-title"
      >
        <button
          type="button"
          className="cdn-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <div className="cdn-modal-h">
          <span id="cdn-modal-title">
            {MONTH_LONG[month]} {day}, {year}
          </span>
          <span className="num">€{fmt(cell.sum, 2)}</span>
        </div>
        <div className="cdn-modal-meta">
          {count} payment{count === 1 ? '' : 's'}
        </div>
        <div className="cdn-modal-list">
          {cell.events.map((e) => (
            <div key={e.ticker + e.exDate} className="cdn-modal-row">
              <div className="left">
                <TickerLogo ticker={e.ticker} size={28} />
                <div style={{ minWidth: 0 }}>
                  <div className="t">{e.ticker}</div>
                  {e.name && <div className="n">{e.name}</div>}
                </div>
              </div>
              <div className="right">
                <div className="amt">€{fmt(e.grossLocal, 2)}</div>
                {e.isProjected && <div className="proj">estimated</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
