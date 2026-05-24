'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useConfirm, useToast } from './DialogProvider';

interface Props {
  ticker: string;
  name: string | null;
}

export function StockCardMenu({ ticker, name }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  async function onDelete() {
    setOpen(false);
    const ok = await confirm({
      title: `Remove ${name ?? ticker}?`,
      body: `This deletes ${ticker} and all its transactions from your portfolio. This can't be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/holdings/${encodeURIComponent(ticker)}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast(`Could not delete: ${j.error ?? res.statusText}`, 'error');
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function onEdit() {
    setOpen(false);
    router.push(`/app/stocks/${encodeURIComponent(ticker)}/edit`);
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        aria-label="More"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        style={{
          width: 28, height: 28, borderRadius: 8,
          border: 0, background: open ? 'rgba(0,0,0,0.06)' : 'transparent',
          color: '#6e6e73', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, lineHeight: 1, padding: 0,
          transition: 'background 120ms',
        }}
      >
        ⋯
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            background: '#fff',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 10,
            boxShadow: '0 4px 18px rgba(0,0,0,0.08)',
            padding: 4,
            minWidth: 140,
            zIndex: 20,
          }}
        >
          <MenuItem onClick={onEdit}>Edit</MenuItem>
          <MenuItem onClick={onDelete} destructive>Delete</MenuItem>
        </div>
      )}
    </div>
  );
}

function MenuItem({ children, onClick, destructive }: { children: React.ReactNode; onClick: () => void; destructive?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%', textAlign: 'left',
        padding: '8px 12px',
        border: 0, background: 'transparent',
        borderRadius: 6,
        fontSize: 13, fontWeight: 500,
        color: destructive ? 'oklch(0.50 0.16 25)' : '#1d1d1f',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = destructive ? 'oklch(0.96 0.03 25)' : 'rgba(0,0,0,0.04)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}
