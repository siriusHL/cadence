'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from './DialogProvider';

interface Connection {
  email: string | null;
  calendar_id: string;
  connected_at: string;
  last_sync_at: string | null;
  last_sync_status: 'ok' | 'error' | null;
  last_sync_error: string | null;
  last_sync_count: number | null;
}

interface StatusResponse {
  connected: boolean;
  connection: Connection | null;
}

function fmtRelative(iso: string | null): string {
  if (!iso) return 'never';
  const then = new Date(iso).getTime();
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} h ago`;
  return new Date(iso).toLocaleDateString();
}

export function GoogleCalendarConnect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [pending, startTransition] = useTransition();
  const [syncing, setSyncing] = useState(false);

  // Surface success/error feedback from the OAuth round-trip.
  useEffect(() => {
    const gcal = searchParams.get('gcal');
    if (!gcal) return;
    if (gcal === 'connected') toast('Google Calendar connected.');
    else if (gcal === 'denied') toast('Connection cancelled.', 'error');
    else if (gcal === 'error') {
      const reason = searchParams.get('reason') ?? '';
      toast(`Could not connect Google Calendar${reason ? ` (${reason})` : ''}.`, 'error');
    }
    // Clear the query param so a reload doesn't re-fire the toast.
    const url = new URL(window.location.href);
    url.searchParams.delete('gcal');
    url.searchParams.delete('reason');
    router.replace(url.pathname + (url.search || ''));
  }, [searchParams, toast, router]);

  useEffect(() => {
    let alive = true;
    fetch('/api/calendar/google/status')
      .then((r) => r.json())
      .then((j: StatusResponse) => { if (alive) setStatus(j); })
      .catch(() => { if (alive) setStatus({ connected: false, connection: null }); });
    return () => { alive = false; };
  }, []);

  function connect() {
    window.location.href = '/api/calendar/google/connect';
  }

  function disconnect() {
    if (!confirm('Disconnect Google Calendar? Existing synced events will remain until you delete them.')) return;
    startTransition(async () => {
      const r = await fetch('/api/calendar/google/disconnect', { method: 'POST' });
      if (!r.ok) {
        toast('Could not disconnect.', 'error');
        return;
      }
      toast('Google Calendar disconnected.');
      setStatus({ connected: false, connection: null });
    });
  }

  async function sync() {
    setSyncing(true);
    try {
      const r = await fetch('/api/calendar/google/sync', { method: 'POST' });
      const j = await r.json() as { ok?: boolean; synced?: number; pruned?: number; errors?: string[]; error?: string };
      if (!r.ok || !j.ok) {
        toast(j.error ?? `Sync had issues (${j.errors?.length ?? 0}).`, 'error');
      } else {
        const parts: string[] = [`Synced ${j.synced ?? 0}`];
        if (j.pruned) parts.push(`pruned ${j.pruned}`);
        toast(parts.join(', ') + '.');
      }
      // Refresh status so "last sync" reflects this run.
      const sres = await fetch('/api/calendar/google/status');
      setStatus(await sres.json());
    } catch {
      toast('Sync failed.', 'error');
    } finally {
      setSyncing(false);
    }
  }

  const connected = status?.connected ?? false;
  const conn = status?.connection ?? null;

  return (
    <div className="pcard">
      <div className="pcard-h">
        <div className="t">Google Calendar</div>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
          Push upcoming dividends (next 180 days) to your Google Calendar. Re-syncing is safe —
          events dedupe on ex-date.
        </div>

        {status === null ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading…</div>
        ) : !connected ? (
          <button
            type="button"
            onClick={connect}
            style={{
              padding: '10px 14px',
              background: 'var(--text)',
              color: 'var(--surface)',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Connect Google Calendar
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 13 }}>
              Connected as <strong>{conn?.email ?? 'your Google account'}</strong>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Last sync: {fmtRelative(conn?.last_sync_at ?? null)}
              {conn?.last_sync_status === 'ok' && conn.last_sync_count != null
                ? ` · ${conn.last_sync_count} event${conn.last_sync_count === 1 ? '' : 's'}`
                : ''}
              {conn?.last_sync_status === 'error' && conn.last_sync_error
                ? ` · error: ${conn.last_sync_error.slice(0, 80)}`
                : ''}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={sync}
                disabled={syncing}
                style={{
                  padding: '8px 12px',
                  background: 'var(--text)',
                  color: 'var(--surface)',
                  border: 'none',
                  borderRadius: 8,
                  cursor: syncing ? 'wait' : 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                {syncing ? 'Syncing…' : 'Sync now'}
              </button>
              <button
                type="button"
                onClick={disconnect}
                disabled={pending}
                style={{
                  padding: '8px 12px',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 8,
                  cursor: pending ? 'wait' : 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
