'use client';

import { useEffect, useState } from 'react';
import { CsvImportClient } from './CsvImportClient';

interface Props {
  /** Visual style of the trigger. */
  variant?: 'primary' | 'ghost';
  /** Override the label — defaults to "Import CSV". */
  label?: string;
}

export function ImportCsvButton({ variant = 'ghost', label = 'Import CSV' }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={variant === 'primary' ? btnPrimary : btnGhost}
      >
        ↓ {label}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="csv-import-title"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            padding: '5vh 24px 24px',
            background: 'rgba(20, 20, 22, 0.32)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            animation: 'cdn-fade-in 140ms ease-out',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              width: '100%', maxWidth: 980,
              background: 'var(--bg)',
              borderRadius: 16,
              padding: '24px 26px 26px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.20), 0 4px 14px rgba(0,0,0,0.08)',
              animation: 'cdn-pop-in 160ms cubic-bezier(0.2, 0.8, 0.2, 1.05)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div id="csv-import-title" style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                  Import from broker
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, maxWidth: 640 }}>
                  Drop a transactions CSV from DEGIRO, Interactive Brokers, or Trade Republic.
                  We&apos;ll show every row before anything is saved — duplicates are skipped automatically.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={closeButton}
              >
                ×
              </button>
            </div>

            <CsvImportClient onDone={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  background: 'var(--btn-primary-bg)',
  color: 'var(--btn-primary-text)',
  border: '1px solid var(--btn-primary-bg)',
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
};

const btnGhost: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 12px',
  background: 'var(--surface)',
  color: 'var(--text)',
  border: '1px solid var(--border-strong)',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
};

const closeButton: React.CSSProperties = {
  width: 32, height: 32,
  borderRadius: 999,
  background: 'transparent',
  border: '1px solid var(--border-strong)',
  color: 'var(--text-muted)',
  fontSize: 20,
  lineHeight: 1,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
