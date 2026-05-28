'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './DialogProvider';
import { MESSAGES_CHANGED_EVENT } from './useUnreadMessages';

interface NewThreadProps {
  mode: 'new';
}
interface ReplyProps {
  mode: 'reply';
  threadId: string;
}
type Props = NewThreadProps | ReplyProps;

/**
 * Posts a user message to /api/messages — either opening a new thread (with a
 * subject) or replying to an existing one. On success it clears the form,
 * refreshes the route, and pings the nav badge.
 */
export function MessageComposer(props: Props) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const isNew = props.mode === 'new';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !body.trim() || (isNew && !subject.trim())) return;
    setBusy(true);
    try {
      const payload = isNew
        ? { subject: subject.trim(), body: body.trim() }
        : { threadId: props.threadId, body: body.trim() };
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('send_failed');
      const data = (await res.json()) as { threadId: string };
      setSubject('');
      setBody('');
      toast(isNew ? 'Message sent to support.' : 'Reply sent.');
      window.dispatchEvent(new CustomEvent(MESSAGES_CHANGED_EVENT));
      startTransition(() => {
        if (isNew) router.push(`/app/messages/${data.threadId}`);
        else router.refresh();
      });
    } catch {
      toast('Could not send — please retry.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
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
      {isNew && (
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          maxLength={140}
          disabled={busy}
          style={inputStyle}
        />
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={isNew ? 'How can we help?' : 'Write a reply…'}
        rows={isNew ? 4 : 3}
        maxLength={5000}
        disabled={busy}
        style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="submit"
          className="btn"
          disabled={busy || !body.trim() || (isNew && !subject.trim())}
          style={{ opacity: busy ? 0.6 : 1, cursor: busy ? 'wait' : 'pointer' }}
        >
          {busy ? 'Sending…' : isNew ? 'Send message' : 'Send reply'}
        </button>
      </div>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  fontSize: 14,
  color: 'var(--text)',
  background: 'var(--surface-2)',
  border: '1px solid var(--border-strong)',
  borderRadius: 8,
  outline: 'none',
};
