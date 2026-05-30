'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './DialogProvider';

type Band = 'standard' | 'higher';

interface Props {
  /** Saved band, or null when unset (page then assumes higher-rate). */
  initialBand: Band | null;
}

const OPTIONS: { value: Band; label: string; hint: string }[] = [
  { value: 'standard', label: 'Standard rate', hint: '20% income tax' },
  { value: 'higher',   label: 'Higher rate',   hint: '40% income tax' },
];

/**
 * Inline picker for the user's Irish income-tax band. IE taxes dividends as
 * ordinary income, so the band drives the residence-tax figure on the Tax page.
 * Unset defaults to higher rate (the page's prior assumption); choosing
 * standard rate corrects the estimate for the large 20%-band population.
 */
export function DividendTaxBandEditor({ initialBand }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [band, setBand] = useState<Band | null>(initialBand);
  const [saving, setSaving] = useState(false);

  async function pick(next: Band) {
    if (next === band) return;
    const previous = band;
    setBand(next);
    setSaving(true);
    const res = await fetch('/api/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ dividend_tax_band: next }),
    });
    setSaving(false);
    if (!res.ok) {
      toast('Could not save your tax band.', 'error');
      setBand(previous);
      return;
    }
    toast(`Saved — ${next === 'standard' ? 'standard (20%)' : 'higher (40%)'} rate.`);
    router.refresh();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        Ireland taxes dividends at your income-tax band. Pick yours for an accurate estimate
        {initialBand == null && <> — defaulting to higher rate until set</>}.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {OPTIONS.map((opt) => {
          const active = band === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => pick(opt.value)}
              disabled={saving}
              style={{
                padding: '10px 12px',
                textAlign: 'left',
                background: active ? 'var(--surface-2)' : 'var(--surface)',
                border: `1px solid ${active ? 'var(--text)' : 'var(--border-strong)'}`,
                borderRadius: 10,
                cursor: saving ? 'wait' : 'pointer',
                color: 'var(--text)',
                transition: 'border-color 120ms, background 120ms',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13 }}>{opt.label}</div>
              <div style={{ marginTop: 2, fontSize: 11.5, color: 'var(--text-muted)' }}>{opt.hint}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
