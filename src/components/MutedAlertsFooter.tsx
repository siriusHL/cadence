'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './DialogProvider';
import type { AlertSuppression } from '@/lib/alerts';

const KIND_LABEL: Record<string, string> = {
  ex_date_soon:           'Upcoming ex-dates',
  payment_today:          'Payment-today',
  dividend_cut:           'Dividend cuts',
  dividend_raise:         'Dividend raises',
  concentration_position: 'Position concentration',
  concentration_hhi:      'Portfolio HHI',
  reclaim_threshold:      'Reclaimable WTH',
  drawdown:               'Drawdown',
};

/**
 * Turns a selector back into a short label for the chip.
 *   kind:drawdown                              → "Drawdown"
 *   kind_ticker:concentration_position:AAPL    → "Position concentration · AAPL"
 */
function labelFor(selector: string): string {
  if (selector.startsWith('kind_ticker:')) {
    const [, kind, ticker] = selector.split(':');
    return `${KIND_LABEL[kind] ?? kind} · ${ticker}`;
  }
  if (selector.startsWith('kind:')) {
    const kind = selector.slice('kind:'.length);
    return KIND_LABEL[kind] ?? kind;
  }
  return selector;
}

interface Props {
  mutes: AlertSuppression[];
}

export function MutedAlertsFooter({ mutes }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  const visible = mutes.filter((m) => !removed.has(m.selector));
  if (visible.length === 0) return null;

  async function unmute(selector: string) {
    if (busy) return;
    setBusy(selector);
    const optimistic = new Set(removed);
    optimistic.add(selector);
    setRemoved(optimistic);
    try {
      const res = await fetch('/api/alerts/suppressions', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ selector }),
      });
      if (!res.ok) throw new Error('unmute_failed');
      toast('Mute removed.');
      startTransition(() => router.refresh());
    } catch {
      toast('Could not un-mute — please retry.', 'error');
      const rollback = new Set(removed);
      rollback.delete(selector);
      setRemoved(rollback);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      style={{
        marginTop: 12,
        padding: '12px 14px',
        background: 'var(--surface-2)',
        borderRadius: 10,
        fontSize: 11.5,
        color: 'var(--text-muted)',
      }}
    >
      <div style={{ marginBottom: 6, fontWeight: 600, color: 'var(--text)' }}>Muted</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {visible.map((m) => (
          <span
            key={m.selector}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '3px 4px 3px 10px',
              background: 'var(--surface)',
              border: '1px solid var(--border-strong)',
              borderRadius: 999,
              fontSize: 11.5,
              color: 'var(--text)',
            }}
          >
            {labelFor(m.selector)}
            <button
              type="button"
              aria-label={`Un-mute ${labelFor(m.selector)}`}
              title="Un-mute"
              disabled={busy === m.selector}
              onClick={() => unmute(m.selector)}
              style={{
                width: 18, height: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent',
                border: 'none', borderRadius: '50%',
                color: 'var(--text-muted)',
                cursor: busy === m.selector ? 'wait' : 'pointer',
                fontSize: 12, lineHeight: 1,
              }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
