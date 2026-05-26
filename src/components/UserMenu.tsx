'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type Tier } from '@/lib/tiers';
import { useToast } from './DialogProvider';

interface Props {
  email: string;
  initials: string;
  tier: Tier;
  /** Avatar button size in px. Default 28 (matches desktop topbar);
   *  the mobile shell renders at 32 to match its other topbar buttons. */
  size?: number;
}

export function UserMenu({ email, initials, tier, size = 28 }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click + Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function onBilling() {
    setOpen(false);
    if (tier === 'free') {
      router.push('/upgrade');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (j.redirect) { router.push(j.redirect); return; }
        toast(`Couldn't open billing portal: ${j.error ?? res.statusText}`, 'error');
        return;
      }
      const { url } = await res.json();
      window.location.href = url;       // full nav — Stripe-hosted page
    } finally {
      setBusy(false);
    }
  }

  const planLabel = tier === 'free' ? 'Free plan'
    : tier === 'premium' ? '✦ Premium'
    : '✦ Elite';

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className="avatar"
        style={{
          width: size, height: size, borderRadius: '50%',
          background: 'linear-gradient(135deg, oklch(0.85 0.06 175), oklch(0.70 0.08 195))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: size >= 32 ? 12 : 11, fontWeight: 600,
          border: 0, cursor: 'pointer', padding: 0,
          boxShadow: open ? '0 0 0 3px rgba(0,0,0,0.06)' : 'none',
          transition: 'box-shadow 120ms ease, transform 120ms ease',
        }}
      >
        {initials}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            minWidth: 240,
            background: 'var(--surface)',
            borderRadius: 12,
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-elev)',
            padding: 4,
            zIndex: 30,
            animation: 'cdn-menu-in 140ms ease-out',
          }}
        >
          {/* Header — email + plan badge */}
          <div style={{ padding: '10px 12px 8px' }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: 'var(--text)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {email}
            </div>
            <div style={{
              marginTop: 2,
              fontSize: 11,
              color: tier === 'free' ? 'var(--text-muted)' : 'var(--text)',
              fontWeight: 500,
            }}>
              {planLabel}
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

          <MenuLink href="/app/profile" onSelect={() => setOpen(false)}>Profile</MenuLink>
          <MenuLink href="/app/portfolios" onSelect={() => setOpen(false)}>Portfolios</MenuLink>
          <MenuButton onClick={onBilling} disabled={busy}>
            {tier === 'free' ? 'Upgrade plan' : 'Billing'}
          </MenuButton>
          <MenuLink href="/app/settings" onSelect={() => setOpen(false)}>Settings</MenuLink>
          <MenuLink href="mailto:feedback@cadence.app?subject=Cadence%20feedback" onSelect={() => setOpen(false)}>
            Send feedback
          </MenuLink>

          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

          {/* Logout — a real <form> so the cookie clear lands before nav */}
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              role="menuitem"
              style={menuItemStyle(true)}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              Log out
            </button>
          </form>

          <style>{`
            @keyframes cdn-menu-in {
              from { opacity: 0; transform: translateY(-4px) scale(0.98); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

// ─── Internals ─────────────────────────────────────────────────────────

function MenuLink({ href, onSelect, children }: { href: string; onSelect: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onSelect}
      style={{ ...menuItemStyle(false), textDecoration: 'none' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </Link>
  );
}

function MenuButton({ onClick, children, disabled }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      style={menuItemStyle(false)}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </button>
  );
}

function menuItemStyle(destructive: boolean): React.CSSProperties {
  return {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '8px 12px',
    border: 0,
    background: 'transparent',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    color: destructive ? 'var(--danger)' : 'var(--text)',
    cursor: 'pointer',
    transition: 'background 100ms',
  };
}
