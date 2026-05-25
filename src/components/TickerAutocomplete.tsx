'use client';

import { useEffect, useRef, useState } from 'react';
import { TickerLogo } from '@/components/TickerLogo';

export interface TickerHit {
  ticker: string;
  name: string;
  exchange: string | null;
  country: string | null;
  currency: string | null;
  type: string | null;
  logoUrl: string;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSelect: (hit: TickerHit) => void;
  placeholder?: string;
}

export function TickerAutocomplete({ value, onChange, onSelect, placeholder }: Props) {
  const [hits, setHits] = useState<TickerHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const abortRef = useRef<AbortController | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Debounced fetch
  useEffect(() => {
    const q = value.trim();
    if (q.length < 1) {
      setHits([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/instruments/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`search ${res.status}`);
        const j = await res.json();
        setHits(j.data ?? []);
        setOpen(true);
        setActiveIdx(j.data?.length ? 0 : -1);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setHits([]);
        }
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [value]);

  // Click-outside to close
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, []);

  function pick(h: TickerHit) {
    onSelect(h);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || hits.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, hits.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter')   { e.preventDefault(); if (hits[activeIdx]) pick(hits[activeIdx]); }
    else if (e.key === 'Escape')  { setOpen(false); }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        required
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        onFocus={() => { if (hits.length > 0) setOpen(true); }}
        onKeyDown={onKeyDown}
        placeholder={placeholder ?? 'JNJ'}
        autoComplete="off"
        style={inputStyle}
      />
      {loading && (
        <div style={{ position: 'absolute', right: 12, top: 12, fontSize: 11, color: 'var(--text-dim)' }}>
          searching…
        </div>
      )}
      {open && hits.length > 0 && (
        <div style={dropdownStyle}>
          {hits.map((h, i) => (
            <button
              type="button"
              key={`${h.ticker}-${h.exchange ?? i}`}
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => pick(h)}
              style={{
                ...rowStyle,
                background: i === activeIdx ? 'rgba(0,0,0,0.04)' : 'transparent',
              }}
            >
              <TickerLogo ticker={h.ticker} size={28} />
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {h.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  {h.exchange ?? '—'}{h.country ? ` · ${h.country}` : ''}{h.currency ? ` · ${h.currency}` : ''}
                </div>
              </div>
              <div style={{
                fontFamily: 'var(--font-jetbrains, ui-monospace)',
                fontSize: 12, fontWeight: 600, color: 'var(--text)',
                background: 'var(--surface-2)', padding: '3px 8px', borderRadius: 6,
              }}>
                {h.ticker}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
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

const dropdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 4px)',
  left: 0,
  right: 0,
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  boxShadow: '0 4px 18px rgba(0,0,0,0.08)',
  padding: 4,
  zIndex: 20,
  maxHeight: 320,
  overflowY: 'auto',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  width: '100%',
  padding: '8px 10px',
  border: 0,
  borderRadius: 8,
  cursor: 'pointer',
  background: 'transparent',
};

