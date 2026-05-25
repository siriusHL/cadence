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
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          background: '#fff',
          border: '1px solid #d2d2d7',
          borderRadius: 8,
          fontSize: 12,
          color: '#1d1d1f',
          cursor: 'pointer',
          maxWidth: 200,
        }}
        title={active.name}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
          {active.name}
        </span>
        <span style={{ color: '#86868b', fontSize: 10 }}>▾</span>
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            minWidth: 220,
            background: '#fff',
            border: '1px solid #d2d2d7',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            padding: 4,
            zIndex: 50,
          }}
        >
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
                background: it.id === activeId ? '#f5f5f7' : 'transparent',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                textAlign: 'left',
                cursor: 'pointer',
                color: '#1d1d1f',
              }}
            >
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {it.name}
              </span>
              {it.id === activeId && (
                <span style={{ fontSize: 11, color: '#0070f3' }}>●</span>
              )}
            </button>
          ))}
          <div style={{ height: 1, background: '#ececec', margin: '4px 0' }} />
          <Link
            href="/app/portfolios"
            onClick={() => setOpen(false)}
            style={{
              display: 'block',
              padding: '8px 10px',
              fontSize: 13,
              color: '#0070f3',
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
