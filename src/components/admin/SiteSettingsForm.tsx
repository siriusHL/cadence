'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Initial {
  maintenance_mode: boolean;
  announcement: string | null;
  announcement_active: boolean;
}

export function SiteSettingsForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [maintenance, setMaintenance] = useState(initial.maintenance_mode);
  const [announcement, setAnnouncement] = useState(initial.announcement ?? '');
  const [active, setActive] = useState(initial.announcement_active);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          maintenance_mode: maintenance,
          announcement: announcement.trim() || null,
          announcement_active: active,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error ?? res.statusText);
        return;
      }
      setMsg('Saved.');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="adm-field check">
        <input type="checkbox" checked={maintenance} onChange={(e) => setMaintenance(e.target.checked)} disabled={busy} />
        <span>Maintenance mode — non-admins are redirected to /maintenance</span>
      </label>

      <label className="adm-field">
        <span>Announcement</span>
        <textarea
          value={announcement}
          maxLength={500}
          onChange={(e) => setAnnouncement(e.target.value)}
          disabled={busy}
          placeholder="Shown as a banner across the app when enabled."
        />
      </label>

      <label className="adm-field check">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} disabled={busy} />
        <span>Show announcement banner</span>
      </label>

      {err && <p style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 10 }}>{err}</p>}
      {msg && <p className="adm-muted" style={{ marginBottom: 10 }}>{msg}</p>}

      <button type="button" className="adm-btn" onClick={save} disabled={busy}>
        {busy ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}
