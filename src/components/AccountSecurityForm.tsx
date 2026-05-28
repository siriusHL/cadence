'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast, useConfirm } from './DialogProvider';

const ERROR_COPY: Record<string, string> = {
  wrong_password: 'That password is incorrect.',
  same_email:     'That is already your email address.',
  same_password:  'Pick a password different from your current one.',
  invalid_body:   'Please check the values and try again.',
};

function explain(code: string | undefined, fallback: string) {
  return (code && ERROR_COPY[code]) || fallback;
}

export function AccountSecurityForm({ currentEmail }: { currentEmail: string }) {
  return (
    <>
      <div className="pcard">
        <div className="pcard-h"><div className="t">Email address</div></div>
        <EmailSection currentEmail={currentEmail} />
      </div>

      <div className="pcard">
        <div className="pcard-h"><div className="t">Password</div></div>
        <PasswordSection />
      </div>

      <div
        className="pcard"
        style={{ borderColor: 'color-mix(in oklch, var(--danger) 35%, var(--border))' }}
      >
        <div className="pcard-h"><div className="t" style={{ color: 'var(--danger)' }}>Delete account</div></div>
        <DeleteSection />
      </div>
    </>
  );
}

// ─── Email ───────────────────────────────────────────────────────────────

function EmailSection({ currentEmail }: { currentEmail: string }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await fetch('/api/account/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ new_email: newEmail, current_password: password }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(explain(j.error, j.error ?? res.statusText), 'error');
        return;
      }
      toast(`Confirmation link sent to ${newEmail}. Click it to finish the change.`);
      setNewEmail('');
      setPassword('');
    });
  }

  return (
    <form onSubmit={onSubmit} style={formStyle}>
      <Field label="Current email">
        <input type="email" value={currentEmail} disabled style={{ ...inputStyle, opacity: 0.6 }} />
      </Field>
      <Field label="New email">
        <input
          type="email" required value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          autoComplete="email" style={inputStyle}
        />
      </Field>
      <Field label="Current password" help="Confirm it's you before we change the email.">
        <input
          type="password" required value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password" style={inputStyle}
        />
      </Field>
      <Submit pending={pending} idle="Update email" busy="Sending…" />
    </form>
  );
}

// ─── Password ──────────────────────────────────────────────────────────────

function PasswordSection() {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) {
      toast('New passwords do not match.', 'error');
      return;
    }
    start(async () => {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ current_password: current, new_password: next }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(explain(j.error, j.error ?? res.statusText), 'error');
        return;
      }
      toast('Password updated.');
      setCurrent(''); setNext(''); setConfirm('');
    });
  }

  return (
    <form onSubmit={onSubmit} style={formStyle}>
      <Field label="Current password">
        <input
          type="password" required value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password" style={inputStyle}
        />
      </Field>
      <Field label="New password" help="At least 8 characters.">
        <input
          type="password" required minLength={8} value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password" style={inputStyle}
        />
      </Field>
      <Field label="Confirm new password">
        <input
          type="password" required minLength={8} value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password" style={inputStyle}
        />
      </Field>
      <Submit pending={pending} idle="Update password" busy="Saving…" />
    </form>
  );
}

// ─── Delete (GDPR) ───────────────────────────────────────────────────────

function DeleteSection() {
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [password, setPassword] = useState('');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const ok = await confirm({
        title: 'Delete your account?',
        body: 'This permanently erases your profile, portfolios, holdings, transactions and alerts. This cannot be undone.',
        confirmLabel: 'Delete everything',
        destructive: true,
      });
      if (!ok) return;

      const res = await fetch('/api/account', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ current_password: password }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(explain(j.error, j.error ?? res.statusText), 'error');
        return;
      }
      router.push('/');
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} style={formStyle}>
      <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-muted)', margin: 0 }}>
        Under your right to erasure, deleting your account permanently removes all of your
        data from Cadence. Enter your password to confirm.
      </p>
      <Field label="Current password">
        <input
          type="password" required value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password" style={inputStyle}
        />
      </Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
        <button
          type="submit"
          disabled={pending}
          style={{
            height: 36, padding: '0 18px',
            background: 'var(--danger)', color: '#fff',
            borderRadius: 999, fontSize: 14, fontWeight: 500,
            border: 0, cursor: 'pointer', opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? 'Deleting…' : 'Delete account'}
        </button>
      </div>
    </form>
  );
}

// ─── Shared bits ───────────────────────────────────────────────────────────

function Submit({ pending, idle, busy }: { pending: boolean; idle: string; busy: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
      <button
        type="submit"
        disabled={pending}
        className="btn"
        style={{
          height: 36, padding: '0 18px',
          background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)',
          borderRadius: 999, fontSize: 14, fontWeight: 500,
          border: 0, cursor: 'pointer', opacity: pending ? 0.6 : 1,
        }}
      >
        {pending ? busy : idle}
      </button>
    </div>
  );
}

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{label}</span>
      {children}
      {help && <span style={{ fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.45 }}>{help}</span>}
    </label>
  );
}

const formStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 16, padding: 4,
};

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
