'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { useToast } from './DialogProvider';

interface Props {
  currentEmail: string;
  /** Address Supabase has a pending confirmation for, if any. */
  pendingEmail: string | null;
}

export function SecurityForm({ currentEmail, pendingEmail }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();

  const [newEmail, setNewEmail]               = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail || newEmail === currentEmail) {
      toast('Enter a different email.', 'error');
      return;
    }
    start(async () => {
      const res = await fetch('/api/me/email', {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ email: newEmail }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast(`Couldn't request change: ${j.error ?? res.statusText}`, 'error');
        return;
      }
      toast(`Confirmation sent to ${newEmail}. Click the link to finish the change.`);
      setNewEmail('');
      router.refresh();
    });
  }

  function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast('New password must be at least 8 characters.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast('New passwords do not match.', 'error');
      return;
    }
    start(async () => {
      // Re-auth with the current password to make sure the caller is the
      // session owner before we let updateUser change credentials.
      const supabase = supabaseBrowser();
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email:    currentEmail,
        password: currentPassword,
      });
      if (reauthError) {
        toast('Current password is incorrect.', 'error');
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast(`Couldn't change password: ${error.message}`, 'error');
        return;
      }
      toast('Password updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: 4 }}>
      {/* Email */}
      <form onSubmit={submitEmail} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Label>Email address</Label>
        <div style={{ fontSize: 13, color: 'var(--text)' }}>{currentEmail}</div>
        {pendingEmail && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              padding: '8px 10px',
              background: 'var(--surface-2)',
              borderRadius: 8,
              lineHeight: 1.5,
            }}
          >
            Confirmation pending for <b style={{ color: 'var(--text)' }}>{pendingEmail}</b> —
            check that inbox to finish the change.
          </div>
        )}
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="New email"
          autoComplete="email"
          style={inputStyle}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" disabled={pending || !newEmail} className="btn" style={primaryBtn(pending)}>
            {pending ? 'Sending…' : 'Send confirmation'}
          </button>
        </div>
        <div style={helpStyle}>
          We&rsquo;ll send a confirmation link to the new address. Your current
          email stays active until you click it.
        </div>
      </form>

      <div style={{ height: 1, background: 'var(--border)' }} />

      {/* Password */}
      <form onSubmit={submitPassword} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Label>Password</Label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Current password"
          autoComplete="current-password"
          style={inputStyle}
        />
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New password (min. 8 characters)"
          autoComplete="new-password"
          minLength={8}
          style={inputStyle}
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          autoComplete="new-password"
          minLength={8}
          style={inputStyle}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={pending || !currentPassword || !newPassword || !confirmPassword}
            className="btn"
            style={primaryBtn(pending)}
          >
            {pending ? 'Updating…' : 'Change password'}
          </button>
        </div>
      </form>
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

const inputStyle: React.CSSProperties = {
  height: 36,
  padding: '0 12px',
  fontSize: 14,
  border: '1px solid var(--border-strong)',
  borderRadius: 8,
  background: 'var(--surface)',
  color: 'var(--text)',
  outline: 'none',
  fontFamily: 'inherit',
};

const helpStyle: React.CSSProperties = {
  fontSize: 11.5,
  color: 'var(--text-dim)',
  lineHeight: 1.45,
};

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    height: 36,
    padding: '0 18px',
    background: 'var(--btn-primary-bg)',
    color: 'var(--btn-primary-text)',
    borderRadius: 999,
    fontSize: 14,
    fontWeight: 500,
    border: 0,
    cursor: 'pointer',
    opacity: disabled ? 0.6 : 1,
  };
}
