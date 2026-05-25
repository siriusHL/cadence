'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './DialogProvider';

interface Props {
  initial: {
    displayName: string;
    baseCurrency: string;
    taxCountry: string;
  };
  taxResidences: { code: string; name: string }[];
}

const CURRENCY_OPTIONS = ['EUR', 'USD', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK'];

export function ProfileForm({ initial, taxResidences }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [baseCurrency, setBaseCurrency] = useState(initial.baseCurrency);
  const [taxCountry, setTaxCountry] = useState(initial.taxCountry);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          display_name:  displayName || null,
          base_currency: baseCurrency,
          tax_country:   taxCountry || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast(`Couldn't save: ${j.error ?? res.statusText}`, 'error');
        return;
      }
      toast('Profile updated.');
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 4 }}
    >
      <Field label="Display name">
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Optional — used in greetings"
          style={inputStyle}
        />
      </Field>

      <Field label="Base currency"
        help="Used to format portfolio totals across the app.">
        <select
          value={baseCurrency}
          onChange={(e) => setBaseCurrency(e.target.value)}
          style={inputStyle}
        >
          {CURRENCY_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </Field>

      <Field label="Tax residence"
        help="Drives the residence-side tax model on the Tax screen — final dividend tax, foreign credit, annual allowances.">
        <select
          value={taxCountry}
          onChange={(e) => setTaxCountry(e.target.value)}
          style={inputStyle}
        >
          <option value="">— not set —</option>
          {taxResidences.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
      </Field>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
        <button
          type="submit"
          disabled={pending}
          className="btn"
          style={{
            height: 36, padding: '0 18px',
            background: '#1d1d1f', color: '#fff',
            borderRadius: 999, fontSize: 14, fontWeight: 500,
            border: 0, cursor: 'pointer',
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: '#1d1d1f' }}>{label}</span>
      {children}
      {help && <span style={{ fontSize: 11.5, color: '#86868b', lineHeight: 1.45 }}>{help}</span>}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  height: 36,
  padding: '0 12px',
  fontSize: 14,
  border: '1px solid rgba(0,0,0,0.12)',
  borderRadius: 8,
  background: '#fff',
  color: '#1d1d1f',
  outline: 'none',
  fontFamily: 'inherit',
};
