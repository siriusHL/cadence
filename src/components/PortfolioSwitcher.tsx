'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from './DialogProvider';

interface Item { id: string; name: string; }

interface Props {
  items: Item[];
  activeId: string | null;
}

export function PortfolioSwitcher({ items, activeId }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function switchTo(id: string) {
    setOpen(false);
    if (id === activeId) return;
    start(async () => {
      const res = await fetch('/api/portfolios/active', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ portfolioId: id }),
      });
      if (!res.ok) {
        toast('Could not switch portfolio.', 'error');
        return;
      }
      router.refresh();
    });
  }

  const active = items.find((i) => i.id === activeId) ?? items[0];
  if (!active) return null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="portfolio-switcher-trigger"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '5px 12px',
          background: 'var(--surface)',
          border: 'none',
          borderRadius: 999,
          fontSize: 11.5,
          fontWeight: 500,
          color: 'var(--text)',
          cursor: 'pointer',
          maxWidth: 240,
          boxShadow:
            '0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.04)',
        }}
        title={`Switch portfolio · current: ${active.name}`}
        aria-label={`Switch portfolio. Current portfolio: ${active.name}`}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          style={{ color: 'var(--text-dim)', flexShrink: 0 }}
        >
          <path d="M3 7h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
        <span
          style={{
            color: 'var(--text-dim)',
            fontWeight: 500,
            letterSpacing: '0.02em',
          }}
        >
          Portfolio
        </span>
        <span style={{ color: 'var(--border-strong)' }}>·</span>
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 140,
            fontWeight: 500,
          }}
        >
          {active.name}
        </span>
        <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>▾</span>
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            minWidth: 240,
            background: 'var(--surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: 10,
            boxShadow: 'var(--shadow-popover)',
            padding: 4,
            zIndex: 50,
          }}
          role="menu"
          aria-label="Switch portfolio"
        >
          <div
            style={{
              padding: '8px 10px 6px',
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--text-dim)',
            }}
          >
            Switch portfolio
          </div>
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={() => switchTo(it.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '8px 10px',
                background: it.id === activeId ? 'var(--surface-2)' : 'transparent',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                textAlign: 'left',
                cursor: 'pointer',
                color: 'var(--text)',
              }}
            >
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {it.name}
              </span>
              {it.id === activeId && (
                <span style={{ fontSize: 11, color: 'var(--accent)' }}>●</span>
              )}
            </button>
          ))}
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          <Link
            href="/app/portfolios"
            onClick={() => setOpen(false)}
            style={{
              display: 'block',
              padding: '8px 10px',
              fontSize: 13,
              color: 'var(--accent)',
              textDecoration: 'none',
              borderRadius: 6,
            }}
          >
            Manage portfolios →
          </Link>
        </div>
      )}
    </div>
  );
}
