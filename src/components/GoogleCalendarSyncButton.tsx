'use client';

import { useState } from 'react';
import { useToast } from './DialogProvider';

interface SyncResult {
  ok?: boolean;
  synced?: number;
  pruned?: number;
  errors?: string[];
  error?: string;
}

export function GoogleCalendarSyncButton() {
  const toast = useToast();
  const [syncing, setSyncing] = useState(false);

  async function sync() {
    setSyncing(true);
    try {
      const r = await fetch('/api/calendar/google/sync', { method: 'POST' });
      const j = await r.json() as SyncResult;
      if (r.status === 409 && j.error === 'not_connected') {
        if (confirm('Connect your Google Calendar to enable syncing?')) {
          window.location.href = '/api/calendar/google/connect';
        }
        return;
      }
      if (!r.ok || !j.ok) {
        toast(j.error ?? `Sync had issues (${j.errors?.length ?? 0}).`, 'error');
        return;
      }
      const parts: string[] = [`Synced ${j.synced ?? 0} to Google Calendar`];
      if (j.pruned) parts.push(`pruned ${j.pruned}`);
      toast(parts.join(', ') + '.');
    } catch {
      toast('Sync failed.', 'error');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <button
      type="button"
      onClick={sync}
      disabled={syncing}
      title="Push upcoming dividends to your Google Calendar"
      style={{
        padding: '8px 12px',
        background: 'var(--surface)',
        color: 'var(--text)',
        border: '1px solid var(--border-strong)',
        borderRadius: 8,
        cursor: syncing ? 'wait' : 'pointer',
        fontWeight: 600,
        fontSize: 12,
      }}
    >
      {syncing ? 'Syncing…' : 'Sync to Google Calendar'}
    </button>
  );
}
