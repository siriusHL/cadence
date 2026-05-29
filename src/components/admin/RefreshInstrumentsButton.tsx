'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RefreshInstrumentsButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/jobs/refresh', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ batch: 8 }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(j.error ?? res.statusText);
        return;
      }
      setMsg(
        `Refreshed ${j.attempted ?? 0} ticker(s).` +
          (j.fmpBreakerOpen ? ' FMP quota exhausted — some data may be stale.' : ''),
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adm-row">
      <button type="button" className="adm-btn" onClick={refresh} disabled={busy}>
        {busy ? 'Refreshing…' : 'Refresh stalest 8'}
      </button>
      {msg && <span className="adm-muted">{msg}</span>}
    </div>
  );
}
