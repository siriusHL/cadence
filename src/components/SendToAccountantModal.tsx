'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from './DialogProvider';

interface Props {
  /** Pre-filled recipient from the user's settings ('' when unset). */
  accountantEmail: string;
  defaultSubject: string;
  defaultBody: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FIELD_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: 'var(--input-bg)',
  border: '1px solid var(--border-strong)',
  borderRadius: 8,
  fontSize: 14,
  color: 'var(--text)',
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 6,
};

export function SendToAccountantModal({ accountantEmail, defaultSubject, defaultBody }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="pro-btn pro-btn-primary" onClick={() => setOpen(true)}>
        Send to accountant
      </button>
      {open && (
        <PreviewModal
          accountantEmail={accountantEmail}
          defaultSubject={defaultSubject}
          defaultBody={defaultBody}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function PreviewModal({
  accountantEmail,
  defaultSubject,
  defaultBody,
  onClose,
}: Props & { onClose: () => void }) {
  const toast = useToast();
  const [to, setTo] = useState(accountantEmail);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  async function send() {
    const recipient = to.trim();
    if (!EMAIL_RE.test(recipient)) {
      toast('Enter a valid recipient email.', 'error');
      return;
    }
    if (subject.trim() === '' || body.trim() === '') {
      toast("Subject and message can't be empty.", 'error');
      return;
    }
    setPending(true);
    const res = await fetch('/api/tax/send-to-accountant', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ to: recipient, subject: subject.trim(), body }),
    });
    setPending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast(
        data?.error === 'email_unavailable'
          ? "Email isn't configured yet. Try again later."
          : 'Could not send the email.',
        'error',
      );
      return;
    }
    toast('Sent to your accountant.');
    onClose();
  }

  return createPortal(
    <div
      className="cdn-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="cdn-modal" role="dialog" aria-modal="true" aria-label="Send tax summary to accountant">
        <button className="cdn-modal-close" onClick={onClose} aria-label="Close">×</button>
        <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 18 }}>Send to accountant</h2>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Review and edit the email before it goes out.
          </div>
        </div>

        <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={LABEL_STYLE}>To</div>
            <input
              type="email"
              inputMode="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="accountant@example.com"
              autoFocus={accountantEmail === ''}
              style={FIELD_STYLE}
            />
            {accountantEmail === '' && (
              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                Tip: set a default accountant email in Settings so this is pre-filled next time.
              </div>
            )}
          </div>

          <div>
            <div style={LABEL_STYLE}>Subject</div>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={FIELD_STYLE}
            />
          </div>

          <div>
            <div style={LABEL_STYLE}>Message</div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              style={{ ...FIELD_STYLE, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
            />
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid var(--border)',
            padding: '12px 22px',
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
          }}
        >
          <button className="pro-btn" onClick={onClose} disabled={pending}>Cancel</button>
          <button className="pro-btn pro-btn-primary" onClick={send} disabled={pending}>
            {pending ? 'Sending…' : 'Send email'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
