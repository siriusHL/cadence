'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { useToast, useConfirm } from './DialogProvider';

export function AccountDangerZone() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const [showDelete, setShowDelete] = useState(false);
  const [password, setPassword] = useState('');

  function onExport() {
    // GETs the export endpoint which returns the JSON with a download
    // disposition; following the link makes the browser save it without
    // navigating away.
    window.location.href = '/api/me/export';
  }

  async function onDeleteRequest() {
    const ok = await confirm({
      title:        'Delete your account?',
      body:         'This permanently removes your portfolios, holdings, transactions, alerts, and profile. Active subscriptions are cancelled. This cannot be undone.',
      confirmLabel: 'Continue',
      cancelLabel:  'Cancel',
      destructive:  true,
    });
    if (ok) setShowDelete(true);
  }

  function submitDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    start(async () => {
      const res = await fetch('/api/me/delete', {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const msg = j.error === 'wrong_password'
          ? 'Password is incorrect.'
          : `Couldn't delete account: ${j.error ?? res.statusText}`;
        toast(msg, 'error');
        return;
      }
      // Belt-and-braces: server already signed us out, but clearing the
      // browser client makes sure no stale token survives in-memory.
      await supabaseBrowser().auth.signOut().catch(() => {});
      router.push('/');
      router.refresh();
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: 4 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Label>Export your data</Label>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Download everything Cadence stores about you — profile, subscription,
          portfolios, holdings, transactions, and alerts — as a single JSON file.
        </div>
        <div>
          <button type="button" onClick={onExport} className="btn ghost" style={ghostBtn}>
            Download JSON
          </button>
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border)' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Label>Delete account</Label>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Permanently removes your account and all associated data. Any active
          subscription is cancelled in the same step.
        </div>

        {!showDelete ? (
          <div>
            <button type="button" onClick={onDeleteRequest} style={dangerBtn(false)}>
              Delete account…
            </button>
          </div>
        ) : (
          <form onSubmit={submitDelete} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Type your current password to confirm"
              autoComplete="current-password"
              autoFocus
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
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => { setShowDelete(false); setPassword(''); }}
                disabled={pending}
                style={ghostBtn}
              >
                Cancel
              </button>
              <button type="submit" disabled={pending || !password} style={dangerBtn(pending || !password)}>
                {pending ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
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

const ghostBtn: React.CSSProperties = {
  height: 36,
  padding: '0 16px',
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
};

function dangerBtn(disabled: boolean): React.CSSProperties {
  return {
    height: 36,
    padding: '0 18px',
    background: 'var(--danger)',
    color: '#fff',
    borderRadius: 999,
    fontSize: 14,
    fontWeight: 500,
    border: 0,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  };
}
