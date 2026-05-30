'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { InsightsStatus } from '@/lib/insights';

interface Props {
  id: string;
  status: InsightsStatus;
}

// Publish / unpublish a single article. Publishing is the admin validation
// gate; unpublishing sends it back to draft (hidden from the public again).
export function InsightsModerationActions({ id, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function setStatus(next: InsightsStatus) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/insights/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error ?? res.statusText);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const published = status === 'published';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {published ? (
        <button
          type="button"
          className="adm-btn ghost"
          data-action="unpublish"
          onClick={() => setStatus('draft')}
          disabled={busy}
        >
          {busy ? '…' : 'Unpublish'}
        </button>
      ) : (
        <button
          type="button"
          className="adm-btn"
          data-action="publish"
          onClick={() => setStatus('published')}
          disabled={busy}
        >
          {busy ? 'Publishing…' : 'Publish'}
        </button>
      )}
      {err && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{err}</span>}
    </span>
  );
}
