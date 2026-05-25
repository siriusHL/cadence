'use client';

import { useState } from 'react';
import { type MonthOverview } from '@/lib/portfolio';
import { EventDetailModal, EventHoverHint } from '@/components/EventDetailModal';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function fmt(n: number, digits = 0): string {
  return n.toLocaleString('en-IE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

interface Props {
  months: MonthOverview[];
  /** 0-11. Months > this are "future" — labels are dimmed. */
  currentMonth: number;
}

interface HoverState { idx: number; x: number; y: number; }

export function YearChart({ months, currentMonth }: Props) {
  const [hover, setHover] = useState<HoverState | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const maxBar = Math.max(...months.map((m) => Math.max(m.received, m.expected)), 1) * 1.2;

  const openMonth = (i: number) => {
    if (months[i].byTicker.length === 0) return;
    setHover(null);
    setSelected(i);
  };

  return (
    <div
      style={{ position: 'relative' }}
      className="year-chart"
      onMouseLeave={() => setHover(null)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 180, padding: '0 8px' }}>
        {months.map((m, i) => {
          const received = m.received;
          const expected = m.expected;
          const totalForBar = Math.max(received, expected);
          const totalH = (totalForBar / maxBar) * 100;
          const solidPortion = totalForBar > 0 ? (received / totalForBar) * totalH : 0;
          const fadedPortion = Math.max(0, totalH - solidPortion);
          const isFutureMonth = i > currentMonth;
          const isHovered = hover?.idx === i;
          const isDim = hover != null && !isHovered;
          const hasEvents = m.byTicker.length > 0;

          // Stagger: bars start ~250ms in, each subsequent month ~55ms later.
          const barDelay = 250 + i * 55;
          // Value label and month label come in after the bar has landed.
          const labelDelay = barDelay + 480;

          return (
            <div
              key={i}
              role={hasEvents ? 'button' : undefined}
              tabIndex={hasEvents ? 0 : -1}
              aria-label={
                hasEvents
                  ? `${MONTH_LONG[i]} — €${fmt(received + expected, 2)} from ${m.byTicker.length} payment${m.byTicker.length === 1 ? '' : 's'}. Click for details.`
                  : `${MONTH_LONG[i]} — no payments`
              }
              onMouseEnter={(ev) => {
                if (!hasEvents) return;
                const r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
                setHover({ idx: i, x: r.left + r.width / 2, y: r.top });
              }}
              onClick={() => openMonth(i)}
              onKeyDown={(ev) => {
                if (!hasEvents) return;
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault();
                  openMonth(i);
                }
              }}
              className={`yc-col${isHovered ? ' is-hovered' : ''}${isDim ? ' is-dim' : ''}`}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 8, height: '100%',
                cursor: hasEvents ? 'pointer' : 'default',
                outline: 'none',
              }}
            >
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                justifyContent: 'flex-end', width: '100%',
              }}>
                {received > 0 && (
                  <div
                    className="num yc-value"
                    style={{
                      fontSize: 12, color: 'var(--text)', fontWeight: 500,
                      textAlign: 'center', marginBottom: 6,
                      animationDelay: `${labelDelay}ms`,
                    }}
                  >
                    €{Math.round(received)}
                  </div>
                )}
                {received === 0 && expected > 0 && (
                  <div
                    className="num yc-value"
                    style={{
                      fontSize: 11, color: 'var(--text-dim)', fontWeight: 400,
                      textAlign: 'center', marginBottom: 6,
                      animationDelay: `${labelDelay}ms`,
                    }}
                  >
                    €{Math.round(expected)}
                  </div>
                )}
                <div
                  className="yc-bar-stack"
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
                    className="yc-bar yc-bar-faded"
                    style={{
                      height: totalH > 0 ? `${(fadedPortion / totalH) * 100}%` : '0%',
                      background: isHovered
                        ? 'oklch(0.55 0.10 175 / 0.38)'
                        : 'oklch(0.55 0.10 175 / 0.22)',
                      borderRadius: '6px 6px 0 0',
                    }}
                  />
                  <div
                    className="yc-bar yc-bar-solid"
                    style={{
                      height: totalH > 0 ? `${(solidPortion / totalH) * 100}%` : '0%',
                      background: isHovered ? 'oklch(0.46 0.13 175)' : 'oklch(0.55 0.10 175)',
                      borderRadius: fadedPortion > 0 ? '0' : '6px 6px 0 0',
                    }}
                  />
                </div>
              </div>
              <div
                className="yc-label"
                style={{
                  fontSize: 12,
                  color: isFutureMonth ? 'var(--text-dim)' : (received > 0 ? 'var(--text)' : 'var(--text-muted)'),
                  fontWeight: received > 0 || i === currentMonth ? 500 : 400,
                  animationDelay: `${labelDelay}ms`,
                }}
              >
                {MONTH_NAMES[i]}
              </div>
            </div>
          );
        })}
      </div>

      {/* Slim hover hint with the click affordance. Only renders when no
          modal is open so it doesn't visually compete with the dialog. */}
      {hover != null && selected == null && months[hover.idx].byTicker.length > 0 && (
        <EventHoverHint
          title={`${MONTH_LONG[hover.idx]} ${months[hover.idx].year}`}
          total={months[hover.idx].received + months[hover.idx].expected}
          count={months[hover.idx].byTicker.length}
          anchorX={hover.x}
          anchorY={hover.y}
          side="top"
        />
      )}

      {selected != null && months[selected].byTicker.length > 0 && (
        <EventDetailModal
          title={`${MONTH_LONG[selected]} ${months[selected].year}`}
          total={months[selected].received + months[selected].expected}
          rows={months[selected].byTicker.map((line) => ({
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
