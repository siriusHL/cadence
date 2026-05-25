'use client';

import { useState } from 'react';
import { type MonthOverview } from '@/lib/portfolio';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Props {
  months: MonthOverview[];
  /** 0-11. Months > this are "future" — labels are dimmed. */
  currentMonth: number;
}

function fmt(n: number, digits = 0): string {
  return n.toLocaleString('en-IE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function YearChart({ months, currentMonth }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const maxBar = Math.max(...months.map((m) => Math.max(m.received, m.expected)), 1) * 1.2;

  return (
    <div style={{ position: 'relative' }} className="cdn-chart-wrap">
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 180, padding: '0 8px' }}>
        {months.map((m, i) => {
          const received = m.received;
          const expected = m.expected;
          const totalForBar = Math.max(received, expected);
          const totalH = (totalForBar / maxBar) * 100;
          const solidPortion = totalForBar > 0 ? (received / totalForBar) * totalH : 0;
          const fadedPortion = Math.max(0, totalH - solidPortion);
          const isFutureMonth = i > currentMonth;
          const isHovered = hover === i;
          const isDimmed = hover !== null && !isHovered;

          return (
            /* Outer: staggered entry animation — no opacity/transform conflict with hover */
            <div
              key={i}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%',
                animation: `cdn-bar-enter 420ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${i * 28}ms both`,
              }}
            >
              {/* Inner: hover dimming — separate element to avoid animation conflict */}
              <div
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover((cur) => (cur === i ? null : cur))}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  height: '100%',
                  width: '100%',
                  cursor: m.byTicker.length > 0 ? 'pointer' : 'default',
                  opacity: isDimmed ? 0.38 : 1,
                  transition: 'opacity 220ms ease',
                }}
              >
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: '100%' }}>
                  {received > 0 && (
                    <div className="num" style={{
                      fontSize: 12, fontWeight: 500, textAlign: 'center', marginBottom: 6,
                      color: isHovered ? '#1d1d1f' : 'rgba(29,29,31,0.7)',
                      transition: 'color 200ms ease',
                    }}>
                      €{Math.round(received)}
                    </div>
                  )}
                  {received === 0 && expected > 0 && (
                    <div className="num" style={{
                      fontSize: 11, color: '#86868b', fontWeight: 400,
                      textAlign: 'center', marginBottom: 6,
                    }}>
                      €{Math.round(expected)}
                    </div>
                  )}

                  {/* Bar segments — scale + glow on hover */}
                  <div style={{
                    transform: isHovered ? 'scaleX(1.09)' : 'scaleX(1)',
                    transition: 'transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                    transformOrigin: 'bottom center',
                  }}>
                    <div style={{
                      height: `${fadedPortion}%`,
                      background: isHovered
                        ? 'oklch(0.55 0.10 175 / 0.44)'
                        : 'oklch(0.55 0.10 175 / 0.22)',
                      borderRadius: '6px 6px 0 0',
                      transition: 'background 220ms ease, box-shadow 220ms ease',
                      boxShadow: isHovered
                        ? '0 -2px 10px oklch(0.55 0.10 175 / 0.30)'
                        : 'none',
                    }} />
                    <div style={{
                      height: `${solidPortion}%`,
                      background: isHovered ? 'oklch(0.47 0.13 175)' : 'oklch(0.55 0.10 175)',
                      borderRadius: fadedPortion > 0 ? '0' : '6px 6px 0 0',
                      transition: 'background 220ms ease, box-shadow 220ms ease',
                      boxShadow: isHovered
                        ? '0 -6px 18px oklch(0.55 0.10 175 / 0.44), 0 0 0 1px oklch(0.55 0.10 175 / 0.16)'
                        : 'none',
                    }} />
                  </div>
                </div>

                <div style={{
                  fontSize: 12,
                  color: isFutureMonth ? '#86868b' : (received > 0 ? '#1d1d1f' : '#6e6e73'),
                  fontWeight: received > 0 || i === currentMonth ? 500 : 400,
                }}>
                  {MONTH_NAMES[i]}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hover != null && months[hover].byTicker.length > 0 && (
        <Tooltip month={months[hover]} monthIndex={hover} />
      )}
    </div>
  );
}

function Tooltip({ month, monthIndex }: { month: MonthOverview; monthIndex: number }) {
  const total = month.received + month.expected;
  const leftPct = (monthIndex + 0.5) * (100 / 12);
  return (
    <div
      className="cdn-tip"
      style={{
        left: `${leftPct}%`,
        bottom: 'calc(100% + 12px)',
        transform: 'translateX(-50%)',
      }}
    >
      <div className="cdn-tip-header">
        <span style={{ fontWeight: 600, fontSize: 13 }}>{MONTH_NAMES[monthIndex]}</span>
        <span className="num" style={{ fontWeight: 600 }}>
          €{total.toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {month.byTicker.map((line) => {
          const amt = line.received + line.expected;
          const isExpected = line.expected > 0 && line.received === 0;
          return (
            <div key={line.ticker} className="cdn-tip-row">
              <span style={{
                color: 'rgba(255,255,255,0.82)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                <b style={{ color: '#fff' }}>{line.ticker}</b>
                {line.name && <span style={{ color: 'rgba(255,255,255,0.46)' }}> · {line.name}</span>}
              </span>
              <span className="num" style={{ flexShrink: 0, color: isExpected ? 'rgba(255,255,255,0.58)' : '#fff' }}>
                €{fmt(amt, 2)}
                {isExpected && <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.6 }}>est.</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
