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
    <div style={{ position: 'relative' }}>
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

          return (
            <div
              key={i}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((cur) => (cur === i ? null : cur))}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 8, height: '100%',
                cursor: m.byTicker.length > 0 ? 'pointer' : 'default',
              }}
            >
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                justifyContent: 'flex-end', width: '100%',
              }}>
                {received > 0 && (
                  <div className="num" style={{
                    fontSize: 12, color: '#1d1d1f', fontWeight: 500,
                    textAlign: 'center', marginBottom: 6,
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
                <div style={{
                  height: `${fadedPortion}%`,
                  // Tinted version of the accent — same hue, low alpha
                  background: isHovered
                    ? 'oklch(0.55 0.10 175 / 0.35)'
                    : 'oklch(0.55 0.10 175 / 0.22)',
                  borderRadius: '6px 6px 0 0',
                  transition: 'background 120ms',
                }} />
                <div style={{
                  height: `${solidPortion}%`,
                  background: isHovered ? 'oklch(0.48 0.12 175)' : 'oklch(0.55 0.10 175)',
                  // Top corners only get rounded when there's no faded tip stacked above.
                  borderRadius: fadedPortion > 0 ? '0' : '6px 6px 0 0',
                  transition: 'background 120ms',
                }} />
              </div>
              <div style={{
                fontSize: 12,
                color: isFutureMonth ? '#86868b' : (received > 0 ? '#1d1d1f' : '#6e6e73'),
                fontWeight: received > 0 || i === currentMonth ? 500 : 400,
              }}>
                {MONTH_NAMES[i]}
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
  // Position the tooltip above the column. 12 columns → each column is ~8.33% wide.
  // Center on the column with a max-width clamp so it doesn't overflow.
  const leftPct = (monthIndex + 0.5) * (100 / 12);
  return (
    <div
      style={{
        position: 'absolute',
        left: `${leftPct}%`,
        bottom: 'calc(100% + 8px)',
        transform: 'translateX(-50%)',
        background: '#1d1d1f',
        color: '#fff',
        padding: '10px 14px',
        borderRadius: 12,
        minWidth: 220,
        maxWidth: 280,
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        fontSize: 12,
        zIndex: 10,
        pointerEvents: 'none',
      }}
    >
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{MONTH_NAMES[monthIndex]}</span>
        <span className="num" style={{ fontWeight: 600 }}>
          €{total.toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {month.byTicker.map((line) => {
          const amt = line.received + line.expected;
          const isExpected = line.expected > 0 && line.received === 0;
          return (
            <div key={line.ticker} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <b style={{ color: '#fff' }}>{line.ticker}</b>
                {line.name && <span style={{ color: 'rgba(255,255,255,0.55)' }}> · {line.name}</span>}
              </span>
              <span className="num" style={{ flexShrink: 0, color: isExpected ? 'rgba(255,255,255,0.65)' : '#fff' }}>
                €{fmt(amt, 2)}
                {isExpected && <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.7 }}>est.</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
