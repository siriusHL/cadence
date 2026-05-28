'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from './DialogProvider';
import { ALERTS_CHANGED_EVENT } from './AlertsBadge';
import type { AlertCard, AlertKind, AlertSeverity, SuppressedAlertCard } from '@/lib/alerts';

const SEVERITY_COLOR: Record<AlertSeverity, string> = {
  negative: 'oklch(0.50 0.16 25)',
  warning:  'oklch(0.55 0.10 75)',
  positive: 'oklch(0.48 0.08 165)',
  info:     'oklch(0.55 0.08 235)',
};

const SEVERITY_ICON: Record<AlertSeverity, string> = {
  negative: '!',
  warning:  '⚠',
  positive: '↑',
  info:     'i',
};

/**
 * Human-readable noun for each alert kind. Used in mute tooltips so the
 * user understands what they're silencing — "Mute drawdown alerts" reads
 * better than "Mute kind:drawdown".
 */
const KIND_LABEL: Record<AlertKind, string> = {
  ex_date_soon:           'upcoming ex-date',
  payment_today:          'payment-today',
  dividend_cut:           'dividend cut',
  dividend_raise:         'dividend raise',
  concentration_position: 'position concentration',
  concentration_hhi:      'portfolio HHI',
  reclaim_threshold:      'reclaimable WTH',
  drawdown:               'drawdown',
};

const SNOOZE_DAYS = 7;

interface ActiveRowProps {
  alert: AlertCard;
  mode?: 'active';
}

interface SuppressedRowProps {
  alert: SuppressedAlertCard;
  mode: 'suppressed';
}

type Props = ActiveRowProps | SuppressedRowProps;

export function AlertRow(props: Props) {
  const { alert } = props;
  // Narrow once: the suppressed prop variant carries `matchedSelector` + `expiresAt`.
  const suppressedAlert = props.mode === 'suppressed' ? props.alert : null;
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const color = SEVERITY_COLOR[alert.severity];

  async function suppress(opts: {
    selector: string;
    snoozeDays?: number;
    successMsg: string;
  }) {
    if (busy) return;
    setBusy(true);
    setHidden(true);
    try {
      const res = await fetch('/api/alerts/suppressions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          selector:   opts.selector,
          snoozeDays: opts.snoozeDays,
        }),
      });
      if (!res.ok) throw new Error('save_failed');
      toast(opts.successMsg);
      window.dispatchEvent(new CustomEvent(ALERTS_CHANGED_EVENT));
      startTransition(() => router.refresh());
    } catch {
      toast('Could not save — please retry.', 'error');
      setHidden(false);
    } finally {
      setBusy(false);
    }
  }

  async function restore(selector: string) {
    if (busy) return;
    setBusy(true);
    setHidden(true);
    try {
      const res = await fetch('/api/alerts/suppressions', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ selector }),
      });
      if (!res.ok) throw new Error('restore_failed');
      toast('Alert restored.');
      window.dispatchEvent(new CustomEvent(ALERTS_CHANGED_EVENT));
      startTransition(() => router.refresh());
    } catch {
      toast('Could not restore — please retry.', 'error');
      setHidden(false);
    } finally {
      setBusy(false);
    }
  }

  if (hidden) return null;

  const isSuppressed = suppressedAlert !== null;
  const kindNoun = KIND_LABEL[alert.kind];

  return (
    <div
      style={{
        display:    'flex',
        alignItems: 'flex-start',
        gap:        14,
        padding:    '14px 18px',
        background: 'var(--surface)',
        borderRadius: 12,
        borderLeft:  `3px solid ${color}`,
        boxShadow:   '0 1px 2px rgba(0,0,0,.03), 0 1px 3px rgba(0,0,0,.02)',
        opacity:     isSuppressed ? 0.6 : 1,
        transition:  'opacity 120ms',
      }}
    >
      <div
        aria-hidden
        style={{
          width: 28, height: 28, borderRadius: '50%',
          background: color, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, flexShrink: 0,
        }}
      >
        {SEVERITY_ICON[alert.severity]}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
            {alert.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {alert.amountEur != null && alert.amountEur > 0 && (
              <span
                className="num"
                style={{ fontSize: 13, fontWeight: 600, color, fontVariantNumeric: 'tabular-nums' }}
              >
                €{alert.amountEur.toFixed(0)}
              </span>
            )}
            {!isSuppressed && (
              <div style={{ display: 'flex', gap: 4 }}>
                <IconButton
                  title={`Snooze for ${SNOOZE_DAYS} days`}
                  disabled={busy}
                  onClick={() => suppress({
                    selector:   `id:${alert.id}`,
                    snoozeDays: SNOOZE_DAYS,
                    successMsg: `Snoozed for ${SNOOZE_DAYS} days.`,
                  })}
                >
                  <SnoozeIcon />
                </IconButton>
                <IconButton
                  title="Dismiss this alert"
                  disabled={busy}
                  onClick={() => suppress({
                    selector:   `id:${alert.id}`,
                    successMsg: 'Alert dismissed.',
                  })}
                >
                  <DismissIcon />
                </IconButton>
                <IconButton
                  title={alert.ticker
                    ? `Mute ${kindNoun} alerts for ${alert.ticker}`
                    : `Mute all ${kindNoun} alerts`}
                  disabled={busy}
                  onClick={() => suppress({
                    selector: alert.ticker
                      ? `kind_ticker:${alert.kind}:${alert.ticker}`
                      : `kind:${alert.kind}`,
                    successMsg: alert.ticker
                      ? `${kindNoun} muted for ${alert.ticker}.`
                      : `${kindNoun} alerts muted.`,
                  })}
                >
                  <MuteIcon />
                </IconButton>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 3, fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {alert.body}
        </div>

        <div
          style={{
            marginTop: 8,
            display: 'flex', alignItems: 'center', gap: 14,
            flexWrap: 'wrap',
          }}
        >
          {alert.action && (
            <Link
              href={alert.action.href}
              style={{ fontSize: 12, fontWeight: 500, color, textDecoration: 'none' }}
            >
              {alert.action.label} →
            </Link>
          )}
          {suppressedAlert && (
            <>
              <span style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
                {suppressedCaption(suppressedAlert)}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => restore(suppressedAlert.matchedSelector)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 6,
                  padding: '2px 8px',
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'var(--text)',
                  cursor: busy ? 'wait' : 'pointer',
                }}
              >
                Restore
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function suppressedCaption(card: SuppressedAlertCard): string {
  if (!card.expiresAt) return 'Dismissed.';
  const days = Math.max(0, Math.ceil((new Date(card.expiresAt).getTime() - Date.now()) / 86_400_000));
  return days === 0 ? 'Snoozed — expires today.' : `Snoozed — back in ${days} day${days === 1 ? '' : 's'}.`;
}

const ICON_PROPS = {
  width: 15,
  height: 15,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** Snooze: a clock with a small "z" to read as "snooze" rather than a plain timer. */
function SnoozeIcon() {
  return (
    <svg {...ICON_PROPS} aria-hidden>
      <circle cx="11" cy="13" r="7" />
      <path d="M11 10v3l2 1.5" />
      <path d="M16 3h4l-4 5h4" strokeWidth={1.4} />
    </svg>
  );
}

/** Dismiss: a plain X. */
function DismissIcon() {
  return (
    <svg {...ICON_PROPS} aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/** Mute: a bell with a slash through it. */
function MuteIcon() {
  return (
    <svg {...ICON_PROPS} aria-hidden>
      <path d="M9 17a3 3 0 0 0 6 0" />
      <path d="M6 8a6 6 0 0 1 9.5-4.5" />
      <path d="M18 12v-1M6 9v3c0 2-1 3-2 5h12" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

function IconButton({
  children, title, onClick, disabled,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 26, height: 26,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent',
        border: '1px solid transparent',
        borderRadius: 6,
        fontSize: 12,
        color: 'var(--text-muted)',
        cursor: disabled ? 'wait' : 'pointer',
        transition: 'background 100ms, border-color 100ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--surface-2)';
        e.currentTarget.style.borderColor = 'var(--border-strong)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.borderColor = 'transparent';
      }}
    >
      {children}
    </button>
  );
}
