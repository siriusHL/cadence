'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { type Tier } from '@/lib/tiers';

interface Props {
  userId: string;
  baseTier: Tier;
  override: Tier | null;
}

export function TierOverrideForm({ userId, baseTier, override }: Props) {
  const router = useRouter();
  const [value, setValue] = useState<string>(override ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const dirty = value !== (override ?? '');

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/tier`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ override: value || null }),
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

  return (
    <div>
      <label className="adm-field">
        <span>Tier override</span>
        <select value={value} onChange={(e) => setValue(e.target.value)} disabled={busy}>
          <option value="">No override — use Stripe tier</option>
          <option value="free">free</option>
          <option value="premium">premium</option>
          <option value="elite">elite</option>
        </select>
      </label>
      <p className="adm-muted" style={{ marginTop: -6, marginBottom: 12 }}>
        Stripe tier: <strong>{baseTier}</strong>. An override takes effect immediately and is
        independent of billing.
      </p>
      {err && <p style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 10 }}>{err}</p>}
      <button type="button" className="adm-btn" onClick={save} disabled={busy || !dirty}>
        {busy ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}
