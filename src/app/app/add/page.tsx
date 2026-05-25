'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TickerAutocomplete, type TickerHit } from '@/components/TickerAutocomplete';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'CAD', 'JPY', 'DKK', 'SEK', 'NOK'];

interface Lot {
  quantity: string;
  price: string;
  date: string;
  fee: string;
  /** Was this price auto-filled? Tracks so we don't clobber manual edits. */
  priceAutoFilled?: boolean;
  /** Source we autofilled from — shown as a hint. */
  priceSource?: 'live' | 'historical';
}

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function AddHoldingPage() {
  const router = useRouter();

  const [ticker, setTicker] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [lots, setLots] = useState<Lot[]>([
    { quantity: '', price: '', date: todayStr(), fee: '0' },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingByLot, setLoadingByLot] = useState<Record<number, boolean>>({});

  // Tracks the (ticker|date) we last attempted per lot index, so re-renders
  // don't re-trigger identical fetches.
  const lastFetchKeyRef = useRef<Record<number, string>>({});

  function setLot(i: number, patch: Partial<Lot>) {
    setLots((cur) => cur.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLot() {
    setLots((cur) => [...cur, { quantity: '', price: '', date: todayStr(), fee: '0' }]);
  }
  function removeLot(i: number) {
    setLots((cur) => (cur.length <= 1 ? cur : cur.filter((_, idx) => idx !== i)));
    delete lastFetchKeyRef.current[i];
  }

  /**
   * Fetch the right price for (ticker, date):
   *   - today  → /quote (live)
   *   - past   → /price-on?date= (historical EOD, cached forever once fetched)
   * Only writes back if the lot's price is empty or was previously auto-filled.
   */
  async function autofillForLot(lotIndex: number, sym: string, date: string) {
    const isToday = date === todayStr();
    setLoadingByLot((m) => ({ ...m, [lotIndex]: true }));
    try {
      const url = isToday
        ? `/api/instruments/${encodeURIComponent(sym)}/quote`
        : `/api/instruments/${encodeURIComponent(sym)}/price-on?date=${date}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const j = await res.json();
      const px = isToday ? j?.data?.price : j?.data?.close;
      if (px == null) return;
      const trimmed = String(Number(px).toFixed(4).replace(/\.?0+$/, ''));

      // Guard against overwriting a manual edit that landed between fetch start and now.
      setLots((cur) => cur.map((l, idx) => {
        if (idx !== lotIndex) return l;
        const isOverwritable = !l.price || l.priceAutoFilled;
        if (!isOverwritable) return l;
        return { ...l, price: trimmed, priceAutoFilled: true, priceSource: isToday ? 'live' : 'historical' };
      }));
    } catch {
      /* silently leave price empty — user can type */
    } finally {
      setLoadingByLot((m) => {
        const { [lotIndex]: _omit, ...rest } = m;
        return rest;
      });
    }
  }

  // Debounced: whenever ticker or any lot's date changes, refresh prices that
  // should be auto-filled. Per-(idx, ticker, date) dedupe via ref.
  useEffect(() => {
    if (!ticker) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    lots.forEach((lot, i) => {
      const key = `${ticker}|${lot.date}`;
      if (lastFetchKeyRef.current[i] === key) return;       // already fetched this combo
      const isOverwritable = !lot.price || lot.priceAutoFilled;
      if (!isOverwritable) {
        lastFetchKeyRef.current[i] = key;                   // user typed manually — record it
        return;
      }
      timers.push(setTimeout(() => {
        lastFetchKeyRef.current[i] = key;
        autofillForLot(i, ticker, lot.date);
      }, 350));
    });
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, lots.map((l) => l.date).join('|'), lots.length]);

  // When user picks a ticker from the autocomplete, clear the dedupe map so all
  // lots refresh for the new symbol.
  function onPickTicker(hit: TickerHit) {
    lastFetchKeyRef.current = {};
    setTicker(hit.ticker);
    if (hit.currency && CURRENCIES.includes(hit.currency)) setCurrency(hit.currency);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!ticker) { setError('Pick a ticker first.'); return; }
    if (lots.some((l) => !l.quantity || Number(l.quantity) <= 0)) {
      setError('Each lot needs a positive share count.');
      return;
    }
    if (lots.some((l) => !l.price)) {
      setError('Each lot needs a price.');
      return;
    }

    setBusy(true);
    const res = await fetch('/api/holdings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ticker,
        currency,
        lots: lots.map((l) => ({
          quantity:    l.quantity,
          price_local: l.price,
          occurred_on: l.date,
          fee_local:   l.fee || '0',
        })),
      }),
    });
    setBusy(false);

    if (res.status === 402) {
      const j = await res.json().catch(() => ({}));
      setError(
        j.reason === 'holding_cap_reached'
          ? "You've reached the Free tier limit of 10 holdings. Upgrade to add more."
          : "You've hit a Free tier limit. Upgrade to continue.",
      );
      return;
    }
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'Could not add holding');
      return;
    }
    router.push('/app/stocks');
    router.refresh();
  }

  const totalShares = lots.reduce((s, l) => s + (Number(l.quantity) || 0), 0);
  const totalCost = lots.reduce(
    (s, l) => s + (Number(l.quantity) || 0) * (Number(l.price) || 0) + (Number(l.fee) || 0),
    0,
  );
  const avgCost = totalShares > 0 ? totalCost / totalShares : 0;
  const curSym = symbolFor(currency);

  return (
    <div style={{ maxWidth: 640, margin: '32px auto' }}>
      <div style={{ marginBottom: 18 }}>
        <Link href="/app/home" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>
          ← Back
        </Link>
      </div>
      <div className="card" style={{ padding: '28px 30px' }}>
        <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>
          Add a holding
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>
          Tell Cadence what you bought. Add multiple lots if you bought at different prices or on different days.
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
            <Field label="Ticker symbol" hint="Start typing — e.g. Johnson, KO, ASML">
              <TickerAutocomplete
                value={ticker}
                onChange={setTicker}
                onSelect={onPickTicker}
              />
            </Field>
            <Field label="Currency">
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={inputStyle}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>

          <div style={{ marginTop: 6, marginBottom: 2, fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>
            Buy lots
          </div>

          {lots.map((lot, i) => (
            <LotRow
              key={i}
              index={i}
              lot={lot}
              canRemove={lots.length > 1}
              loading={!!loadingByLot[i]}
              onChange={(patch) => setLot(i, patch)}
              onRemove={() => removeLot(i)}
            />
          ))}

          <button
            type="button"
            onClick={addLot}
            style={{
              alignSelf: 'flex-start',
              background: 'transparent',
              border: '1px dashed rgba(0,0,0,0.18)',
              borderRadius: 10,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text)',
              cursor: 'pointer',
              marginTop: 2,
            }}
          >
            + Add another lot
          </button>

          {totalShares > 0 && (
            <div style={{
              marginTop: 10,
              padding: '12px 14px',
              borderRadius: 10,
              background: 'var(--surface-2)',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 13,
            }}>
              <span style={{ color: 'var(--text-muted)' }}>
                {totalShares} share{totalShares === 1 ? '' : 's'} · avg cost {curSym}{avgCost.toFixed(2)}
              </span>
              <span style={{ fontWeight: 500 }}>
                Total cost {curSym}{totalCost.toFixed(2)}
              </span>
            </div>
          )}

          {error && (
            <div style={{
              fontSize: 13, color: 'oklch(0.50 0.16 25)',
              padding: '10px 12px',
              background: 'oklch(0.97 0.02 25)', borderRadius: 10,
            }}>
              {error}
              {error.includes('Upgrade') && (
                <> <Link href="/upgrade" style={{ color: 'oklch(0.50 0.16 25)', textDecoration: 'underline' }}>See plans</Link></>
              )}
            </div>
          )}

          <button type="submit" disabled={busy} className="btn" style={{ marginTop: 6, alignSelf: 'flex-start' }}>
            {busy ? 'Adding…' : `Add ${lots.length === 1 ? 'holding' : `${lots.length} lots`}`}
          </button>
        </form>
      </div>
    </div>
  );
}

interface LotRowProps {
  index: number;
  lot: Lot;
  canRemove: boolean;
  loading: boolean;
  onChange: (patch: Partial<Lot>) => void;
  onRemove: () => void;
}

function LotRow({ index, lot, canRemove, loading, onChange, onRemove }: LotRowProps) {
  const priceHint = loading
    ? 'Fetching price…'
    : lot.priceAutoFilled
      ? (lot.priceSource === 'historical' ? `Closing price on ${lot.date}` : 'Live price')
      : undefined;

  return (
    <div style={{
      padding: '12px 14px',
      border: '1px solid var(--border)',
      borderRadius: 12,
      background: 'var(--surface)',
      position: 'relative',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 10,
      }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-dim)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Lot {index + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove lot"
            style={{
              background: 'transparent', border: 0, cursor: 'pointer',
              fontSize: 18, color: 'var(--text-dim)', lineHeight: 1, padding: 0,
            }}
          >
            ×
          </button>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 0.7fr', gap: 10 }}>
        <Field label="Shares">
          <input
            required type="number" min="0" step="any"
            value={lot.quantity}
            onChange={(e) => onChange({ quantity: e.target.value })}
            placeholder="100"
            style={inputStyle}
          />
        </Field>
        <Field label="Price" hint={priceHint}>
          <div style={{ position: 'relative' }}>
            <input
              required type="number" min="0" step="any"
              value={lot.price}
              onChange={(e) => onChange({
                price: e.target.value,
                priceAutoFilled: false,
                priceSource: undefined,
              })}
              placeholder="48.35"
              style={inputStyle}
            />
            {loading && (
              <div style={{ position: 'absolute', right: 10, top: 12, fontSize: 11, color: 'var(--text-dim)' }}>…</div>
            )}
          </div>
        </Field>
        <Field label="Date">
          <input
            required type="date" max={todayStr()}
            value={lot.date}
            onChange={(e) => onChange({ date: e.target.value })}
            style={inputStyle}
          />
        </Field>
        <Field label="Fee">
          <input
            type="number" min="0" step="any"
            value={lot.fee}
            onChange={(e) => onChange({ fee: e.target.value })}
            style={inputStyle}
          />
        </Field>
      </div>
    </div>
  );
}

function symbolFor(ccy: string): string {
  switch (ccy) {
    case 'EUR': return '€';
    case 'USD': return '$';
    case 'GBP': return '£';
    case 'JPY': return '¥';
    case 'CHF': return 'CHF ';
    case 'CAD': return 'C$';
    default: return '';
  }
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 40,
  padding: '0 12px',
  border: '1px solid var(--border-strong)',
  borderRadius: 10,
  background: 'var(--surface)',
  fontFamily: 'inherit',
  fontSize: 14,
  outline: 'none',
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{hint}</span>}
    </label>
  );
}
