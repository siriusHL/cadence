'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './DialogProvider';

interface Props {
  fiscalYear: number;
  /** Saved 1-Jan value for this year, or null when unset. */
  initialValue: number | null;
  /** Today's holdings value — offered as a one-click starting point. */
  approxValue: number;
}

/**
 * Inline editor for the NL Box 3 "portfolio value on 1 January" input. The Box 3
 * tax is computed on this date-specific figure (not today's holdings), so the
 * page can't derive it — the user records it here, per year. Saving refreshes
 * the server component so the tax breakdown recomputes with the real number.
 */
export function Box3ValueEditor({ fiscalYear, initialValue, approxValue }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [value, setValue] = useState<string>(initialValue != null ? String(initialValue) : '');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<boolean>(initialValue == null);

  async function save(next: number | null) {
    setSaving(true);
    const res = await fetch('/api/tax/box3-value', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ year: fiscalYear, value: next }),
    });
    setSaving(false);
    if (!res.ok) {
      toast('Could not save the Box 3 value.', 'error');
      return;
    }
    toast(next == null ? `Cleared the ${fiscalYear} value.` : `Saved your 1 Jan ${fiscalYear} value.`);
    setEditing(false);
    router.refresh();
  }

  function onSave() {
    const n = Number(value);
    if (value.trim() === '' || !Number.isFinite(n) || n < 0) {
      toast('Enter a value of 0 or more.', 'error');
      return;
    }
    save(n);
  }

  // Saved + not editing: compact summary with an edit affordance.
  if (initialValue != null && !editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)' }}>
        <span>
          Portfolio value on 1 Jan {fiscalYear}:{' '}
          <b className="num" style={{ color: 'var(--text)' }}>
            €{initialValue.toLocaleString('en-IE', { maximumFractionDigits: 0 })}
          </b>
        </span>
        <button type="button" onClick={() => setEditing(true)} style={LINK_BTN}>edit</button>
        <button type="button" onClick={() => save(null)} disabled={saving} style={LINK_BTN}>clear</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        Box 3 is charged on your portfolio value on <b>1 January {fiscalYear}</b>, not today&rsquo;s.
        Enter it for an accurate estimate.
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>€</span>
        <input
          type="number"
          min={0}
          step={1000}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="100000"
          disabled={saving}
          style={{
            width: 160, padding: '8px 10px',
            background: 'var(--input-bg)', border: '1px solid var(--border-strong)',
            borderRadius: 8, fontSize: 14, color: 'var(--text)',
          }}
        />
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="btn"
          style={{
            height: 34, padding: '0 14px',
            background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)',
            border: 0, borderRadius: 999, fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {initialValue != null && (
          <button type="button" onClick={() => setEditing(false)} disabled={saving} style={LINK_BTN}>
            cancel
          </button>
        )}
      </div>
      {approxValue > 0 && (
        <button
          type="button"
          onClick={() => setValue(String(Math.round(approxValue)))}
          disabled={saving}
          style={{ ...LINK_BTN, alignSelf: 'flex-start' }}
        >
          Use today&rsquo;s value (€{Math.round(approxValue).toLocaleString('en-IE')}) as a starting point
        </button>
      )}
    </div>
  );
}

const LINK_BTN: React.CSSProperties = {
  background: 'none',
  border: 0,
  padding: 0,
  fontSize: 12,
  color: 'var(--accent, var(--text))',
  textDecoration: 'underline',
  cursor: 'pointer',
};
