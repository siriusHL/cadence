'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './DialogProvider';

/**
 * Staff-side reply box for the support board. Posts a support reply (which
 * reopens the thread server-side) and toggles thread status open/closed.
 */
export function SupportReplyComposer({ threadId, closed }: { threadId: string; closed: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !body.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/support/messages/${threadId}/reply`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body: body.trim() }),
      });
      if (!res.ok) throw new Error('send_failed');
      setBody('');
      toast('Reply sent.');
      startTransition(() => router.refresh());
    } catch {
      toast('Could not send — please retry.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: 'open' | 'closed') {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/support/messages/${threadId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('status_failed');
      toast(status === 'closed' ? 'Conversation closed.' : 'Conversation reopened.');
      startTransition(() => router.refresh());
    } catch {
      toast('Could not update status — please retry.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={sendReply}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        background: 'var(--surface)',
        borderRadius: 12,
        padding: 16,
        boxShadow: '0 1px 2px rgba(0,0,0,.03), 0 1px 3px rgba(0,0,0,.02)',
      }}
    >
      {closed && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          This conversation is closed. Sending a reply will reopen it.
        </div>
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a reply to the customer…"
        rows={4}
        maxLength={5000}
        disabled={busy}
        style={{
          width: '100%',
          padding: '9px 12px',
          fontSize: 14,
          color: 'var(--text)',
          background: 'var(--surface-2)',
          border: '1px solid var(--border-strong)',
          borderRadius: 8,
          outline: 'none',
          resize: 'vertical',
          fontFamily: 'inherit',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => setStatus(closed ? 'open' : 'closed')}
          disabled={busy}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            fontSize: 13,
            color: 'var(--text-muted)',
            cursor: busy ? 'wait' : 'pointer',
            textDecoration: 'underline',
          }}
        >
          {closed ? 'Reopen conversation' : 'Close conversation'}
        </button>
        <button
          type="submit"
          className="btn"
          disabled={busy || !body.trim()}
          style={{ opacity: busy ? 0.6 : 1, cursor: busy ? 'wait' : 'pointer' }}
        >
          {busy ? 'Sending…' : 'Send reply'}
        </button>
      </div>
    </form>
  );
}
