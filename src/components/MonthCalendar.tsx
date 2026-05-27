'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { type YearEvent } from '@/lib/portfolio';
import { TickerLogo } from '@/components/TickerLogo';

interface Props {
  events: YearEvent[];
  initialYear: number;
  initialMonth: number; // 0-11
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface DayCell {
  exEvents: YearEvent[];
  payEvents: YearEvent[];
}

function fmt(n: number, digits = 0): string {
  return n.toLocaleString('en-IE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function MonthCalendar({ events, initialYear, initialMonth }: Props) {
  const [view, setView] = useState({ year: initialYear, month: initialMonth });
  const [selected, setSelected] = useState<{ year: number; month: number; day: number } | null>(null);

  const today = new Date();
  const todayY = today.getFullYear();
  const todayM = today.getMonth();
  const todayD = today.getDate();
  const isCurrentMonth = todayY === view.year && todayM === view.month;

  const byDay = useMemo(() => {
    const map = new Map<number, DayCell>();
    const getCell = (day: number) => {
      let c = map.get(day);
      if (!c) {
        c = { exEvents: [], payEvents: [] };
        map.set(day, c);
      }
      return c;
    };
    for (const e of events) {
      const exD = parseLocalDate(e.exDate);
      if (exD.getFullYear() === view.year && exD.getMonth() === view.month) {
        getCell(exD.getDate()).exEvents.push(e);
      }
      if (e.payDate) {
        const payD = parseLocalDate(e.payDate);
        if (payD.getFullYear() === view.year && payD.getMonth() === view.month) {
          getCell(payD.getDate()).payEvents.push(e);
        }
      }
    }
    return map;
  }, [events, view]);

  // Mon=0 .. Sun=6 grid (ISO week start)
  const firstDay = new Date(view.year, view.month, 1);
  const lastDay = new Date(view.year, view.month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const goPrev = () => setView((v) => {
    const m = v.month - 1;
    return m < 0 ? { year: v.year - 1, month: 11 } : { ...v, month: m };
  });
  const goNext = () => setView((v) => {
    const m = v.month + 1;
    return m > 11 ? { year: v.year + 1, month: 0 } : { ...v, month: m };
  });
  const goToday = () => setView({ year: todayY, month: todayM });

  let monthExCount = 0;
  let monthPayCount = 0;
  let monthPayTotal = 0;
  for (const v of byDay.values()) {
    monthExCount += v.exEvents.length;
    monthPayCount += v.payEvents.length;
    for (const ev of v.payEvents) monthPayTotal += ev.grossLocal;
  }

  return (
    <div className="cdn-month-cal">
      <div className="cdn-cal-h">
        <div>
          <div className="title">
            {MONTH_LONG[view.month]} <span className="yr">{view.year}</span>
          </div>
          <div className="meta">
            {monthExCount} ex-date{monthExCount === 1 ? '' : 's'} · {monthPayCount} payment{monthPayCount === 1 ? '' : 's'}
            {monthPayTotal > 0 && <> · €{fmt(monthPayTotal)} paid</>}
          </div>
        </div>
        <div className="nav">
          <button type="button" onClick={goPrev} aria-label="Previous month">‹</button>
          <button type="button" onClick={goToday} className="today" disabled={isCurrentMonth}>Today</button>
          <button type="button" onClick={goNext} aria-label="Next month">›</button>
        </div>
      </div>

      <div className="cdn-cal-grid">
        {WEEKDAYS.map((w) => (
          <div key={w} className="dow">{w}</div>
        ))}
        {Array.from({ length: totalCells }, (_, i) => {
          const dayNum = i - startOffset + 1;
          const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
          if (!inMonth) {
            return <div key={i} className="day is-blank" aria-hidden="true" />;
          }
          const isToday = isCurrentMonth && dayNum === todayD;
          const cell = byDay.get(dayNum);
          const exCount = cell?.exEvents.length ?? 0;
          const payCount = cell?.payEvents.length ?? 0;
          const total = exCount + payCount;
          const hasAny = total > 0;
          // Pick up to 3 chips, preferring ex-date events first.
          const SHOW_MAX = 3;
          const chips: { kind: 'ex' | 'pay'; ticker: string }[] = [];
          for (const e of cell?.exEvents ?? []) {
            if (chips.length >= SHOW_MAX) break;
            chips.push({ kind: 'ex', ticker: e.ticker });
          }
          for (const e of cell?.payEvents ?? []) {
            if (chips.length >= SHOW_MAX) break;
            chips.push({ kind: 'pay', ticker: e.ticker });
          }
          const overflow = total - chips.length;
          return (
            <button
              key={i}
              type="button"
              className={
                'day' +
                (isToday ? ' is-today' : '') +
                (hasAny ? ' has-events' : '') +
                (exCount > 0 ? ' has-ex' : '') +
                (payCount > 0 ? ' has-pay' : '')
              }
              disabled={!hasAny}
              onClick={() => hasAny && setSelected({ year: view.year, month: view.month, day: dayNum })}
              aria-label={
                hasAny
                  ? `${MONTH_LONG[view.month]} ${dayNum}, ${view.year} — ${exCount} ex-date${exCount === 1 ? '' : 's'}, ${payCount} payment${payCount === 1 ? '' : 's'}`
                  : `${MONTH_LONG[view.month]} ${dayNum}, ${view.year} — no events`
              }
            >
              <span className="num">{dayNum}</span>
              {hasAny && (
                <span className="chips">
                  {chips.map((c, idx) => (
                    <span key={idx} className={`chip ${c.kind}`}>{c.ticker}</span>
                  ))}
                  {overflow > 0 && <span className="chip more">+{overflow}</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="cdn-cal-legend">
        <span><i className="dot ex" />Ex-date</span>
        <span><i className="dot pay" />Payment</span>
      </div>

      {selected && (
        <CalendarDayModal
          year={selected.year}
          month={selected.month}
          day={selected.day}
          data={byDay.get(selected.day) ?? { exEvents: [], payEvents: [] }}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function CalendarDayModal({
  year, month, day, data, onClose,
}: {
  year: number; month: number; day: number;
  data: DayCell; onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  const payTotal = data.payEvents.reduce((s, e) => s + e.grossLocal, 0);
  const exTotal = data.exEvents.reduce((s, e) => s + e.grossLocal, 0);

  return createPortal(
    <div
      className="cdn-modal-backdrop"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="cdn-modal" role="dialog" aria-modal="true" aria-labelledby="cdn-cal-modal-title">
        <button type="button" className="cdn-modal-close" onClick={onClose} aria-label="Close">×</button>
        <div className="cdn-modal-h">
          <span id="cdn-cal-modal-title">{MONTH_LONG[month]} {day}, {year}</span>
          {payTotal > 0 && <span className="num">€{fmt(payTotal, 2)}</span>}
        </div>
        <div className="cdn-modal-meta">
          {data.exEvents.length} ex-date{data.exEvents.length === 1 ? '' : 's'} ·
          {' '}{data.payEvents.length} payment{data.payEvents.length === 1 ? '' : 's'}
        </div>
        <div className="cdn-modal-list">
          {data.exEvents.length > 0 && (
            <div className="cdn-cal-section">
              <div className="cdn-cal-section-h">
                <i className="dot ex" />
                <span>Ex-date</span>
                <span className="muted">€{fmt(exTotal, 2)} gross</span>
              </div>
              {data.exEvents.map((e) => (
                <div key={`ex-${e.ticker}-${e.exDate}`} className="cdn-modal-row">
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
          )}
          {data.payEvents.length > 0 && (
            <div className="cdn-cal-section">
              <div className="cdn-cal-section-h">
                <i className="dot pay" />
                <span>Payment</span>
                <span className="muted">€{fmt(payTotal, 2)} gross</span>
              </div>
              {data.payEvents.map((e) => (
                <div key={`pay-${e.ticker}-${e.payDate}`} className="cdn-modal-row">
                  <div className="left">
                    <TickerLogo ticker={e.ticker} size={28} />
                    <div style={{ minWidth: 0 }}>
                      <div className="t">{e.ticker}</div>
                      {e.name && <div className="n">{e.name}</div>}
                    </div>
                  </div>
                  <div className="right">
                    <div className="amt">€{fmt(e.grossLocal, 2)}</div>
                    <div className="proj" style={{ color: 'var(--text-dim)' }}>
                      ex {e.exDate.slice(5).replace('-', '/')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
