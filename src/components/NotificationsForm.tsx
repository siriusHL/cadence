'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './DialogProvider';
import type { NotificationPrefs } from '@/lib/alerts';

type EmailFrequency = 'off' | 'daily' | 'weekly';

interface Props {
  initial: NotificationPrefs & { email_frequency: EmailFrequency };
}

const CATEGORIES: { key: keyof NotificationPrefs; label: string; hint: string }[] = [
  {
    key:   'dividend_events',
    label: 'Dividend events',
    hint:  'Upcoming ex-dates, payments landing today, cuts and raises on held tickers.',
  },
  {
    key:   'concentration',
    label: 'Concentration risk',
    hint:  'Single positions over 10% of portfolio, or an HHI above moderately-concentrated.',
  },
  {
    key:   'tax_opportunities',
    label: 'Tax opportunities',
    hint:  'Reclaimable foreign withholding tax above the threshold worth filing for.',
  },
  {
    key:   'drawdown',
    label: 'Drawdown alerts',
    hint:  'Portfolio drawdown breaches over the last 52 weeks.',
  },
];

const FREQUENCY_OPTIONS: { value: EmailFrequency; label: string }[] = [
  { value: 'off',    label: 'Off — in-app only' },
  { value: 'daily',  label: 'Daily digest' },
  { value: 'weekly', label: 'Weekly digest' },
];

export function NotificationsForm({ initial }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    dividend_events:   initial.dividend_events,
    concentration:     initial.concentration,
    tax_opportunities: initial.tax_opportunities,
    drawdown:          initial.drawdown,
  });
  const [frequency, setFrequency] = useState<EmailFrequency>(initial.email_frequency);

  function toggleCategory(key: keyof NotificationPrefs) {
    const next = !prefs[key];
    const previous = prefs[key];
    setPrefs((p) => ({ ...p, [key]: next }));
    start(async () => {
      const res = await fetch('/api/me', {
        method:  'PATCH',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ [`notify_${key}`]: next }),
      });
      if (!res.ok) {
        toast(`Couldn't save preference.`, 'error');
        setPrefs((p) => ({ ...p, [key]: previous }));
        return;
      }
      router.refresh();
    });
  }

  function pickFrequency(next: EmailFrequency) {
    const previous = frequency;
    setFrequency(next);
    start(async () => {
      const res = await fetch('/api/me', {
        method:  'PATCH',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ notify_email_frequency: next }),
      });
      if (!res.ok) {
        toast(`Couldn't save frequency.`, 'error');
        setFrequency(previous);
        return;
      }
      toast('Email frequency updated.');
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 4 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {CATEGORIES.map((c) => (
          <ToggleRow
            key={c.key}
            label={c.label}
            hint={c.hint}
            checked={prefs[c.key]}
            disabled={pending}
            onToggle={() => toggleCategory(c.key)}
          />
        ))}
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Label>Email digest</Label>
        <select
          value={frequency}
          onChange={(e) => pickFrequency(e.target.value as EmailFrequency)}
          disabled={pending}
          style={{
            height: 36,
            padding: '0 12px',
            fontSize: 14,
            border: '1px solid var(--border-strong)',
            borderRadius: 8,
            background: 'var(--surface)',
            color: 'var(--text)',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        >
          {FREQUENCY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <div style={{ fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.45 }}>
          Toggles take effect immediately on the in-app Alerts screen and the
          nav badge. Email digests will start arriving once that mailer is live.
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label, hint, checked, disabled, onToggle,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      style={{
        display:    'flex',
        alignItems: 'flex-start',
        gap:        12,
        padding:    '10px 0',
        background: 'transparent',
        border:     0,
        textAlign:  'left',
        cursor:     disabled ? 'default' : 'pointer',
        opacity:    disabled ? 0.7 : 1,
      }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
          {label}
        </span>
        <span style={{ display: 'block', marginTop: 2, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.45 }}>
          {hint}
        </span>
      </span>
      <Switch on={checked} />
    </button>
  );
}

function Switch({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        width:        36,
        height:       20,
        borderRadius: 999,
        background:   on ? 'var(--btn-primary-bg)' : 'var(--surface-2)',
        border:       '1px solid var(--border-strong)',
        position:     'relative',
        flexShrink:   0,
        transition:   'background 120ms',
        marginTop:    2,
      }}
    >
      <span
        style={{
          position:     'absolute',
          top:          1,
          left:         on ? 17 : 1,
          width:        16,
          height:       16,
          borderRadius: '50%',
          background:   '#fff',
          boxShadow:    '0 1px 2px rgba(0,0,0,.18)',
          transition:   'left 140ms',
        }}
      />
    </span>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}
    >
      {children}
    </div>
  );
}
